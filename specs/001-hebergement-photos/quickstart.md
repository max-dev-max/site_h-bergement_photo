# Guide de validation rapide

**Fonctionnalité** : hébergement privé de photos  
**Plan** : [plan.md](./plan.md) · **Modèle** : [data-model.md](./data-model.md) · **Contrats** : [contracts/](./contracts/)

Ce fichier sert à **prouver** que la fonctionnalité marche de bout en bout. Il ne contient pas le code d’implémentation (cela irait dans `tasks.md`).

## Prérequis

- Compte Cloudflare et Wrangler (`npm i -g wrangler` ou via `npx`)
- Node.js 22+ recommandé
- Secrets **hors git** : identifiant foyer, hash du mot de passe, secret de session
- Seau R2 **privé** (pas de domaine public, pas d’accès anonyme)
- Base D1 avec les migrations du projet

## Mise en place locale

```bash
npm install
npx wrangler d1 migrations apply foyer-photos --local
# Renseigner .dev.vars (gitignoré) : FOYER_IDENTIFIANT, FOYER_MOT_DE_PASSE_HASH, SESSION_SECRET
npx wrangler dev
```

Ouvrir l’URL locale indiquée par Wrangler (souvent `http://127.0.0.1:8787`).

## Mise en place Cloudflare (quand on déploie)

```bash
npx wrangler d1 create foyer-photos
npx wrangler r2 bucket create foyer-photos
npx wrangler secret put FOYER_IDENTIFIANT
npx wrangler secret put FOYER_MOT_DE_PASSE_HASH
npx wrangler secret put SESSION_SECRET
npx wrangler d1 migrations apply foyer-photos --remote
npx wrangler deploy
```

Vérifier que le seau R2 n’a **pas** d’accès public.

## Scénarios de validation

Remplacer `BASE` par l’origine (local ou déployée). Les cookies de session doivent être conservés entre les appels authentifiés.

### 1. Refus anonyme (constitution I–II, SC-006)

- Ouvrir `BASE/galerie`, `BASE/corbeille`, `BASE/photos/{uuid}` sans cookie → page d’entrée, **aucune** miniature.
- `GET BASE/api/photos/{uuid}/fichier` et `/miniature` sans cookie → 401, corps sans image.
- `GET BASE/robots.txt` → `Disallow: /`.
- En-tête `X-Robots-Tag` présent sur une page et sur un média authentifié.

**Attendu** : zéro octet photo pour un visiteur non connecté, y compris avec un UUID réel.

### 2. Entrée foyer (US1, FR-002, FR-013)

- Champs vides → message pour remplir les deux.
- Mauvais identifiant ou mot de passe → message **générique**, nouvel essai immédiat (pas d’attente, pas de blocage).
- Bons identifiants → galerie (ou état vide) en moins d’une minute (SC-001).
- `/sortie` puis rechargement d’un lien galerie → à nouveau l’entrée.

### 3. Ajout (US2, FR-016, FR-022)

- Connecté : envoyer un JPEG < 50 Mo → apparaît dans la galerie.
- Envoyer un PDF / `.exe` → refus, message clair, rien en galerie.
- Envoyer > 50 Mo → refus 50 Mo, rien conservé.
- (Si on peut) quota plein → message 9 Go, photos déjà là intactes.

### 4. Galerie et vue agrandie (US3–US4, SC-003, SC-009)

- Grille de miniatures reconnaissables, pas une liste de noms seuls.
- Photos corbeille **absentes** de la galerie.
- Appui sur une miniature → photo en grand + nom, dates, dimensions, poids.
- Sans date EXIF → « Date de prise de vue inconnue ».
- Retour arrière → galerie au même endroit.
- Jusqu’à 200 photos : premières miniatures et défilement < 3 s (connexion foyer).

### 5. Téléchargement (US5, FR-009)

- Depuis la vue agrandie d’une photo **active** : le fichier obtenu est l’original.
- Depuis la corbeille : téléchargement absent ou refusé (409) ; restaurer puis télécharger.

### 6. Corbeille (US6–US7, SC-005)

- Supprimer → dialogue de confirmation. Annuler → photo encore dans la galerie.
- Confirmer → disparaît de la galerie, visible à la corbeille. Quota **inchangé**.
- Restaurer → revient dans la galerie, téléchargeable.
- Vider → confirmation. Annuler → corbeille intacte. Confirmer → photos irrécupérables, place libérée.
- Corbeille déjà vide → message explicite.

### 7. Session 30 minutes (FR-021)

- Activité récente : on reste connecté.
- Après 30 min sans action (page HTML ou mutation ; pas le simple chargement d’une miniature) : médias et pages protégées refusés jusqu’à nouvelle entrée.

### 8. Isolation (FR-014, principe IV)

- Copier l’URL d’une miniature dans un navigateur **privé** sans se connecter → pas d’image.
- Le seau R2 n’est pas listable / téléchargeable depuis une URL `*.r2.dev` publique.

## Commandes de test (une fois le code en place)

```bash
npm test                 # Vitest (Workers)
npx playwright test      # Parcours foyer
```

Les tests d’intégration doivent coller aux chemins de [contracts/openapi.yaml](./contracts/openapi.yaml).

## Critère « ça marche »

On ne déclare la fonctionnalité validée que si les scénarios 1 à 8 passent, en particulier **aucune photo sans authentification** et **pas de téléchargement depuis la corbeille**.
