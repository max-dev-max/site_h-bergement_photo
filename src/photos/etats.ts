import type { Photo } from "./types"
import { trouverPhoto } from "./liste"

export async function mettreALaCorbeille(
  db: D1Database,
  id: string,
): Promise<"ok" | "introuvable" | "deja"> {
  const photo = await trouverPhoto(db, id)
  if (!photo) return "introuvable"
  if (photo.etat === "corbeille") return "deja"
  const maintenant = new Date().toISOString()
  await db
    .prepare("UPDATE photo SET etat = 'corbeille', date_corbeille = ? WHERE id = ?")
    .bind(maintenant, id)
    .run()
  return "ok"
}

export async function restaurerPhoto(
  db: D1Database,
  id: string,
): Promise<"ok" | "introuvable" | "deja"> {
  const photo = await trouverPhoto(db, id)
  if (!photo) return "introuvable"
  if (photo.etat === "active") return "deja"
  await db
    .prepare("UPDATE photo SET etat = 'active', date_corbeille = NULL WHERE id = ?")
    .bind(id)
    .run()
  return "ok"
}

export async function photoApres(db: D1Database, id: string): Promise<Photo | null> {
  return trouverPhoto(db, id)
}
