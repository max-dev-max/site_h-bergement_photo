---

description: "Liste de tâches d'implémentation — hébergement privé de photos"
---

# Tâches : Hébergement privé de photos

**Entrée** : documents de conception dans `/specs/001-hebergement-photos/`

**Prérequis** : [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests automatisés** : le plan et la recherche prévoient Vitest (Workers) et Playwright. Ils sont regroupés en phase finale (pas de TDD imposé par la spec). Chaque user story reste testable manuellement via son critère d’indépendance.

**Organisation** : les tâches sont groupées par user story pour permettre une implémentation et une validation indépendantes.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : peut tourner en parallèle (fichiers différents, pas de dépendance sur une tâche inachevée)
- **[Story]** : user story concernée (`US1` … `US7`)
- Chaque description inclut un chemin de fichier exact

## Conventions de chemins

Projet Workers unique (pas de split `frontend/` / `backend/`) : `src/`, `public/`, `migrations/`, `tests/` à la racine.

```text
src/index.ts  auth/  photos/  vues/  middleware/  lib/
public/  migrations/  tests/  wrangler.toml
```

---

## Phase 1 : Setup (infrastructure partagée)

**Objectif** : initialiser le projet Cloudflare Workers / TypeScript pour qu’on puisse développer et lancer `wrangler dev`.

- [X] T001 Créer l’arborescence `src/auth/`, `src/photos/`, `src/vues/`, `src/middleware/`, `src/lib/`, `public/`, `migrations/`, `tests/contract/`, `tests/integration/`, `tests/unit/` selon [plan.md](./plan.md)
- [X] T002 Initialiser `package.json` avec TypeScript 5.x, Hono, Wrangler, `@cloudflare/workers-types`, Vitest et `@cloudflare/vitest-pool-workers`
- [X] T003 [P] Ajouter `tsconfig.json` (strict, JSX Hono, types Workers)
- [X] T004 [P] Ajouter `wrangler.toml` : `main = src/index.ts`, `compatibility_date` ≥ 2026-08-27, binding D1 `foyer-photos`, binding R2 privé, pas de domaine public R2
- [X] T005 [P] Ajouter `.gitignore` (`.dev.vars`, `.wrangler/`, `node_modules/`, secrets) pour que les identifiants ne soient jamais commités
- [X] T006 [P] Ajouter `.dev.vars.example` documentant `FOYER_IDENTIFIANT`, `FOYER_MOT_DE_PASSE_HASH`, `SESSION_SECRET` (valeurs fictives uniquement)

**Point de contrôle** : `npm install` réussit ; Wrangler reconnaît le Worker.

---

## Phase 2 : Fondations (prérequis bloquants)

**Objectif** : socle commun (schéma, session, middleware, pages squelette) **avant** toute user story.

**⚠️ CRITIQUE** : aucune user story ne commence tant que cette phase n’est pas terminée.

- [X] T007 Créer le schéma D1 (tables `photo` et `quota`, index galerie/corbeille, ligne quota `id=1`, plafond `9663676416`) dans `migrations/0001_init.sql`
- [X] T008 [P] Définir les types `Photo`, `EtatPhoto`, `Espace` dans `src/photos/types.ts` d’après [data-model.md](./data-model.md)
- [X] T009 [P] Centraliser les constantes 50 Mo et 9 Go dans `src/lib/quota.ts`
- [X] T010 [P] Implémenter la liste des types MIME acceptés (JPEG, PNG, WebP, GIF, HEIC/HEIF, AVIF) dans `src/lib/mime.ts`
- [X] T011 [P] Implémenter les clés et helpers R2 (`originaux/{id}`, `affichage/{id}`, `miniatures/{id}`) dans `src/lib/r2.ts`
- [X] T012 Implémenter PBKDF2-SHA-256 (Web Crypto, sel + itérations élevées) dans `src/auth/hachage.ts` — jamais de mot de passe en clair ni dans les journaux
- [X] T013 Implémenter le cookie `session` HMAC (HttpOnly, Secure, SameSite=Strict, Path=/, fenêtre glissante 30 min) dans `src/auth/session.ts`
- [X] T014 Implémenter le middleware d’authentification (HTML → 302 `/entree`, API → 401 identique que la ressource existe ou non) dans `src/middleware/auth.ts`
- [X] T015 [P] Implémenter `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` sur toutes les réponses dans `src/middleware/noindex.ts`
- [X] T016 [P] Implémenter les erreurs génériques et journaux techniques (jamais le mot de passe, jamais le corps des photos) dans `src/middleware/erreurs.ts`
- [X] T017 Créer le layout HTML commun (langue FR, lien sortie, pas de stats) dans `src/vues/layout.tsx` et les libellés dans `src/vues/textes.ts`
- [X] T018 [P] Ajouter la feuille de styles de base (galerie dense prévue) dans `public/styles.css`
- [X] T019 Brancher l’application Hono dans `src/index.ts` : middlewares, `GET /` (connecté → `/galerie`, sinon → `/entree`), `GET /robots.txt` (`Disallow: /`), assets `public/`
- [X] T020 Documenter et appliquer la migration locale (`npx wrangler d1 migrations apply foyer-photos --local`) dans `specs/001-hebergement-photos/quickstart.md` si les commandes divergent

**Point de contrôle** : `npx wrangler dev` démarre ; une requête anonyme vers une page protégée n’expose aucune photo ; `robots.txt` refuse l’indexation.

---

## Phase 3 : User Story 1 — Entrer sur le site (Priorité : P1) 🎯 Premier incrément

**Objectif** : une personne qui connaît l’identifiant et le mot de passe du foyer entre ; sinon elle reste dehors et ne voit aucune photo.

**Test indépendant** : ouvrir le site sans être connecté (refus, aucune photo). Se connecter avec de bons identifiants (accès). De mauvais identifiants (refus, message générique). Se déconnecter. Inactivité 30 minutes → reconnexion exigée.

### Implémentation US1

- [X] T021 [P] [US1] Créer le formulaire d’entrée (identifiant + mot de passe, textes FR) dans `src/vues/entree.tsx`
- [X] T022 [US1] Implémenter `GET /entree` (déjà connecté → redirection `/galerie`) dans `src/index.ts`
- [X] T023 [US1] Implémenter `POST /entree` (champs vides → 400 « remplir les deux » ; comparaison temps constant ; cookie session ; redirection `/galerie`) dans `src/auth/entree.ts`
- [X] T024 [US1] Afficher un **seul** message générique en cas d’identifiants incorrects, sans blocage ni temporisation, dans `src/vues/entree.tsx`
- [X] T025 [US1] Implémenter `POST /sortie` (cookie vidé, redirection `/entree`) dans `src/auth/entree.ts` et le bouton de déconnexion dans `src/vues/layout.tsx`
- [X] T026 [US1] Protéger toutes les pages sauf `/entree`, `/robots.txt` et les assets sans photo : anonyme → 302 `/entree`, aucun miniature / nom / info, dans `src/middleware/auth.ts`
- [X] T027 [US1] Renouveler `exp = maintenant + 30 min` à chaque requête authentifiée réussie et refuser après 30 min d’inactivité dans `src/auth/session.ts`

**Point de contrôle** : US1 testable seule (entrée, refus, sortie, expiration). Pas encore d’ajout ni de grille.

---

## Phase 4 : User Story 2 — Ajouter des photos (Priorité : P1)

**Objectif** : une personne connectée envoie une ou plusieurs photos privées (formats acceptés, ≤ 50 Mo, quota 9 Go). Rien n’est conservé si l’ajout est refusé.

**Test indépendant** : se connecter, ajouter des photos, vérifier qu’elles sont enregistrées (API / amorce d’UI), et qu’une personne non connectée ne peut ni les voir ni les récupérer.

### Implémentation US2

- [X] T028 [P] [US2] Extraire uniquement la date de prise de vue EXIF (`DateTimeOriginal` ou équivalent), sinon `null`, dans `src/lib/exif.ts`
- [X] T029 [P] [US2] Produire miniature + variante d’affichage (binding Images privé, repli canvas documenté) dans `src/lib/images.ts` — aucune URL de delivery Images
- [X] T030 [US2] Lire / incrémenter `quota.octets_utilises` (galerie + corbeille) dans `src/photos/quota.ts`
- [X] T031 [US2] Implémenter l’ajout atomique (magic bytes + MIME, ≤ 50 Mo, quota, 3 objets R2 puis INSERT D1, nettoyage des orphelins, pas de fusion de doublons) dans `src/photos/ajout.ts`
- [X] T032 [US2] Implémenter `POST /api/photos` (multipart, 201 / 400 / 413 / 409 / 401) dans `src/index.ts` selon [contracts/openapi.yaml](./contracts/openapi.yaml)
- [X] T033 [US2] Implémenter `GET /api/espace` dans `src/photos/quota.ts` et `src/index.ts`
- [X] T034 [US2] Créer le formulaire d’ajout multi-fichiers (textes FR, messages 50 Mo / format / 9 Go) dans `src/vues/ajout.tsx`
- [X] T035 [US2] Ajouter le JS d’envoi (plusieurs fichiers, interruption → pas de photo partielle en galerie) dans `public/ajout.js`
- [X] T036 [US2] Refuser tout accès anonyme aux originaux / miniatures / infos d’une photo juste ajoutée (même UUID connu) dans `src/photos/fichiers.ts`

**Point de contrôle** : JPEG accepté apparaît en base ; PDF / > 50 Mo / quota refusé sans fichier conservé.

---

## Phase 5 : User Story 3 — Parcourir la galerie (Priorité : P1)

**Objectif** : grille dense de miniatures des photos **actives**, plus récentes d’abord ; état vide explicite ; premières miniatures utilisables en moins de 3 s jusqu’à 200 photos.

**Test indépendant** : ajouter plusieurs photos, ouvrir la galerie, vérifier chaque miniature, parcourir le tout ; non connecté → rien.

### Implémentation US3

- [X] T037 [US3] Lister les photos `etat=active` triées `COALESCE(date_prise_de_vue, date_ajout) DESC` dans `src/photos/liste.ts`
- [X] T038 [US3] Implémenter `GET /api/photos` (hors corbeille) dans `src/index.ts`
- [X] T039 [US3] Servir `GET /api/photos/{id}/miniature` depuis R2 après session, en-têtes `Cache-Control: private, no-store` et `X-Robots-Tag`, dans `src/photos/fichiers.ts`
- [X] T040 [US3] Créer la page grille dense (pas une liste de noms seuls) dans `src/vues/galerie.tsx`
- [X] T041 [US3] Afficher l’état vide (« aucune photo pour l’instant ») tout en gardant l’ajout, dans `src/vues/galerie.tsx`
- [X] T042 [US3] Permettre le défilement de toutes les miniatures du foyer dans `public/galerie.js` et `public/styles.css`
- [X] T043 [US3] Vérifier qu’une galerie ≤ 200 photos montre les premières miniatures et autorise le défilement en moins de 3 s (miniatures légères, pas d’originaux dans la grille) via `src/lib/images.ts` et `src/vues/galerie.tsx`

**Point de contrôle** : galerie visuelle des actives uniquement ; anonyme → aucune miniature.

---

## Phase 6 : User Story 4 — Voir une photo en grand (Priorité : P1)

**Objectif** : un appui sur une miniature ouvre la photo nette en grand avec nom, date d’ajout, date de prise de vue (ou « inconnue »), dimensions, poids. Retour à la galerie à l’endroit précédent.

**Test indépendant** : ouvrir une miniature ; grande image = photo choisie ; infos cohérentes ; retour galerie.

### Implémentation US4

- [X] T044 [P] [US4] Implémenter `GET /api/photos/{id}` (métadonnées active ou corbeille, session obligatoire) dans `src/index.ts`
- [X] T045 [US4] Servir `GET /api/photos/{id}/affichage` (JPEG/WebP, image entière lisible, `private, no-store`) dans `src/photos/fichiers.ts`
- [X] T046 [US4] Créer la vue agrandie d’une photo **active** dans `src/vues/photo.tsx` (lien depuis `src/vues/galerie.tsx`)
- [X] T047 [US4] Afficher nom, date d’ajout, date de prise de vue ou « Date de prise de vue inconnue », largeur × hauteur, poids, dans `src/vues/photo.tsx`
- [X] T048 [US4] Montrer l’image entière sans recadrage trompeur dans `public/styles.css` et `src/vues/photo.tsx`
- [X] T049 [US4] Restaurer la position de défilement au retour galerie dans `public/galerie.js`
- [X] T050 [US4] Refuser un lien profond `/photos/{id}` sans session (302 `/entree`, aucune info) dans `src/middleware/auth.ts` et `src/index.ts`

**Point de contrôle** : clic miniature → grand format + infos ; anonyme → rien.

---

## Phase 7 : User Story 5 — Télécharger une photo (Priorité : P1)

**Objectif** : depuis la vue agrandie d’une photo **active**, télécharger l’original. Interdit depuis la corbeille (restaurer d’abord). Interdit sans session.

**Test indépendant** : télécharger depuis la vue agrandie = fichier affiché. Sans connexion : refus.

### Implémentation US5

- [X] T051 [US5] Servir `GET /api/photos/{id}/fichier` (original R2, `Content-Disposition: attachment` avec nom lisible) uniquement si `etat=active`, dans `src/photos/fichiers.ts`
- [X] T052 [US5] Renvoyer 409 `{ "erreur": "Restaurez la photo avant de la télécharger." }` si `etat=corbeille`, dans `src/photos/fichiers.ts`
- [X] T053 [US5] N’exposer `url_fichier` que pour `etat=active` (sinon `null`) dans `src/photos/types.ts` et `src/photos/liste.ts`
- [X] T054 [US5] Ajouter le geste « Télécharger » sur la vue agrandie (pas sur la corbeille) dans `src/vues/photo.tsx`
- [X] T055 [US5] Refuser un lien direct de téléchargement sans cookie (401, zéro octet image) dans `src/middleware/auth.ts` et `src/photos/fichiers.ts`

**Point de contrôle** : original récupéré pour une active ; corbeille / anonyme = pas de fichier.

---

## Phase 8 : User Story 6 — Mettre une photo à la corbeille (Priorité : P2)

**Objectif** : après confirmation, la photo quitte la galerie et rejoint la corbeille. Quota inchangé. Annulation = aucun changement.

**Test indépendant** : confirmer → plus en galerie, présente en corbeille. Annuler → reste en galerie.

### Implémentation US6

- [X] T056 [US6] Implémenter la transition `active → corbeille` (`etat`, `date_corbeille`, quota inchangé, plus téléchargeable) dans `src/photos/etats.ts`
- [X] T057 [US6] Implémenter `POST /api/photos/{id}/corbeille` (200 / 401 / 404 / 409 déjà corbeille) dans `src/index.ts`
- [X] T058 [US6] Ajouter le dialogue de confirmation avant l’appel (jamais de POST silencieux depuis l’UI) dans `src/vues/photo.tsx` et `public/photo.js`
- [X] T059 [US6] Annuler la confirmation : aucune transition, photo inchangée, dans `public/photo.js`
- [X] T060 [US6] Après confirmation, rediriger vers la galerie ; si plus aucune active, afficher l’état vide, dans `src/vues/photo.tsx` et `src/vues/galerie.tsx`

**Point de contrôle** : suppression confirmée seulement ; galerie sans cette photo ; quota identique.

---

## Phase 9 : User Story 7 — Restaurer ou vider la corbeille (Priorité : P2)

**Objectif** : page corbeille distincte (miniatures, pas de téléchargement). Restaurer → galerie et téléchargeable. Vider après confirmation → destruction D1 + 3 objets R2, place libérée. Corbeille déjà vide → message explicite.

**Test indépendant** : restaurer une photo. Vider après confirmation. Annuler le vidage. Anonyme refusé.

### Implémentation US7

- [X] T061 [US7] Lister les photos `etat=corbeille` dans `src/photos/liste.ts` et `GET /api/corbeille` dans `src/index.ts`
- [X] T062 [US7] Créer la page corbeille (miniatures + infos, **sans** téléchargement, lien depuis la galerie) dans `src/vues/corbeille.tsx`
- [X] T063 [US7] Implémenter `POST /api/photos/{id}/restauration` (`corbeille → active`, `date_corbeille=null`, tri habituel) dans `src/photos/etats.ts` et `src/index.ts`
- [X] T064 [US7] Implémenter `POST /api/corbeille/vidage` (DELETE D1 + R2 de toutes les `corbeille`, quota décrémenté ; déjà vide → `detruites: 0` + message) dans `src/photos/corbeille.ts`
- [X] T065 [US7] Ajouter la confirmation de vidage (annuler = inchangé) dans `src/vues/corbeille.tsx` et `public/corbeille.js`
- [X] T066 [US7] Afficher l’état vide explicite de la corbeille dans `src/vues/corbeille.tsx`
- [X] T067 [US7] Refuser galerie/corbeille/restauration/vidage sans session (302 ou 401, aucune photo) dans `src/middleware/auth.ts`

**Point de contrôle** : restaurer et vider fonctionnent ; pas de téléchargement depuis la corbeille ; anonyme aveugle.

---

## Phase 10 : Finition et transversal

**Objectif** : tests automatisés, durcissement vie privée, validation [quickstart.md](./quickstart.md).

- [X] T068 [P] Tests unitaires du hachage (pas de clair, comparaison temps constant) dans `tests/unit/hachage.test.ts`
- [X] T069 [P] Tests unitaires quota (50 Mo, 9 Go, corbeille ne libère pas, vidage libère) dans `tests/unit/quota.test.ts`
- [X] T070 [P] Tests unitaires MIME / magic bytes (acceptés vs PDF) dans `tests/unit/mime.test.ts`
- [X] T071 [P] Tests de contrat session (`POST /entree`, `/sortie`, 401 anonyme identique) dans `tests/contract/session.test.ts`
- [X] T072 [P] Tests de contrat photos / médias / quota / corbeille d’après [contracts/openapi.yaml](./contracts/openapi.yaml) dans `tests/contract/photos.test.ts`
- [X] T073 Tests d’intégration parcours foyer (entrée → ajout → galerie → agrandi → téléchargement → corbeille) dans `tests/integration/parcours-foyer.test.ts`
- [X] T074 [P] Parcours Playwright SC-001 à SC-006 et refus d’un lien média en navigation privée dans `tests/e2e/foyer.spec.ts` et `playwright.config.ts`
- [X] T075 Auditer `Cache-Control: private, no-store` et l’absence de cache CDN anonyme sur `/miniature`, `/affichage`, `/fichier` dans `src/photos/fichiers.ts`
- [X] T076 Vérifier l’absence de statistiques / historique de connexion dans l’UI (`src/vues/`) et l’absence de secrets dans le dépôt
- [X] T077 Relire tous les textes visibles (français, erreurs non révélatrices) dans `src/vues/textes.ts`
- [X] T078 Exécuter les scénarios 1 à 8 de [quickstart.md](./quickstart.md) (`npm test`, `npx playwright test`, seau R2 non public)

**Point de contrôle** : fonctionnalité validée seulement si aucune photo n’est servie sans authentification et si le téléchargement depuis la corbeille est impossible.

---

## Dépendances et ordre d’exécution

### Dépendances entre phases

- **Setup (phase 1)** : aucune — on peut commencer tout de suite
- **Fondations (phase 2)** : dépend du setup — **bloque toutes les user stories**
- **User stories (phases 3–9)** : toutes dépendent des fondations
  - En séquentiel : P1 (US1 → US5) puis P2 (US6 → US7)
  - En parallèle : possible après la phase 2 si l’équipe se répartit les fichiers
- **Finition (phase 10)** : après les stories que l’on veut livrer

### Dépendances entre user stories

- **US1 (P1)** : après phase 2 — aucune autre story
- **US2 (P1)** : après phase 2 — le test manuel « se connecter » s’appuie sur US1 ; l’API peut utiliser le cookie de `src/auth/session.ts`
- **US3 (P1)** : après US2 pour une grille non vide ; l’état vide est testable dès US1
- **US4 (P1)** : s’intègre à la grille US3 ; `GET /photos/{id}` reste testable avec des photos US2
- **US5 (P1)** : bouton sur la vue US4 ; l’API `/fichier` est testable seule (active vs corbeille)
- **US6 (P2)** : après au moins une photo (US2) et un écran pour confirmer (US4 recommandé)
- **US7 (P2)** : après US6 (il faut des photos à la corbeille)

### Dans chaque user story

- Types / helpers avant services
- Services avant routes HTTP
- Routes avant pages HTML
- Story complète avant de passer à la priorité suivante (sauf travail parallèle sur fichiers distincts)

### Opportunités de parallèle

- T003, T004, T005, T006 (setup)
- T008, T009, T010, T011 puis T015, T016, T018 (fondations, fichiers distincts)
- T028 et T029 (US2)
- T044 (US4 métadonnées) en parallèle de T045 si T036 existe
- T068–T072 et T074 (tests, fichiers distincts) en phase 10

---

## Exemple parallèle : User Story 1

```bash
# Fichiers distincts, après T013–T014 (session + middleware) :
Tâche : "Formulaire d'entrée dans src/vues/entree.tsx"
Tâche : "POST /sortie et bouton dans src/vues/layout.tsx"
```

## Exemple parallèle : User Story 2

```bash
Tâche : "Extraction EXIF dans src/lib/exif.ts"
Tâche : "Dérivés Images dans src/lib/images.ts"
```

## Exemple parallèle : finition

```bash
Tâche : "tests/unit/hachage.test.ts"
Tâche : "tests/unit/quota.test.ts"
Tâche : "tests/unit/mime.test.ts"
Tâche : "tests/contract/session.test.ts"
Tâche : "tests/contract/photos.test.ts"
```

---

## Stratégie d’implémentation

### Premier incrément (US1 seule)

1. Phase 1 : Setup
2. Phase 2 : Fondations (bloque tout)
3. Phase 3 : US1 Entrer
4. **STOP** : valider refus anonyme, bons/mauvais identifiants, sortie, 30 min
5. Démo possible de l’entrée foyer

### MVP foyer utilisable (recommandé)

US1 + US2 + US3 : entrer, ajouter, parcourir la grille. Suffit pour déposer et reconnaître les photos.

### P1 complet

Ajouter US4 + US5 : vue agrandie + téléchargement de l’original.

### Version spec complète

Ajouter US6 + US7 (P2) puis phase 10 (tests + quickstart).

### Livraison incrémentale

1. Setup + fondations → socle prêt
2. US1 → tester → démo entrée
3. US2 → tester → démo ajout privé
4. US3 → tester → démo galerie (MVP)
5. US4 → tester → démo infos
6. US5 → tester → démo téléchargement
7. US6 + US7 → tester → démo corbeille
8. Chaque story ajoute de la valeur sans casser les précédentes

### Équipe parallèle

1. Setup + fondations ensemble
2. Ensuite, si capacité :
   - A : US1 puis US4 / US5
   - B : US2 puis US3
   - C : US6 puis US7 (après qu’il existe des photos)
3. Intégration via les routes de [contracts/openapi.yaml](./contracts/openapi.yaml)

---

## Notes

- **[P]** = fichiers différents, pas de dépendance sur une tâche inachevée
- **[USn]** = traçabilité vers la user story de [spec.md](./spec.md)
- Constitution : photos privées, auth à chaque octet, pas de galerie universelle, secrets hors git, documents et UI en français
- R2 **jamais** public ; pas d’URL pré-signée ; pas de Cloudflare Images delivery
- Commit après chaque tâche ou groupe logique
- S’arrêter à chaque point de contrôle pour valider la story seule
- À éviter : tâches vagues, deux personnes sur le même fichier, dépendances croisées qui cassent l’indépendance
