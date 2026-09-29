# Remarques spécifiques au code

Constat **après** les cycles de correction (2026-09-16). Les écarts listés dans la version précédente de ce fichier ont été **corrigés** dans le code, les tests et les documents. Ce fichier n’est plus un backlog.

## Écarts fermés

- Constitution 1.1.0, spec et code : identifiant **et** mot de passe ; un seul périmètre foyer.
- Scripts métier (`/galerie.js`, `/ajout.js`, `/photo.js`, `/corbeille.js`) : session obligatoire. `/styles.css`, `/robots.txt`, `/favicon.ico` restent publics.
- Session renouvelée seulement sur une **action** (page HTML ou mutation), pas sur miniature / affichage / original / CSS / JS.
- `POST /sortie` : public (vide le cookie) ; contrat aligné. Téléchargement depuis la corbeille : **409**.
- README : `.dev.vars.example` (`change-moi`) distinct des tests (`mot-de-passe-test`).
- Dérivés : un repli canvas **par** fichier ; JPEG validé (magic bytes + taille) ; pas de HEIC recopié dans `<img>` ; `estAffichableNavigateur` utilisée.
- Ajout : réserve du quota → R2 → INSERT ; messages distincts (format, poids, place, affichage, stockage).
- Lots corbeille / restauration : uniquement les id réellement mis à jour (`RETURNING`).
- Vidage : lots de 20, `DELETE … RETURNING` puis quota puis R2 ; un vidage interrompu se reprend.
- `GET /api/photos?tri=` aligné sur la galerie. Index `date_rangement` (migration `0002_date_rangement.sql`).
- EXIF : JPEG APP1 + chasse `Exif\0\0` (HEIC/AVIF) ; `OffsetTimeOriginal` si présent.
- UUID de lot : forme 8-4-4-4-12, plus de filtre de version trop étroit.
- Après un envoi : bilan conservé (`sessionStorage`) puis réaffiché. Drop filtré. Parallélisme 1 ou 2 selon la mémoire.
- Page `/ajout` orpheline supprimée. Ajout uniquement depuis la galerie.
- Galerie : `loading="lazy"` + `content-visibility` ; état vide sans rechargement.
- Téléchargement multiple : dossier (File System Access) si possible, sinon un par un avec progression.
- E2E : `setInputFiles` sur le vrai champ fichier.
- Vue agrandie d’une photo à la corbeille : message clair + restaurer, pas de téléchargement.
- Quota : mention « dont à la corbeille » quand la corbeille occupe de la place.

## Limites qui restent (ce ne sont pas des contradictions)

Ce sont des choix de spec, des plafonds Cloudflare, ou le comportement du navigateur.

1. **Coupure Worker au milieu d’un ajout ou d’un vidage**  
   Si le processus meurt entre deux étapes, un objet R2 orphelin ou un quota un peu trop haut est possible. Les chemins d’erreur normaux nettoient. Un second vidage reprend les photos encore à la corbeille.

2. **Quota = originaux seulement**  
   Aligné spec / research : le foyer parle de « photos », pas des JPEG de grille. R2 contient aussi affichage + miniature.

3. **« 9 Go » = 9 × 1024³ octets**  
   Même constante partout (UI, D1, messages). C’est le libellé produit, pas un second plafond.

4. **Pas de blocage après de mauvais identifiants**  
   Exigé par FR-013. Le PBKDF2 reste coûteux, volontairement.

5. **Pas de jeton CSRF**  
   Cookie `SameSite=Strict` + same-origin. Suffisant pour ce foyer unique.

6. **Téléchargement de dizaines de fichiers**  
   Chrome peut encore demander une confirmation, ou préférer l’enregistrement dans un dossier. Le bouton affiche la progression.

7. **Galerie de 200 photos**  
   Toutes les cartes sont dans le HTML (défilement de tout le foyer). Les miniatures hors écran sont en `loading="lazy"`. L’objectif « 3 s » dépend aussi de la ligne du foyer.

8. **Date EXIF sans fuseau**  
   Si le fichier n’a pas `OffsetTimeOriginal`, on garde le calendrier de l’appareil (les 10 premiers caractères). On n’invente pas d’heure UTC.

9. **Playwright**  
   Les e2e exercent le vrai `<input type="file">`. Ils n’ont pas été relancés ici : le binaire Chromium n’était pas installé dans cet environnement. Relancer : `npx playwright install chromium && npm run test:e2e`.

## Vérifications faites dans ces cycles

- Vitest : 32 tests, 11 fichiers, OK.
- Migration locale `0002_date_rangement.sql` appliquée.
- Contrôles HTTP locaux : `/galerie` et `/galerie.js` anonymes → 302 `/entree` ; `/styles.css` → 200 ; `/favicon.ico` → 204 ; `/ajout` anonyme → 302 (plus de page orpheline).

Après ces cycles, constitution, spec, contrats et code disent la même chose sur l’entrée, la session, les lots, l’ajout et la corbeille.
