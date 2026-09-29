-- Colonne de tri alignée sur COALESCE(date_prise_de_vue, date_ajout).
ALTER TABLE photo ADD COLUMN date_rangement TEXT;

UPDATE photo
SET date_rangement = COALESCE(date_prise_de_vue, date_ajout)
WHERE date_rangement IS NULL;

CREATE INDEX idx_photo_tri
  ON photo (etat, date_rangement, date_ajout, id);

DROP INDEX IF EXISTS idx_photo_galerie;
