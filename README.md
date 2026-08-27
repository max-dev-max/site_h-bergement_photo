# Photos du foyer

Site privé pour déposer, parcourir, télécharger et mettre à la corbeille les photos d’un foyer.

Un seul identifiant et un seul mot de passe ouvrent tout le site. **Aucune photo, miniature ni information n’est servie sans connexion.** Il n’y a pas de galerie publique, pas de lien de partage, pas de comptes séparés.

## Fonctions

- Entrée par identifiant **et** mot de passe, session de 30 minutes d’inactivité
- Ajout de photos (JPEG, PNG, WebP, GIF, HEIC, AVIF), 50 Mo max par fichier, 9 Go au total
- Galerie en grille, rangement par date (plus récentes ou plus anciennes), groupes par jour
- Sélection de plusieurs photos : téléchargement ou mise à la corbeille
- Vue agrandie avec nom, dates, dimensions, poids
- Téléchargement de l’original (uniquement depuis la galerie, pas depuis la corbeille)
- Corbeille : restaurer une photo ou vider définitivement (après confirmation)

## Prérequis

- [Node.js](https://nodejs.org/) 22 ou plus
- Un compte [Cloudflare](https://dash.cloudflare.com/) pour le déploiement (pas obligatoire en local)

## Lancer en local

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev
```

Ouvrir l’adresse indiquée par Wrangler, en général <http://127.0.0.1:8787>.

Identifiants d’exemple (fichier `.dev.vars.example` uniquement, **pas** pour un vrai foyer) :

| Champ | Valeur |
| --- | --- |
| Identifiant | `foyer` |
| Mot de passe | `change-moi` |

Si un `.dev.vars` existe déjà chez vous, utilisez **ces** identifiants-là, pas forcément ceux du tableau. Ne commitez jamais `.dev.vars`. Changez `SESSION_SECRET` avant tout usage réel.

## Tests

```bash
npm test                 # Vitest (unité, contrat, intégration)
npx playwright install chromium   # une fois
npm run test:e2e         # parcours dans le navigateur
```

## Déployer sur Cloudflare

1. Créer la base D1 et le seau R2 (le seau doit rester **privé**, sans domaine public) :

   ```bash
   npx wrangler d1 create foyer-photos
   npx wrangler r2 bucket create foyer-photos
   ```

2. Copier l’`database_id` affiché dans `wrangler.toml` (à la place de `local-dev-foyer-photos`).

3. Enregistrer les secrets (jamais dans git) :

   ```bash
   npx wrangler secret put FOYER_IDENTIFIANT
   npx wrangler secret put FOYER_MOT_DE_PASSE_HASH
   npx wrangler secret put SESSION_SECRET
   ```

   Le mot de passe est stocké en **PBKDF2-SHA-256**, format
   `pbkdf2-sha256$itérations$selHex$hashHex`.

4. Appliquer les migrations puis publier :

   ```bash
   npx wrangler d1 migrations apply foyer-photos --remote
   npm run deploy
   ```

## Organisation du code

Ce n’est pas trois dépôts frontend / backend / base : **un Worker Cloudflare** sert les pages et l’API.

| Rôle | Emplacement |
| --- | --- |
| Pages et textes (français) | `src/vues/`, `public/` |
| Connexion, API, droits | `src/auth/`, `src/photos/`, `src/middleware/`, `src/index.ts` |
| Infos photos et quota | Cloudflare **D1** (`migrations/`) |
| Fichiers (original, affichage, miniature) | Cloudflare **R2** privé |

Les miniatures sont demandées au Worker (`/api/photos/…/miniature`), jamais via une URL R2 publique.

## Vie privée

- Cookie de session HttpOnly, SameSite=Strict
- Photos : `Cache-Control: private, no-store`
- `robots.txt` refuse l’indexation ; en-tête `X-Robots-Tag` sur les réponses
- Un identifiant (UUID) connu ne suffit pas : la session est vérifiée à chaque demande

Principes du projet : [`.specify/memory/constitution.md`](.specify/memory/constitution.md).  
Spécification et contrats : [`specs/001-hebergement-photos/`](specs/001-hebergement-photos/).
# site_h-bergement_photo
