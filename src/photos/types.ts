export type EtatPhoto = "active" | "corbeille"

export type Photo = {
  id: string
  nom_fichier: string
  type_mime: string
  octets: number
  largeur: number
  hauteur: number
  date_prise_de_vue: string | null
  date_ajout: string
  date_rangement?: string | null
  etat: EtatPhoto
  date_corbeille: string | null
  cle_original: string
  cle_affichage: string
  cle_miniature: string
}

export type PhotoJson = {
  id: string
  nom_fichier: string
  type_mime: string
  octets: number
  largeur: number
  hauteur: number
  date_prise_de_vue: string | null
  date_ajout: string
  etat: EtatPhoto
  url_miniature: string
  url_affichage: string
  url_fichier: string | null
}

export type Espace = {
  octets_utilises: number
  octets_plafond: number
  octets_corbeille: number
}

export function photoVersJson(photo: Photo): PhotoJson {
  return {
    id: photo.id,
    nom_fichier: photo.nom_fichier,
    type_mime: photo.type_mime,
    octets: photo.octets,
    largeur: photo.largeur,
    hauteur: photo.hauteur,
    date_prise_de_vue: photo.date_prise_de_vue,
    date_ajout: photo.date_ajout,
    etat: photo.etat,
    url_miniature: `/api/photos/${photo.id}/miniature`,
    url_affichage: `/api/photos/${photo.id}/affichage`,
    url_fichier: photo.etat === "active" ? `/api/photos/${photo.id}/fichier` : null,
  }
}
