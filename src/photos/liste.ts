import type { EtatPhoto, Photo } from "./types"
import type { TriGalerie } from "./rangement"

export async function trouverPhoto(db: D1Database, id: string): Promise<Photo | null> {
  const row = await db.prepare("SELECT * FROM photo WHERE id = ?").bind(id).first<Photo>()
  return row ?? null
}

function sqlTri(tri: TriGalerie): string {
  const sens = tri === "ancien" ? "ASC" : "DESC"
  return `ORDER BY COALESCE(date_prise_de_vue, date_ajout) ${sens}, date_ajout ${sens}, id ${sens}`
}

export async function listerPhotos(
  db: D1Database,
  etat: EtatPhoto,
  tri: TriGalerie = "recent",
): Promise<Photo[]> {
  const { results } = await db
    .prepare(`SELECT * FROM photo WHERE etat = ? ${sqlTri(tri)}`)
    .bind(etat)
    .all<Photo>()
  return results ?? []
}

export async function listerActives(db: D1Database, tri: TriGalerie = "recent"): Promise<Photo[]> {
  return listerPhotos(db, "active", tri)
}

export async function listerCorbeille(db: D1Database, tri: TriGalerie = "recent"): Promise<Photo[]> {
  return listerPhotos(db, "corbeille", tri)
}
