# Photos du foyer

Site privé pour déposer, parcourir, télécharger et mettre à la corbeille les photos d’un foyer.

Un seul identifiant et un seul mot de passe ouvrent tout le site. **Aucune photo, miniature ni information n’est servie sans connexion.** Il n’y a pas de galerie publique, pas de lien de partage, pas de comptes séparés.

Ce n’est **pas** un site statique. En ligne comme en local, tu héberges **trois choses** :

| Ce que tu héberges | Chez Cloudflare | Rôle |
| --- | --- | --- |
| Frontend | Worker (pages HTML, CSS, JS) | Ce que le foyer voit |
| Backend | Le **même** Worker (API, session, droits) | Connexion, ajout, corbeille |
| Base + fichiers | **D1** (infos) et **R2 privé** (photos) | Stockage |

Un Worker unique, volontairement : chaque octet photo passe par le backend authentifié. **N’utilise pas Cloudflare Pages** (écran « commande de construction / répertoire de sortie ») : ça ne déploie que du statique.

## Fonctions

- Entrée par identifiant **et** mot de passe, session de 30 minutes d’inactivité
- Ajout de photos (JPEG, PNG, WebP, GIF, HEIC, AVIF), 50 Mo max par fichier, 9 Go au total
- Galerie en grille, rangement par date, sélection multiple
- Vue agrandie, téléchargement de l’original, corbeille

## Prérequis

- [Node.js](https://nodejs.org/) 22 ou plus
- Un compte [Cloudflare](https://dash.cloudflare.com/) **seulement** pour mettre le site en ligne

## Lancer en local

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev
```

Ouvrir l’adresse indiquée par Wrangler, en général <http://127.0.0.1:8787>.

Identifiants :

- Fichier `.dev.vars.example` (à copier) : identifiant `foyer`, mot de passe `change-moi`.
- Tests automatiques (Vitest / Playwright) : identifiant `foyer`, mot de passe `mot-de-passe-test` — bindings de test, **pas** ton `.dev.vars`.
- Si un `.dev.vars` existe déjà, utilise **ceux-là**. Ne commite jamais `.dev.vars`.

## Héberger soi-même (frontend + backend + base)

Tu fais tout dans **ton** terminal, dans le dossier du projet. Ce n’est pas GitHub Pages ni Cloudflare Pages.

### 1. Se connecter à Cloudflare

```bash
npx wrangler login
```

Autorise Wrangler dans le navigateur, puis reviens au terminal.

### 2. Créer la base (D1) et le stockage des photos (R2)

```bash
npx wrangler d1 create foyer-photos
npx wrangler r2 bucket create foyer-photos
```

Copie le `database_id` affiché par la première commande dans `wrangler.toml`, à la place de `local-dev-foyer-photos`.

Le seau R2 doit rester **privé** (pas d’accès public, pas d’URL `*.r2.dev` ouverte).

### 3. Identifiant et mot de passe du foyer

Choisis l’identifiant et le mot de passe **réels** du foyer (pas `change-moi`).

```bash
npm run hacher -- "ton-mot-de-passe"
```

La commande affiche une ligne `pbkdf2-sha256$...`. Puis :

```bash
npx wrangler secret put FOYER_IDENTIFIANT
npx wrangler secret put FOYER_MOT_DE_PASSE_HASH
npx wrangler secret put SESSION_SECRET
```

- identifiant : ce que le foyer tapera pour entrer
- hash : la ligne `pbkdf2-sha256$...` **entière** (pas le mot de passe en clair)
- secret de session : une longue valeur aléatoire, par exemple `openssl rand -hex 32`

Ces trois valeurs restent chez Cloudflare, **pas** dans git.

### 4. Publier frontend, backend et base

```bash
npx wrangler d1 migrations apply foyer-photos --remote
npm run deploy
```

Wrangler affiche l’URL, du type `https://foyer-photos.<compte>.workers.dev`. C’est le site complet (pages + API + base).

## Tests

```bash
npm test
npx playwright install chromium
npm run test:e2e
```

## Organisation du code

| Rôle | Dossier |
| --- | --- |
| Frontend | `src/vues/`, `public/` |
| Backend | `src/index.ts`, `src/auth/`, `src/photos/`, `src/middleware/` |
| Schéma de la base | `migrations/` |

Principes : [`.specify/memory/constitution.md`](.specify/memory/constitution.md).  
Détail produit : [`specs/001-hebergement-photos/`](specs/001-hebergement-photos/).
