# Contrats d’interface HTTP

API et pages du site d’hébergement privé. Détail machine-lisible : [openapi.yaml](./openapi.yaml).

**Origine unique** : le navigateur n’appelle que le Worker (pas d’URL R2). Cookie `session` envoyé automatiquement.

## Pages HTML (UI)

Toutes les pages sauf `/entree` exigent une session. Textes en français. `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`.

| Méthode | Chemin | Auth | Comportement |
| --- | --- | --- | --- |
| GET | `/entree` | Non | Formulaire identifiant + mot de passe. Si déjà connecté → redirection `/galerie`. |
| POST | `/entree` | Non | Vérifie les deux champs. Succès → cookie + `/galerie`. Échec → même page, **un** message générique, nouvel essai immédiat. Champs vides → demander de remplir les deux. |
| POST | `/sortie` | Oui | Vide le cookie, redirection `/entree`. |
| GET | `/galerie` | Oui | Grille dense des photos `active`, plus récentes d’abord. État vide si aucune. Actions : ajouter, ouvrir, aller à la corbeille, se déconnecter. |
| GET | `/photos/{id}` | Oui | Vue agrandie d’une photo **active** : image nette, nom, date d’ajout, date de prise de vue ou « inconnue », dimensions, poids, télécharger, mettre à la corbeille (confirmation). Inconnue / corbeille → pas de fuite ; retour galerie. |
| GET | `/corbeille` | Oui | Miniatures des photos `corbeille`. Restaurer une photo. Vider (confirmation). **Pas** de téléchargement. État vide explicite. |
| GET | `/` | — | Connecté → `/galerie`. Sinon → `/entree`. |
| GET | `/robots.txt` | Non | `User-agent: *` / `Disallow: /` |

Personne non connectée sur une page protégée → **302 `/entree`**, aucun corps photo.

## API JSON / binaire

Voir [openapi.yaml](./openapi.yaml). Synthèse :

| Méthode | Chemin | Auth | Rôle |
| --- | --- | --- | --- |
| POST | `/api/photos` | Oui | Ajout multipart (un ou plusieurs fichiers). |
| GET | `/api/photos` | Oui | Liste **actives** (métadonnées + URLs same-origin). |
| GET | `/api/photos/{id}` | Oui | Métadonnées d’une photo (active ou corbeille). |
| GET | `/api/photos/{id}/miniature` | Oui | Bytes miniature. |
| GET | `/api/photos/{id}/affichage` | Oui | Bytes vue agrandie. |
| GET | `/api/photos/{id}/fichier` | Oui | Original, `Content-Disposition: attachment`. **401/404** si corbeille (pas de téléchargement). |
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
