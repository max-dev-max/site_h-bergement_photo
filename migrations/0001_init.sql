CREATE TABLE photo (
  id TEXT PRIMARY KEY NOT NULL,
  nom_fichier TEXT NOT NULL,
  type_mime TEXT NOT NULL,
  octets INTEGER NOT NULL CHECK (octets >= 1 AND octets <= 52428800),
  largeur INTEGER NOT NULL CHECK (largeur >= 1),
  hauteur INTEGER NOT NULL CHECK (hauteur >= 1),
  date_prise_de_vue TEXT,
  date_ajout TEXT NOT NULL,
  etat TEXT NOT NULL CHECK (etat IN ('active', 'corbeille')),
  date_corbeille TEXT,
  cle_original TEXT NOT NULL,
  cle_affichage TEXT NOT NULL,
  cle_miniature TEXT NOT NULL
);

CREATE INDEX idx_photo_galerie
  ON photo (etat, date_prise_de_vue DESC, date_ajout DESC);

CREATE TABLE quota (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  octets_utilises INTEGER NOT NULL CHECK (octets_utilises >= 0),
  octets_plafond INTEGER NOT NULL
);

INSERT INTO quota (id, octets_utilises, octets_plafond)
VALUES (1, 0, 9663676416);
