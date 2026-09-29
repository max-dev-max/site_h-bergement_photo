# Contrats d’interface HTTP

API et pages du site d’hébergement privé. Détail machine-lisible : [openapi.yaml](./openapi.yaml).

**Origine unique** : le navigateur n’appelle que le Worker (pas d’URL R2). Cookie `session` envoyé automatiquement.

## Pages HTML (UI)

Les pages de contenu (galerie, photo, corbeille) exigent une session. `/entree`, `robots.txt`, `styles.css` et `favicon.ico` sont publics. Textes en français. `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`.

| Méthode | Chemin | Auth | Comportement |
| --- | --- | --- | --- |
| GET | `/entree` | Non | Formulaire identifiant + mot de passe. Si déjà connecté → redirection `/galerie`. |
| POST | `/entree` | Non | Vérifie les deux champs. Succès → cookie + `/galerie`. Échec → même page, **un** message générique, nouvel essai immédiat. Champs vides → demander de remplir les deux. |
| POST | `/sortie` | Non | Vide le cookie même sans session, redirection `/entree`. |
| GET | `/galerie` | Oui | Grille dense des photos `active`, plus récentes d’abord. État vide si aucune. Actions : ajouter, ouvrir, aller à la corbeille, se déconnecter. |
| GET | `/photos/{id}` | Oui | Vue agrandie. Photo **active** : image, infos, télécharger, corbeille. Photo **corbeille** : image, infos, restaurer, **pas** de téléchargement. Introuvable → page générique, retour galerie. |
| GET | `/corbeille` | Oui | Miniatures des photos `corbeille` (lien vers la vue agrandie). Restaurer. Vider (confirmation). **Pas** de téléchargement. État vide explicite. |
| GET | `/` | — | Connecté → `/galerie`. Sinon → `/entree`. |
| GET | `/robots.txt` | Non | `User-agent: *` / `Disallow: /` |
| GET | `/styles.css` | Non | Feuille de styles de la page d’entrée. |
| GET | `/favicon.ico` | Non | 204 (pas de redirection vers l’entrée). |
| GET | `/galerie.js`, `/ajout.js`, `/photo.js`, `/corbeille.js` | Oui | Scripts métier. Sans session → 302 `/entree`. |

Personne non connectée sur une page protégée → **302 `/entree`**, aucun corps photo.

## API JSON / binaire

Voir [openapi.yaml](./openapi.yaml). Synthèse :

| Méthode | Chemin | Auth | Rôle |
| --- | --- | --- | --- |
| POST | `/api/photos` | Oui | Ajout multipart (un ou plusieurs fichiers). |
| GET | `/api/photos` | Oui | Liste **actives** (`?tri=recent\|ancien`, même règle que la galerie). |
| GET | `/api/photos/{id}` | Oui | Métadonnées d’une photo (active ou corbeille). |
| GET | `/api/photos/{id}/miniature` | Oui | Bytes miniature. |
| GET | `/api/photos/{id}/affichage` | Oui | Bytes vue agrandie. |
| GET | `/api/photos/{id}/fichier` | Oui | Original, `Content-Disposition: attachment`. **409** si corbeille (pas de téléchargement). |
| POST | `/api/photos/{id}/corbeille` | Oui | Active → corbeille. |
| POST | `/api/photos/corbeille` | Oui | Plusieurs actives → corbeille (jusqu’à 400 id). |
| POST | `/api/photos/{id}/restauration` | Oui | Corbeille → galerie. |
| POST | `/api/photos/restauration` | Oui | Plusieurs corbeille → galerie (jusqu’à 400 id). |
| GET | `/api/corbeille` | Oui | Liste corbeille. |
| POST | `/api/corbeille/vidage` | Oui | Destruction définitive. |
| GET | `/api/espace` | Oui | Octets utilisés / plafond (message d’ajout). |

### Erreurs (ne pas révéler l’existence)

| Situation | HTML | API |
| --- | --- | --- |
| Pas de session / expirée | 302 `/entree` | 401 `{ "erreur": "Authentification requise." }` |
| Identifiants incorrects | 200 `/entree` + message générique | 401 `{ "erreur": "Identifiant ou mot de passe incorrect." }` |
| Photo absente (session OK) | page d’erreur générique / galerie | 404 `{ "erreur": "Photo introuvable." }` |
| Téléchargement alors que corbeille | — | 409 `{ "erreur": "Restaurez la photo avant de la télécharger." }` |
| Format / taille / quota | — | 400 / 413 / 409 avec message clair, **sans** conserver le fichier |

Codes 401 anonymes **identiques** que l’`id` existe ou non.

## Confirmation destructive

Les POST corbeille et vidage sont l’acte serveur. La **confirmation** est exigée dans l’UI avant l’appel (FR-010, FR-019). Un POST sans passage UI reste autorisé techniquement pour un client authentifié du foyer (un seul périmètre) ; l’UI ne doit jamais les déclencher sans dialogue.

## Hors contrat v1

Comptes multiples, albums, lien public, stats de visite, WebDAV, API tierce.
