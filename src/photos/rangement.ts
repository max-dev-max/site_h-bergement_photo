import type { Photo } from "./types"

export type TriGalerie = "recent" | "ancien"

export function normaliserTri(valeur: string | undefined | null): TriGalerie {
  return valeur === "ancien" ? "ancien" : "recent"
}

export function dateDeRangement(photo: Photo): string {
  return photo.date_prise_de_vue ?? photo.date_ajout
}

export function jourDeRangement(photo: Photo): string {
  const iso = dateDeRangement(photo)
  const jour = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : iso
}

export function libelleJour(jourIso: string): string {
  const date = new Date(`${jourIso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return jourIso
  const libelle = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
  return libelle.charAt(0).toUpperCase() + libelle.slice(1)
}

export type GroupeDate = {
  jour: string
  libelle: string
  photos: Photo[]
}

export function grouperParJour(photos: Photo[]): GroupeDate[] {
  const groupes: GroupeDate[] = []
  for (const photo of photos) {
    const jour = jourDeRangement(photo)
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.jour === jour) {
      dernier.photos.push(photo)
    } else {
      groupes.push({ jour, libelle: libelleJour(jour), photos: [photo] })
    }
  }
  return groupes
}
