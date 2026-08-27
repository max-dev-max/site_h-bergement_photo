<!--
Sync Impact Report
- Version change: (modèle non ratifié) → 1.0.0
- Bump: MAJOR (première adoption de la constitution)
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Photos privées par défaut
  - [PRINCIPLE_2_NAME] → II. Authentification obligatoire
  - [PRINCIPLE_3_NAME] → III. Pas de galerie universelle
  - [PRINCIPLE_4_NAME] → IV. Isolation des contenus
  - [PRINCIPLE_5_NAME] → V. Simplicité et nécessité
- Added sections:
  - Règles d'accès et de visibilité
  - Langue et conduite du projet
- Removed sections: aucune (remplacement du canevas)
- Follow-up TODOs: aucun
-->

# Constitution du site d'hébergement photo

## Core Principles

### I. Photos privées par défaut

Chaque photo DOIT être privée. Une photo NE DOIT JAMAIS être
publiée, indexée, listée ou servie à un visiteur non autorisé.
Il N'EXISTE PAS de mode « album public » par défaut.

**Raison** : le site héberge des photos personnelles ; la
confidentialité est le contrat de base, pas une option.

### II. Authentification obligatoire

On n'entre sur le site QU'avec un identifiant OU un mot de passe
(ou les deux). Toute page, fichier, miniature ou lien qui révèle
une photo DOIT exiger cette preuve d'accès. L'accès anonyme aux
photos EST INTERDIT.

**Raison** : sans secret d'entrée, la vie privée n'existe pas.

### III. Pas de galerie universelle

Le système NE DOIT JAMAIS afficher toutes les photos à tout le
monde. Chaque personne authentifiée NE DOIT voir QUE les photos
auxquelles elle a explicitement droit. Une vue « toutes les
photos du site » pour un visiteur ordinaire EST INTERDITE.

**Raison** : l'hébergement n'est pas une vitrine collective.

### IV. Isolation des contenus

Les URL, les fichiers stockés et les réponses du serveur NE
DOIVENT PAS permettre de découvrir ou de télécharger les photos
d'une autre personne. Un identifiant connu (nom de fichier,
numéro) NE SUFFIT PAS : l'autorisation DOIT être vérifiée à
chaque demande.

**Raison** : cacher la page d'accueil ne suffit pas si les
fichiers restent accessibles.

### V. Simplicité et nécessité

On n'ajoute une fonction QUE si elle sert l'hébergement privé
des photos. Toute complexité (réseau social, galerie publique,
partage mondial) EST REJETÉE tant qu'elle n'est pas demandée
explicitement et qu'elle ne viole pas les principes I à IV.

**Raison** : un petit site privé se casse moins s'il reste simple.

## Règles d'accès et de visibilité

- Une personne non authentifiée DOIT être refusée. Seule la page
  d'entrée (identifiant et/ou mot de passe) EST autorisée.
- Après connexion, le visiteur DOIT voir uniquement son périmètre
  (ses albums, ses photos, ou ceux qu'on lui a ouverts).
- Les miniatures, métadonnées (noms, dates, lieux) et
  téléchargements SUIVENT les mêmes règles que les photos
  elles-mêmes.
- Les moteurs de recherche NE DOIVENT PAS indexer les photos.
- Les messages d'erreur NE DOIVENT PAS révéler si une photo
  existe pour quelqu'un qui n'y a pas droit.

## Langue et conduite du projet

- Les documents du projet (constitution, spécifications, plans,
  tâches) DOIVENT être rédigés en français.
- Les textes visibles par l'utilisateur du site DOIVENT être
  en français.
- Avant de coder une fonction, on DOIT vérifier qu'elle respecte
  les principes I à IV. En cas de doute, on refuse l'accès plutôt
  que de montrer une photo.
- Les secrets (mots de passe, identifiants d'accès) NE DOIVENT
  PAS être stockés en clair ni enregistrés dans le dépôt.

## Governance

Cette constitution PRIME sur les spécifications, les plans, les
tâches et le code. En cas de conflit, on aligne le reste sur ce
texte ; on ne dilue pas le principe.

### Amendements

Toute modification DOIT :

1. Être écrite dans ce fichier.
2. Expliquer ce qui change et pourquoi.
3. Mettre à jour la version (voir ci-dessous).
4. Mettre à jour la date de dernière modification (ISO : AAAA-MM-JJ).

La date de ratification NE CHANGE PAS. Un principe I–IV ne peut
être affaibli que par un bump MAJOR, avec accord explicite du
porteur du projet.

### Versionnement

- MAJOR : suppression ou redéfinition d'un principe (surtout I–IV).
- MINOR : nouveau principe ou section, ou règle nettement élargie.
- PATCH : clarification, formulation, correction sans changer le sens.

### Contrôle de conformité

Chaque spécification, plan et revue de code DOIT vérifier :

- les photos restent privées ;
- l'entrée exige un identifiant ou un mot de passe ;
- personne ne voit toutes les photos.

Une fonction qui viole un principe DOIT être refusée ou corrigée
avant d'être considérée comme terminée.

**Version**: 1.0.0 | **Ratified**: 2026-08-27 | **Last Amended**: 2026-08-27
