# Recherche : Hébergement privé de photos

**Date** : 2026-08-27  
**But** : lever les inconnues du contexte technique et figer les choix avant le modèle de données et les contrats.

## 1. Plateforme d’hébergement

**Décision** : Cloudflare Workers (TypeScript) + D1 + R2, déployé avec Wrangler. Pages/Functions n’est pas utilisé : un Worker unique suffit.

**Raison** : la spec impose Cloudflare (FR-025) tout en interdisant une galerie publique. Workers se place devant R2 et peut refuser chaque octet sans session. D1 (SQLite) convient à quelques centaines de photos. R2 n’a pas de frais de sortie, utile pour les téléchargements du foyer.

**Alternatives écartées** :

- **Cloudflare Pages seul** : pas de contrôle assez fin sur chaque GET fichier.
- **Seau R2 public + domaine custom** : n’importe qui avec l’URL télécharge la photo → viole I et IV.
- **Cloudflare Access (Zero Trust)** à la place de la page d’entrée : login Cloudflare, pas le couple identifiant + mot de passe du foyer (FR-002).
- **Cloudflare Images (livraison publique)** : URLs de delivery souvent partageables / CDN → risque de galerie de fait.

## 2. Accès aux fichiers (auth à chaque octet)

**Décision** : le seau R2 n’a **aucun** accès public. Le Worker lit R2 via le binding et renvoie le flux **seulement** après cookie de session valide. Les balises `<img>` pointent vers des chemins same-origin (`/api/photos/{id}/miniature`, `/affichage`) : le cookie part tout seul. Pas d’URL pré-signée en query string.

**Raison** : une URL signée fuit dans l’historique, les logs, le referer. Un cookie HttpOnly + SameSite=Strict ne peut pas être collé dans un autre navigateur aussi facilement. L’auth est vérifiée à chaque demande, conformément à FR-014 et au principe IV.

**En-têtes médias** : `Cache-Control: private, no-store` ; `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`. Pas de mise en cache CDN « anonyme » des photos (un cache d’edge sans contrôle de session servirait la photo au suivant).

**Alternatives écartées** :

- URL pré-signée courte pour `<img>` : pratique, mais partageable pendant la durée de vie.
- Token dans le query : même problème, et atterrit dans les logs.

## 3. Session (30 minutes d’inactivité)

**Décision** : cookie `session` signé HMAC (Web Crypto), HttpOnly, Secure, SameSite=Strict, Path=`/`. Charge utile minimale (`exp`, `iat`). À **chaque** requête authentifiée réussie, le Worker renouvelle `exp = maintenant + 30 min` (fenêtre glissante). Déconnexion = cookie vidé. Secret `SESSION_SECRET` via `wrangler secret`.

**Raison** : l’inactivité se mesure aux requêtes vers le site. Pas besoin de Durable Object. Un JWT à expiration fixe de 30 min couperait une personne qui consulte lentement la galerie.

**Alternatives écartées** :

- Session D1 à chaque hit : plus lourd, utile seulement si on doit révoquer un appareil (hors périmètre).
- localStorage / cookie JS : volable par XSS ; le mot de passe ne doit jamais y transiter après l’entrée.

**Entrée** : identifiant et mot de passe comparés en temps constant. Mot de passe stocké en **PBKDF2-SHA-256** (Web Crypto, sel + itérations élevées). Message d’échec unique. Pas de verrouillage (FR-013). Identifiant et hash **jamais** loggés.

## 4. Miniatures et affichage (HEIC / AVIF / GIF)

**Décision** : à l’ajout, le Worker stocke trois objets R2 :

| Clé | Rôle |
| --- | --- |
| `originaux/{id}` | Fichier tel quel (téléchargement galerie uniquement) |
| `affichage/{id}` | JPEG ou WebP affichable partout (vue agrandie, y compris depuis la corbeille) |
| `miniatures/{id}` | JPEG/WebP petit, grille dense |

Production des dérivés : **binding Cloudflare Images** (`env.IMAGES.input(stream).transform().output()`) — transformation **privée** dans le Worker, résultat écrit dans R2, **aucune** URL de delivery Images.

Si le compte n’a pas le binding Images : repli **côté navigateur** à l’envoi (canvas ; HEIC via décodeur WASM ou Safari). Le serveur refuse l’ajout si la miniature / l’affichage manque ou n’est pas une image acceptable. Le téléchargement reste l’original (FR-009).

**Raison** : Chrome n’affiche pas le HEIC. La spec exige une vue agrandie nette (US4) **et** le fichier original au téléchargement. Les miniatures légères rendent SC-009 (200 photos < 3 s) tenable. GIF : miniature = première image ; original animé conservé.

**Alternatives écartées** :

- Servir l’original HEIC dans `<img>` : casse la vue agrandie hors Safari.
- WASM Photon dans le Worker pour tout décoder : bundle lourd, HEIC mal couvert, CPU Workers limité.
- Pas de miniature : 200 originaux dans la grille ratent l’objectif 3 s.

## 5. Validation des fichiers et quota

**Décision** : contrôle **magic bytes** + type MIME déclaré, pas seulement l’extension. Types acceptés : JPEG, PNG, WebP, GIF, HEIC/HEIF, AVIF. Taille lue sur le flux : refus > 50 Mo, **aucun** objet R2 conservé. Quota foyer : somme des **originaux** galerie + corbeille ≤ 9 Go (`9 * 1024^3` octets). Mise à la corbeille : quota inchangé. Vidage : objets R2 supprimés, quota décrémenté.

Ajout interrompu : pas de ligne D1 tant que les trois objets R2 ne sont pas écrits ; en cas d’échec partiel, suppression des orphelins R2. Doublon de fichier : **nouvelle** photo (spec).

**Raison** : FR-016 et FR-022. Compter les originaux colle au langage « photos du foyer ». Les dérivés sont un surcoût d’implémentation, gardés petits.

**Limite Workers** : corps de requête jusqu’à 100 Mo (offres Free/Pro) → 50 Mo OK. Stream vers R2, ne pas tout bufferiser en mémoire.

**Alternatives écartées** : upload pré-signé direct navigateur → R2 (contourne le Worker, plus difficile de garantir quota + MIME avant écriture).

## 6. Métadonnées affichées

**Décision** : à l’ajout, extraire **uniquement** la date de prise de vue (EXIF `DateTimeOriginal` / équivalent). Pas de GPS, pas de modèle d’appareil dans l’UI (assumptions spec). Dimensions : après génération de la variante d’affichage (largeur × hauteur pixels). Poids : taille de l’original. Nom : nom de fichier original, conservé lisible (caractères spéciaux OK).

Date inconnue → afficher « Date de prise de vue inconnue » ; tri galerie : `date_prise_de_vue` si connue, sinon `date_ajout`, du plus récent au plus ancien.

## 7. Interface

**Décision** : pages HTML rendues par Hono (JSX) + CSS + JS léger (envoi multiple, confirmation corbeille/vidage, défilement). Pas de React/Vue. Textes UI en français. Accessibilité avancée hors périmètre (clarification).

Écrans : entrée ; galerie (grille dense) ; vue agrandie (infos + télécharger + corbeille) ; corbeille (restaurer, vider ; **pas** télécharger).

## 8. Anti-indexation et journaux

**Décision** : `GET /robots.txt` → `Disallow: /`. En-tête `X-Robots-Tag` sur **toutes** les réponses. Pas de sitemap. Journaux Workers : erreurs techniques uniquement, **jamais** le mot de passe, jamais le corps des photos. Pas de page stats (FR-023).

## 9. Tests

**Décision** : Vitest pool Workers pour auth, quota, états, contrats HTTP. Playwright pour SC-001 à SC-006 (entrée, ajout, grille, agrandi, téléchargement, corbeille, refus anonyme). Les tests anonymes collent un lien direct média et vérifient l’absence de bytes photo.

## Inconnues résolues

| Sujet | Résolution |
| --- | --- |
| Langage / runtime | TypeScript + Workers |
| Où vivent les fichiers | R2 privé, proxy Worker |
| Où vivent les fiches photo | D1 |
| Session 30 min | Cookie HMAC glissant |
| HEIC affichable | Variante JPEG/WebP dans R2 |
| 50 Mo / 9 Go | Contrôle Worker avant commit D1 |
| Cloudflare sans galerie publique | Pas de bucket public, pas d’Images delivery |

Aucun `NEEDS CLARIFICATION` restant dans le contexte technique.
