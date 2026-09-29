import type { Photo } from "./types"
import { trouverPhoto } from "./liste"

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TAILLE_LOT = 80
export const IDS_MAX_LOT = 400

export function idsValides(brut: unknown): string[] {
  if (!Array.isArray(brut)) return []
  const vus = new Set<string>()
  const ids: string[] = []
  for (const item of brut) {
    if (typeof item !== "string" || !RE_UUID.test(item) || vus.has(item)) continue
    vus.add(item)
    ids.push(item)
  }
  return ids.slice(0, IDS_MAX_LOT)
}

function lots<T>(items: T[], taille: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += taille) out.push(items.slice(i, i + taille))
  return out
}

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

export async function mettrePlusieursALaCorbeille(db: D1Database, ids: string[]): Promise<string[]> {
  const valides = idsValides(ids)
  if (valides.length === 0) return []
  const maintenant = new Date().toISOString()
  const deplacees: string[] = []
  for (const lot of lots(valides, TAILLE_LOT)) {
    const ph = lot.map(() => "?").join(", ")
    const { results } = await db
      .prepare(
        `UPDATE photo SET etat = 'corbeille', date_corbeille = ? WHERE etat = 'active' AND id IN (${ph}) RETURNING id`,
      )
      .bind(maintenant, ...lot)
      .all<{ id: string }>()
    deplacees.push(...(results ?? []).map((r) => r.id))
  }
  return deplacees
}

export async function restaurerPlusieurs(db: D1Database, ids: string[]): Promise<string[]> {
  const valides = idsValides(ids)
  if (valides.length === 0) return []
  const restaurees: string[] = []
  for (const lot of lots(valides, TAILLE_LOT)) {
    const ph = lot.map(() => "?").join(", ")
    const { results } = await db
      .prepare(
        `UPDATE photo SET etat = 'active', date_corbeille = NULL WHERE etat = 'corbeille' AND id IN (${ph}) RETURNING id`,
      )
      .bind(...lot)
      .all<{ id: string }>()
    restaurees.push(...(results ?? []).map((r) => r.id))
  }
  return restaurees
}

export async function photoApres(db: D1Database, id: string): Promise<Photo | null> {
  return trouverPhoto(db, id)
}
