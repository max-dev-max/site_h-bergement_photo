# Plan d'implémentation : Hébergement privé de photos

**Branche** : `001-hebergement-photos` | **Date** : 2026-08-27 | **Spec** : [spec.md](./spec.md)

**Entrée** : spécification de fonctionnalité `/specs/001-hebergement-photos/spec.md`

**Note** : ce document est produit par `/speckit-plan`. Les tâches d’implémentation (`tasks.md`) seront générées ensuite par `/speckit-tasks`.

## Résumé

Site web privé, hébergé chez Cloudflare, pour qu’un foyer dépose, parcoure, télécharge et mette à la corbeille ses photos. L’entrée exige **identifiant et mot de passe**. Aucune photo, miniature ni métadonnée n’est servie sans session valide. Il n’y a pas de galerie publique, pas de comptes séparés, pas de lien de partage.

**Approche** : une application full-stack unique sur **Cloudflare Workers** (TypeScript + Hono). Les fichiers restent dans un seau **R2 privé** (jamais d’URL publique). Les métadonnées et le quota vivent dans **D1**. Chaque demande de page, d’API ou d’octet photo vérifie la session (cookie HttpOnly, expiration glissante 30 minutes). Les miniatures et une variante d’affichage sont produites à l’ajout, stockées dans R2, et servies uniquement par le Worker authentifié.

## Contexte technique

**Langage / version** : TypeScript 5.x, runtime Cloudflare Workers (`compatibility_date` ≥ 2026-08-27)

**Dépendances principales** : Hono (routes HTML + API), Wrangler (dev / deploy / secrets), `@cloudflare/workers-types`

**Stockage** : D1 (métadonnées photos, quota foyer, éventuellement journal d’activité de session) + R2 privé (original, variante d’affichage, miniature). Secrets Workers : identifiant foyer, hash du mot de passe, secret de session. Jamais dans le dépôt.

**Tests** : Vitest + `@cloudflare/vitest-pool-workers` (unité, contrat, intégration) ; Playwright (parcours foyer de bout en bout)

**Plateforme cible** : Cloudflare Workers (edge) ; navigateurs du foyer (ordinateur et téléphone)

**Type de projet** : application web full-stack (un Worker sert les pages et l’API)

**Objectifs de performance** : galerie ≤ 200 photos : premières miniatures visibles et défilement possible en moins de 3 s (connexion habituelle du foyer) ; entrée jusqu’à la galerie en moins d’une minute (SC-001)

**Contraintes** : 50 Mo max par photo ; 9 Go au total (galerie + corbeille, fichiers originaux) ; session 30 min d’inactivité ; formats JPEG, PNG, WebP, GIF, HEIC, AVIF ; pas d’indexation moteurs ; auth à chaque octet ; `Cache-Control: private, no-store` sur les photos ; pas de blocage après échecs d’entrée ; UI et documents en français

**Échelle / périmètre** : un foyer, un couple identifiant / mot de passe, quelques centaines de photos, cinq écrans (entrée, galerie, vue agrandie, corbeille, états vides / erreurs)

## Contrôle de conformité (constitution)

*PORTE : doit passer avant la recherche (phase 0). À revérifier après la conception (phase 1).*

| Principe | Statut | Comment le plan s’y conforme |
| --- | --- | --- |
| I. Photos privées par défaut | **OK** | R2 sans accès public. Aucune URL CDN Images. Pas d’album public. |
| II. Authentification obligatoire | **OK** | Seule `/entree` (et assets sans photo) est anonyme. Le reste exige identifiant **et** mot de passe, puis cookie de session. |
| III. Pas de galerie universelle | **OK** | Un seul périmètre : le foyer authentifié voit ses photos actives. Un visiteur non authentifié ne voit rien. Pas de vue « tout le site » pour un anonyme. |
| IV. Isolation des contenus | **OK** | UUID non séquentiels **et** contrôle de session à chaque GET fichier / miniature / infos. Un identifiant connu ne suffit pas. |
| V. Simplicité et nécessité | **OK** | Un Worker, D1, R2. Pas de réseau social, pas de comptes multiples, pas de partage public. |
| Accès et visibilité | **OK** | Miniatures, métadonnées, téléchargements : mêmes règles. `X-Robots-Tag` + `robots.txt`. Erreurs génériques. |
| Langue et secrets | **OK** | Documents et UI en français. Secrets via `wrangler secret`, pas dans git. |

**Porte initiale** : passée. Aucune violation à justifier.

**Porte post-conception** : passée (voir [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)). Les routes médias sont cookie-bound, jamais mises en cache CDN public, jamais exposées par R2 custom domain.

## Structure du projet

### Documentation (cette fonctionnalité)

```text
specs/001-hebergement-photos/
├── plan.md              # Ce fichier
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks — pas créé ici)
```

### Code source (racine du dépôt)

```text
src/
├── index.ts                 # Point d’entrée Worker, application Hono
├── auth/                    # Entrée, sortie, session, hachage
├── photos/                  # Ajout, liste, corbeille, quota, fichiers
├── vues/                    # Pages HTML (Hono JSX), textes FR
├── middleware/              # Auth, noindex, erreurs génériques
└── lib/                     # Types MIME, EXIF (date), quotas, R2

public/                      # CSS / JS d’interface (aucun fichier photo)
migrations/                  # Schéma D1
tests/
├── contract/                # Contrats OpenAPI (auth, médias, quota)
├── integration/             # Parcours foyer (entrée → galerie → corbeille)
└── unit/                    # Hachage, quota, états photo, MIME
wrangler.toml
```

**Décision de structure** : un seul projet Workers (pas de split `frontend/` + `backend/`). Hono sert à la fois les pages et l’API ; le navigateur n’appelle que l’origine du site (cookie SameSite). Cela limite la surface et respecte le principe V.

## Suivi de complexité

> À remplir **uniquement** si le contrôle de constitution a des violations à justifier.

Aucune violation. Tableau non applicable.
