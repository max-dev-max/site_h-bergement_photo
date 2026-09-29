# Modèle de données : Hébergement privé de photos

**Date** : 2026-08-27  
**Sources** : [spec.md](./spec.md), [research.md](./research.md)

Le foyer n’a **pas** de table « utilisateurs multiples ». L’accès est un secret de déploiement. Les photos et le quota sont en D1 ; les octets sont en R2.

## Entités

### Accès foyer (secrets Workers, pas une table métier)

Couple unique identifiant + mot de passe pour tout le site.

| Champ | Stockage | Règles |
| --- | --- | --- |
| Identifiant | secret `FOYER_IDENTIFIANT` | Comparaison temps constant. Jamais dans git ni dans les journaux. |
| Mot de passe | secret `FOYER_MOT_DE_PASSE_HASH` (+ sel / paramètres PBKDF2) | Jamais en clair. Jamais loggé. |
| Secret de session | secret `SESSION_SECRET` | HMAC du cookie. Rotation = toutes les sessions invalidées. |

**Relations** : quiconque authentifié voit le **même** périmètre (toutes les photos actives du foyer).

### Session (cookie, pas de table obligatoire)

| Champ | Type | Règles |
| --- | --- | --- |
| `iat` | datetime | Émission |
| `exp` | datetime | `maintenant + 30 min` à chaque **action** (page HTML ou mutation). Pas renouvelé sur miniature / affichage / original / CSS / JS. |
| signature | HMAC | Cookie `session` : HttpOnly, Secure, SameSite=Strict, Path=/ |

**Transitions** : absente / invalide / expirée → refus, redirection `/entree` (HTML) ou 401 JSON. Déconnexion → cookie vidé. Inactivité < 30 min → session conservée.

### Photo

Image privée déposée après connexion.

| Champ | Type | Règles |
| --- | --- | --- |
| `id` | UUID v4 | Clé primaire. Non séquentiel. Un UUID connu **ne suffit pas** : la session reste obligatoire. |
| `nom_fichier` | texte | Nom d’origine, lisible (caractères spéciaux conservés). Longueur raisonnable (ex. 255). |
| `type_mime` | texte | Un de : `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `image/heif`, `image/avif`. |
| `octets` | entier | Taille de l’**original**. 1 … 50 × 1024². Compte dans le quota. |
| `largeur` | entier | Pixels, ≥ 1. |
| `hauteur` | entier | Pixels, ≥ 1. |
| `date_prise_de_vue` | datetime \| null | EXIF si présent. **Null** → UI « Date de prise de vue inconnue ». Jamais inventée. |
| `date_ajout` | datetime | Instant d’enregistrement réussi (UTC). |
| `date_rangement` | datetime | `COALESCE(date_prise_de_vue, date_ajout)`, maintenue à l’ajout pour l’index de tri. |
| `etat` | enum | `active` \| `corbeille`. |
| `date_corbeille` | datetime \| null | Rempli au passage en corbeille ; null si active. |
| `cle_original` | texte | Clé R2 `originaux/{id}` |
| `cle_affichage` | texte | Clé R2 `affichage/{id}` |
| `cle_miniature` | texte | Clé R2 `miniatures/{id}` |

**Validation à l’ajout** :

- Fichier réellement image (magic bytes), format de la liste, ≤ 50 Mo.
- `somme(octets des photos existantes) + octets < 9 Go` sinon refus, **aucun** fichier conservé.
- Réserver le quota **avant** d’écrire R2 ; écrire les trois objets R2 ; INSERT D1. Tout échec libère le quota et efface les objets R2 de cet id.
- Pas de fusion si le même fichier est renvoyé (nouvelle `id`).

**Tri galerie / restauration** : `date_rangement DESC` (équivalent `COALESCE(date_prise_de_vue, date_ajout)`), puis `date_ajout DESC`, puis `id`.

**Relations** : appartient au foyer unique. Pas d’album (hors périmètre).

### Quota foyer (une ligne)

| Champ | Type | Règles |
| --- | --- | --- |
| `id` | entier | Toujours `1`. |
| `octets_utilises` | entier | Somme des `photo.octets` (active **et** corbeille). |
| `octets_plafond` | entier | `9663676416` (9 × 1024³). |

Invariants : `0 ≤ octets_utilises ≤ octets_plafond` ; `octets_utilises = SUM(photo.octets)`.

## Objets R2 (pas des lignes SQL)

| Préfixe | Contenu | Qui peut le lire via le Worker |
| --- | --- | --- |
| `originaux/{id}` | Fichier d’origine | Session **et** photo `active` uniquement (téléchargement). Corbeille : **interdit**. |
| `affichage/{id}` | JPEG/WebP vue agrandie | Session + photo existante (`active` ou `corbeille`) |
| `miniatures/{id}` | JPEG/WebP grille | Session + photo existante (`active` ou `corbeille`) |

Seau **non public**. Pas de listing R2 exposé au client.

## Machine à états — Photo

```text
                    ajout réussi
                         │
                         ▼
                    ┌─────────┐
         restaurer  │ active  │  supprimer (après confirmation)
         ◄──────────┤         ├──────────►
                    └─────────┘           │
                         ▲                ▼
                         │          ┌───────────┐
                         └──────────┤ corbeille │
                                    └───────────┘
                                          │
                                          │ vider (après confirmation)
                                          ▼
                                      détruit
                         (lignes D1 + 3 objets R2 supprimés)
```

| Transition | Condition | Effets |
| --- | --- | --- |
| → active (ajout) | Session, fichier valide, quota OK | quota réservé, R2 écrit, INSERT |
| active → corbeille | Session, confirmation UI | `etat=corbeille`, `date_corbeille=now`. Quota **inchangé**. Plus dans la galerie. Plus téléchargeable. |
| corbeille → active | Session | `etat=active`, `date_corbeille=null`. Reprend le tri habituel. Téléchargement à nouveau possible. |
| corbeille → détruit | Session, confirmation vidage | Par lots : DELETE D1 des lignes encore `corbeille` (RETURNING) + quota -= octets réellement détruits, puis suppression R2. Si le Worker s’arrête, le prochain vidage reprend. Irrécupérable. |
| vidage corbeille vide | Session | Message explicite, aucune destruction. |

Annulation de confirmation : **aucune** transition.

## Règles d’accès (toutes entités)

| Acteur | Galerie (actives) | Corbeille | Original | Miniature / affichage / infos |
| --- | --- | --- | --- | --- |
| Non authentifié | Non | Non | Non | Non (même avec UUID / lien) |
| Session expirée | Non | Non | Non | Non |
| Session valide | Oui | Oui | Oui si `active` seulement | Oui si la photo existe (les deux états) |

Une demande anonyme vers un média ne doit **pas** révéler si l’`id` existe (redirection `/entree` ou 401 identique).

## Index D1 recommandés

- `photo(etat, date_rangement, date_ajout, id)` pour la galerie et la corbeille (même ordre que `ORDER BY`).
- `photo(id)` PK.

Pas de table de statistiques de visite.
