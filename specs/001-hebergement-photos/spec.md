# Feature Specification: Hébergement privé de photos

**Feature Branch**: `001-hebergement-photos`

**Created**: 2026-08-27

**Status**: Draft

**Input**: User description: "Ajouter et/ou télécharger des photos. Voir la liste des photos et pouvoir choisir laquelle télécharger. Entrer sur le site par un identifiant et un mot de passe. Pour le reste des spécifications, poser des questions et faire des propositions."

**Décisions du porteur** (2026-08-27) :

- Q1 : un seul identifiant et un seul mot de passe pour tout le site (accès foyer).
- Q2 : ajouter, lister, télécharger **et supprimer**.
- Q3 : liste visuelle dense (dans l'esprit d'une galerie photo grand public) ; un appui ouvre la photo en grand avec ses informations.

## Clarifications

### Session 2026-08-27

- Q: Quels formats de photo le site doit-il accepter à l’ajout ? → A: JPEG, PNG, WebP, GIF, HEIC et AVIF.
- Q: Après confirmation, une photo supprimée doit-elle disparaître définitivement, ou rester récupérable un temps ? → A: Corbeille, récupérable jusqu’à vidage manuel.
- Q: Après combien de temps d’inactivité la personne doit-elle se reconnecter ? → A: 30 minutes d’inactivité.
- Q: Quelle taille maximale une photo peut-elle avoir à l’ajout ? → A: 50 Mo par photo.
- Q: Après trop de tentatives d’entrée incorrectes, que doit faire le site ? → A: Pas de blocage ; message d’erreur générique seulement.
- Q: Peut-on télécharger une photo depuis la corbeille ? → A: Non : il faut d’abord la restaurer dans la galerie, puis télécharger.
- Q: Quelle limite de stockage pour tout le foyer ? → A: 9 Go au total (galerie + corbeille).
- Q: Faut-il des exigences d’accessibilité dans cette version ? → A: Non, hors périmètre de cette version.
- Q: Quels journaux / statistiques le site doit-il produire ? → A: Journaux techniques minimaux, privés, jamais le mot de passe ; pas de stats dans l’interface du foyer.
- Q: Quel objectif de rapidité pour la galerie ? → A: Jusqu’à 200 photos, la grille est utilisable en moins de 3 secondes (connexion habituelle du foyer).
- Q: Où le site est-il hébergé ? → A: Chez Cloudflare ; les photos restent privées (authentification obligatoire, pas de galerie publique).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrer sur le site (Priority: P1)

Une personne qui connaît l'identifiant et le mot de passe du foyer arrive sur une page d'entrée. Elle saisit ces deux informations. Si elles sont correctes, elle accède au site et voit les photos du foyer. Si elles sont incorrectes, elle reste dehors et ne voit aucune photo.

**Why this priority**: Sans cette entrée, rien d'autre n'est possible. La constitution exige qu'on n'entre qu'avec un identifiant et un mot de passe.

**Independent Test**: Tenter d'ouvrir le site sans être connecté (refus, aucune photo). Se connecter avec de bons identifiants (accès à la galerie). Se connecter avec de mauvais identifiants (refus, message d'erreur sans révéler d'information sensible).

**Acceptance Scenarios**:

1. **Given** une personne non connectée, **When** elle ouvre une page du site autre que la page d'entrée, **Then** elle est renvoyée vers la page d'entrée et ne voit aucune photo, miniature, nom de fichier ni information de photo.
2. **Given** la page d'entrée, **When** elle saisit l'identifiant et le mot de passe valides du foyer, **Then** elle accède à la galerie et peut voir les photos actives du foyer (hors corbeille).
3. **Given** la page d'entrée, **When** elle saisit un identifiant ou un mot de passe incorrect, **Then** l'accès est refusé, aucun contenu photo n'est montré, le message ne précise pas lequel des deux est faux, et un nouvel essai est possible tout de suite.
4. **Given** une personne connectée, **When** elle se déconnecte, **Then** elle ne peut plus voir les photos tant qu'elle ne se reconnecte pas.
5. **Given** une personne connectée, **When** elle reste inactive 30 minutes, **Then** la session expire : elle doit se reconnecter et ne voit plus aucune photo tant qu’elle ne l’a pas fait.

---

### User Story 2 - Ajouter des photos (Priority: P1)

Une personne connectée envoie une ou plusieurs photos depuis son appareil. Les photos sont enregistrées de façon privée, visibles ensuite dans la galerie du foyer. Elles n'apparaissent dans aucune galerie publique et ne sont pas indexées par les moteurs de recherche.

**Why this priority**: C'est le premier geste demandé : pouvoir déposer des photos sur le site.

**Independent Test**: Se connecter, ajouter des photos, vérifier qu'elles apparaissent dans la galerie, et qu'une personne non connectée ne peut ni les voir ni les récupérer.

**Acceptance Scenarios**:

1. **Given** une personne connectée, **When** elle choisit une ou plusieurs photos depuis son appareil et confirme l'ajout, **Then** ces photos sont enregistrées et apparaissent dans la galerie.
2. **Given** une personne connectée, **When** elle tente d'ajouter un fichier qui n'est pas une photo acceptée, **Then** l'ajout est refusé avec un message clair, et aucun fichier n'est conservé.
3. **Given** une personne connectée, **When** l'ajout d'une photo ferait dépasser 9 Go (galerie + corbeille), **Then** cette photo est refusée avec un message indiquant qu'il n'y a plus assez de place, et aucun fichier n'est conservé pour cet ajout.
4. **Given** des photos déjà ajoutées, **When** une personne non connectée tente d'y accéder (page, fichier, miniature, informations), **Then** l'accès est refusé.

---

### User Story 3 - Parcourir la galerie (Priority: P1)

Une personne connectée voit les photos du foyer sous forme de grille dense de miniatures, comme une galerie photo grand public : on reconnaît les images d'un coup d'œil, sans lire une liste de noms. Les photos les plus récentes sont faciles à trouver. Elle ne voit cette galerie qu'après connexion.

**Why this priority**: Sans galerie visuelle, on ne peut pas choisir quoi ouvrir, télécharger ou supprimer.

**Independent Test**: Ajouter plusieurs photos, ouvrir la galerie, vérifier que chaque photo apparaît en miniature, qu'on peut toutes les parcourir, et qu'une personne non connectée ne voit rien.

**Acceptance Scenarios**:

1. **Given** une personne connectée et des photos déjà ajoutées (hors corbeille), **When** elle ouvre la galerie, **Then** elle voit une grille de miniatures de toutes les photos actives du foyer, et seulement celles-là (pas les photos à la corbeille).
2. **Given** une personne connectée sans aucune photo active, **When** elle ouvre la galerie, **Then** elle voit un état vide explicite (aucune photo pour l'instant) et peut quand même en ajouter.
3. **Given** beaucoup de photos, **When** elle fait défiler la galerie, **Then** elle peut parcourir l'ensemble sans quitter le site et sans voir de contenu hors foyer.
4. **Given** une personne connectée et au plus 200 photos dans la galerie, **When** elle ouvre la galerie depuis une connexion habituelle du foyer, **Then** elle voit les premières miniatures et peut défiler en moins de 3 secondes.
5. **Given** une personne non connectée, **When** elle tente d'ouvrir la galerie, **Then** aucune miniature n'est montrée.

---

### User Story 4 - Voir une photo en grand avec ses informations (Priority: P1)

Depuis la galerie, la personne appuie (ou clique) sur une miniature. La photo s'affiche en grand. En plus de l'image, elle voit les informations de la photo. Depuis cet écran, elle peut aussi télécharger ou supprimer.

**Why this priority**: Demandé explicitement : ouvrir la photo en grand et lire ses informations.

**Independent Test**: Appuyer sur une miniature, vérifier que la grande image correspond à celle choisie et que les informations affichées concernent bien cette photo. Fermer ou revenir : on retrouve la galerie.

**Acceptance Scenarios**:

1. **Given** la galerie, **When** la personne appuie sur une miniature, **Then** elle voit cette photo en grand, nette, et ses informations à côté ou sous l'image.
2. **Given** la vue agrandie, **When** la photo contient une date de prise de vue, **Then** cette date est affichée ; **When** elle n'en contient pas, **Then** la date de prise de vue est indiquée comme inconnue, sans inventer de date.
3. **Given** la vue agrandie, **When** la personne revient en arrière, **Then** elle retrouve la galerie à l'endroit où elle était.
4. **Given** une personne non connectée, **When** elle tente d'ouvrir une vue agrandie (y compris via un lien), **Then** l'accès est refusé et aucune information de photo n'est révélée.

---

### User Story 5 - Télécharger une photo (Priority: P1)

Depuis la vue agrandie d’une photo de la galerie (ou un geste équivalent clairement proposé sur cette photo active), la personne télécharge la photo sur son appareil. Le fichier récupéré est la photo elle-même, pas une version publique dégradée par défaut. Une photo à la corbeille ne se télécharge pas : il faut d’abord la restaurer.

**Why this priority**: C'est le geste demandé pour récupérer une photo choisie.

**Independent Test**: Ouvrir une photo, la télécharger, vérifier que le fichier obtenu correspond à celle affichée. Tenter sans être connecté : refus.

**Acceptance Scenarios**:

1. **Given** une photo de la galerie ouverte en grand, **When** la personne demande le téléchargement, **Then** elle obtient cette photo-là sur son appareil.
2. **Given** une photo dans la corbeille, **When** la personne tente de la télécharger sans la restaurer, **Then** le téléchargement n’est pas proposé / est refusé ; la photo reste dans la corbeille.
3. **Given** une personne non connectée, **When** elle tente de télécharger une photo (y compris via un lien direct), **Then** le téléchargement est refusé et aucune photo n'est servie.

---

### User Story 6 - Mettre une photo à la corbeille (Priority: P2)

Une personne connectée retire une photo de la galerie. Après confirmation, la photo quitte la galerie et rejoint la corbeille. Elle n’est pas encore détruite : on peut la retrouver dans la corbeille jusqu’à un vidage manuel. Une mise à la corbeille n’est pas silencieuse : on demande confirmation.

**Why this priority**: Permet de corriger un mauvais envoi. Moins critique qu'ajouter et consulter, mais inclus dans cette version.

**Independent Test**: Ouvrir une photo, confirmer la suppression, vérifier qu'elle n'apparaît plus dans la galerie et qu'elle est dans la corbeille. Annuler la confirmation : la photo reste dans la galerie.

**Acceptance Scenarios**:

1. **Given** une photo ouverte (ou clairement désignée), **When** la personne demande la suppression et confirme, **Then** la photo disparaît de la galerie et apparaît dans la corbeille.
2. **Given** une demande de suppression, **When** la personne annule, **Then** la photo reste dans la galerie, inchangée, et n’est pas dans la corbeille.
3. **Given** la dernière photo active du foyer vient d’être mise à la corbeille, **When** la personne revient à la galerie, **Then** elle voit l’état vide et peut encore ajouter des photos.

---

### User Story 7 - Restaurer ou vider la corbeille (Priority: P2)

Une personne connectée ouvre la corbeille, distincte de la galerie. Elle y reconnaît les photos (miniatures / informations) pour décider. Elle peut remettre une photo dans la galerie ; seulement après cette restauration, la photo redevient téléchargeable. Elle peut vider la corbeille : après confirmation, les photos qui y étaient sont détruites définitivement et ne sont plus récupérables. Le vidage libère de la place dans la limite de 9 Go.

**Why this priority**: Décision du porteur : une photo « supprimée » reste récupérable jusqu’au vidage manuel.

**Independent Test**: Mettre une photo à la corbeille, la restaurer (elle revient dans la galerie). Mettre une photo à la corbeille, vider la corbeille après confirmation (elle disparaît partout). Annuler le vidage : la corbeille reste inchangée.

**Acceptance Scenarios**:

1. **Given** une photo dans la corbeille, **When** la personne la restaure, **Then** elle réapparaît dans la galerie et n’est plus dans la corbeille.
2. **Given** une ou plusieurs photos dans la corbeille, **When** la personne demande le vidage et confirme, **Then** ces photos sont détruites définitivement : plus dans la galerie, plus dans la corbeille, plus téléchargeables.
3. **Given** une demande de vidage, **When** la personne annule, **Then** les photos restent dans la corbeille, inchangées.
4. **Given** une personne non connectée, **When** elle tente d’ouvrir la corbeille, de restaurer ou de vider, **Then** l’accès est refusé et aucune photo ni information n’est révélée.
5. **Given** une photo dans la corbeille, **When** la personne la consulte (liste ou vue agrandie), **Then** elle peut la reconnaître et la restaurer, mais elle ne peut pas la télécharger tant qu’elle n’est pas restaurée. Un lien d’une photo à la corbeille, pour une personne connectée, MUST l’indiquer clairement (pas le même texte qu’une photo inconnue).

---

### Edge Cases

- Identifiant ou mot de passe vide à l'entrée : refus, avec indication de remplir les deux champs.
- Identifiant ou mot de passe incorrect, y compris après plusieurs essais : refus, message d’erreur générique identique (ne précise pas lequel des deux est faux, ne révèle pas l’existence d’un compte). Pas de blocage temporaire ni d’attente forcée : un nouvel essai reste possible tout de suite.
- Ajout d'un fichier trop volumineux (plus de 50 Mo) : refus avec message indiquant que la photo dépasse la taille acceptée (50 Mo).
- Ajout qui ferait dépasser 9 Go au total (photos de la galerie + photos à la corbeille) : refus avec message indiquant qu’il n’y a plus assez de place ; les photos déjà stockées restent intactes.
- Mise à la corbeille : ne libère pas de place (le fichier compte toujours dans les 9 Go). Seul le vidage libère de la place.
- Tentative de télécharger une photo encore à la corbeille : pas de téléchargement ; il faut d’abord restaurer.
- Ajout interrompu (perte de connexion) : la photo n'apparaît pas dans la galerie tant qu'elle n'est pas complètement reçue.
- Photo déjà présente (même fichier renvoyé) : le site l'accepte comme nouvelle entrée ; pas de fusion silencieuse.
- Galerie très longue : défilement possible de toutes les miniatures du foyer. L’objectif « moins de 3 secondes » s’applique jusqu’à 200 photos ; au-delà, on peut encore tout parcourir, sans obligation de ce délai.
- Photo sans date de prise de vue : la vue agrandie affiche « date de prise de vue inconnue » et s'appuie sur la date d'ajout pour le rangement dans la galerie.
- Photo très large ou très haute : la vue agrandie montre l'image entière de façon lisible (on voit le sujet), sans la couper de façon trompeuse.
- Déconnexion ou expiration de session pendant un téléchargement : le téléchargement peut échouer ; un nouvel essai exige d'être reconnecté.
- Inactivité de moins de 30 minutes : la session reste ouverte ; à 30 minutes d’inactivité, elle expire.
- Caractères spéciaux dans le nom de fichier : le nom reste lisible dans les informations ; le téléchargement fonctionne.
- Suppression de la photo actuellement ouverte : après confirmation, la photo va à la corbeille et retour à la galerie.
- Restauration d’une photo : elle reprend sa place dans la galerie selon le rangement habituel (date de prise de vue si connue, sinon date d’ajout).
- Vidage de la corbeille alors qu’elle est déjà vide : message explicite, aucune destruction supplémentaire.
- Tentative d'ouvrir, télécharger, mettre à la corbeille, restaurer ou vider via un lien après déconnexion : refus, aucune photo ni information.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le site MUST refuser toute personne non authentifiée, excepté la page d'entrée, `robots.txt`, et la feuille de styles nécessaire à cette page. Les scripts de galerie, d'ajout, de photo et de corbeille MUST exiger une session.
- **FR-002**: L'entrée MUST exiger à la fois un identifiant ET un mot de passe. Les deux sont obligatoires.
- **FR-003**: Il n'existe qu'un seul accès foyer : un identifiant et un mot de passe partagés. Toute personne authentifiée avec cet accès MUST voir les mêmes photos actives (toutes les photos du foyer qui ne sont pas à la corbeille). Cette vue d'ensemble MUST NOT être proposée à une personne non authentifiée.
- **FR-004**: Une personne connectée MUST pouvoir ajouter une ou plusieurs photos depuis son appareil.
- **FR-005**: Une personne connectée MUST voir la galerie des photos du foyer sous forme de grille dense de miniatures, reconnaissables d'un coup d'œil (présentation de type galerie photo grand public, pas une liste de noms seuls).
- **FR-006**: Les miniatures de la galerie MUST être rangées de la plus récente à la plus ancienne (date de prise de vue si elle est connue, sinon date d'ajout).
- **FR-007**: Un appui (ou clic) sur une miniature MUST ouvrir cette photo en grand.
- **FR-008**: La vue agrandie MUST afficher, en plus de l'image, les informations suivantes : nom du fichier, date d'ajout sur le site, date de prise de vue (ou « inconnue »), dimensions (largeur × hauteur), et poids du fichier.
- **FR-009**: Une personne connectée MUST pouvoir télécharger une photo de la galerie actuellement ouverte. Le téléchargement depuis la corbeille MUST NOT être possible : la photo MUST d’abord être restaurée dans la galerie.
- **FR-010**: Une personne connectée MUST pouvoir mettre une photo à la corbeille, uniquement après une confirmation explicite. La photo MUST alors disparaître de la galerie et rester récupérable dans la corbeille.
- **FR-011**: Les photos, miniatures, noms de fichiers, dates et autres informations (galerie et corbeille) MUST suivre les mêmes règles d'accès que les photos elles-mêmes.
- **FR-012**: Les moteurs de recherche MUST NOT indexer les photos.
- **FR-013**: Un message d'erreur MUST NOT révéler si une photo ou un compte existe à quelqu'un qui n'y a pas droit. Après un identifiant ou un mot de passe incorrect, le site MUST afficher un message générique et MUST NOT bloquer, temporiser ni verrouiller l’entrée : un nouvel essai MUST rester possible immédiatement.
- **FR-014**: Un identifiant connu (nom de fichier, numéro, lien) MUST NOT suffire : l'autorisation MUST être vérifiée à chaque demande de page, de fichier, de miniature, d'informations ou de téléchargement.
- **FR-015**: La personne connectée MUST pouvoir se déconnecter.
- **FR-016**: Seuls des fichiers photo des formats suivants MUST pouvoir être ajoutés : JPEG, PNG, WebP, GIF, HEIC et AVIF. Tout autre type (vidéo, PDF, archive, document) MUST être refusé. Chaque fichier MUST faire au plus 50 Mo ; au-delà, l’ajout MUST être refusé et aucun fichier MUST NOT être conservé.
- **FR-017**: Les albums, le partage par lien public, les comptes séparés et les fonctions de réseau social sont hors périmètre de cette version.
- **FR-018**: Une personne connectée MUST pouvoir consulter la corbeille (distincte de la galerie) et restaurer une photo vers la galerie.
- **FR-019**: Une personne connectée MUST pouvoir vider la corbeille, uniquement après une confirmation explicite. Le vidage MUST détruire définitivement les photos qui s’y trouvaient (plus de restauration, plus de téléchargement).
- **FR-020**: Les photos à la corbeille MUST suivre les mêmes règles d’accès que les photos de la galerie : jamais visibles ni téléchargeables sans authentification.
- **FR-021**: La session MUST expirer après 30 minutes d’inactivité. L’inactivité s’entend : aucune navigation de page HTML et aucune action (entrée, ajout, corbeille, restauration, vidage, changement de tri). Le simple chargement d’une miniature, d’un affichage, d’un original ou d’un fichier statique MUST NOT prolonger la session. Après expiration, toute demande de page, fichier, miniature, informations, téléchargement, corbeille, restauration ou vidage MUST être refusée jusqu’à une nouvelle authentification.
- **FR-022**: L’espace occupé par toutes les photos du foyer (galerie + corbeille) MUST NOT dépasser 9 Go. Un ajout qui ferait dépasser cette limite MUST être refusé, avec un message clair, sans conserver le fichier refusé. Mettre une photo à la corbeille MUST NOT libérer d’espace ; vider la corbeille MUST libérer l’espace correspondant.
- **FR-023**: Le site MUST NOT afficher de statistiques de visite ni d’historique de connexion dans l’interface du foyer. S’il existe des journaux techniques pour la personne qui maintient le site (échec d’ajout, erreur serveur), ils MUST rester privés, MUST NOT contenir le mot de passe, et MUST NOT être exposés aux moteurs de recherche ni à une personne non authentifiée.
- **FR-024**: Pour une galerie d’au plus 200 photos, une personne connectée MUST voir les premières miniatures et pouvoir défiler en moins de 3 secondes, depuis une connexion habituelle du foyer (hors tout premier envoi massif en cours).
- **FR-025**: Le site MUST être hébergé chez Cloudflare. Cet hébergement MUST NOT rendre les photos publiques : l’authentification, l’absence de galerie universelle et l’interdiction d’indexation par les moteurs de recherche restent obligatoires.

### Key Entities

- **Accès foyer** : un unique couple identifiant + mot de passe pour tout le site. Quiconque le connaît entre dans le même espace. Sans cette preuve, aucune photo n'est visible ni téléchargeable.
- **Photo** : image privée déposée après connexion. Elle a une miniature, une vue agrandie, des informations (nom, dates, dimensions, poids) et peut être téléchargée ou mise à la corbeille. Elle n'est jamais publique.
- **Galerie** : vue, après connexion uniquement, des photos actives du foyer (hors corbeille) en grille de miniatures. Sert à parcourir et à ouvrir une photo.
- **Vue agrandie** : écran d'une photo de la galerie, en grand, avec ses informations, et les gestes télécharger et mettre à la corbeille.
- **Corbeille** : vue, après connexion uniquement, des photos retirées de la galerie. On y reconnaît les photos pour restaurer ou vider. Une photo y reste jusqu’à restauration (retour galerie, alors téléchargeable) ou vidage manuel (destruction définitive). Pas de téléchargement tant que la photo est à la corbeille.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Une personne qui connaît l'identifiant et le mot de passe entre sur le site et voit la galerie (ou l'état vide) en moins d'une minute.
- **SC-002**: Une personne connectée ajoute une photo depuis son appareil et la retrouve dans la galerie en moins de 2 minutes (hors temps de transfert d'un très gros fichier).
- **SC-003**: Une personne connectée reconnaît une photo dans la grille, l'ouvre en grand du premier coup, et en lit les informations, dans au moins 95 % des essais.
- **SC-004**: Une personne connectée télécharge la photo ouverte du premier coup dans au moins 95 % des essais.
- **SC-005**: Une mise à la corbeille confirmée retire la photo de la galerie et la place dans la corbeille ; une annulation la laisse intacte dans la galerie. Un vidage confirmé détruit définitivement le contenu de la corbeille ; une annulation du vidage le laisse intact. Dans 100 % des essais, ni mise à la corbeille ni vidage sans confirmation.
- **SC-006**: Une personne sans identifiant ni mot de passe valides n'obtient aucune photo, miniature, nom de fichier, information ou page de contenu dans 100 % des tentatives (y compris en collant un lien direct).
- **SC-007**: 100 % des photos ajoutées restent invisibles aux moteurs de recherche et aux visiteurs non autorisés.
- **SC-008**: Une personne non technique comprend, dès la première visite connectée, comment ajouter une photo, en ouvrir une en grand, la télécharger, en mettre une à la corbeille, la restaurer et vider la corbeille, sans aide extérieure.
- **SC-009**: Avec au plus 200 photos dans la galerie, une personne connectée voit les premières miniatures et peut défiler en moins de 3 secondes, dans au moins 95 % des ouvertures de galerie (connexion habituelle du foyer).

## Assumptions

- Un seul couple identifiant / mot de passe pour tout le foyer ; pas de comptes individuels isolés dans cette version.
- Il n'y a pas d'inscription en libre-service : l'identifiant et le mot de passe existent déjà (créés / configurés hors de la page d'entrée).
- Les textes visibles par l'utilisateur sont en français.
- Formats acceptés : JPEG, PNG, WebP, GIF, HEIC et AVIF. Les vidéos, PDF et archives restent hors périmètre.
- Taille maximale : 50 Mo par photo. Au-delà, l’ajout est refusé.
- Espace total du foyer : 9 Go (galerie + corbeille). Au-delà, l’ajout est refusé. La corbeille compte dans ce plafond ; le vidage libère de la place.
- Pas de lien public « envoyez cette URL à n'importe qui ». Consulter la galerie ou la corbeille, télécharger, restaurer et vider exigent d'être connecté.
- La session reste ouverte tant que la personne utilise le site ; après 30 minutes d’inactivité, elle doit se reconnecter.
- Après un essai d’entrée incorrect, pas de blocage ni d’attente forcée : le foyer peut réessayer immédiatement, avec le même message générique.
- « Comme Google Photos » décrit l'expérience : grille dense de miniatures, appui pour voir en grand, informations visibles. Ce n'est pas une intégration avec Google, ni l'obligation de recopier chaque détail de ce service (recherche par visage, albums automatiques, partage, cartes, etc. restent hors périmètre).
- Informations affichées limitées à ce qui est utile pour reconnaître et gérer la photo (nom, dates, dimensions, poids). Pas d'appareil photo, GPS ou autres détails techniques sauf demande ultérieure.
- Une photo mise à la corbeille n’expire pas toute seule : elle reste récupérable jusqu’au vidage manuel. Pour la télécharger, il faut d’abord la restaurer dans la galerie.
- L’accessibilité avancée (clavier, lecteur d’écran, cible WCAG) est hors périmètre de cette version.
- Pas de statistiques ni d’historique de connexion dans l’interface du foyer. Les éventuels journaux techniques restent privés et ne contiennent jamais le mot de passe.
- Les albums sont hors périmètre de cette version.
- Hébergement : Cloudflare. Ce n’est pas une galerie publique Cloudflare ; l’entrée par identifiant et mot de passe reste obligatoire.
- Les secrets (mots de passe) ne sont jamais stockés en clair ni enregistrés dans le dépôt du projet.
