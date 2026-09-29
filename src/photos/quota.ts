import type { Espace } from "./types"
import { OCTETS_PLAFOND_FOYER } from "../lib/quota"

export async function lireEspace(db: D1Database): Promise<Espace> {
  const row = await db
    .prepare("SELECT octets_utilises, octets_plafond FROM quota WHERE id = 1")
    .first<{ octets_utilises: number; octets_plafond: number }>()
  const corbeille = await db
    .prepare("SELECT COALESCE(SUM(octets), 0) AS n FROM photo WHERE etat = 'corbeille'")
    .first<{ n: number }>()
  const octets_corbeille = Number(corbeille?.n ?? 0)
  if (!row) {
    return { octets_utilises: 0, octets_plafond: OCTETS_PLAFOND_FOYER, octets_corbeille }
  }
  return { ...row, octets_corbeille }
}

export async function reserverOctets(db: D1Database, octets: number): Promise<boolean> {
  const r = await db
    .prepare(
      "UPDATE quota SET octets_utilises = octets_utilises + ? WHERE id = 1 AND octets_utilises + ? <= octets_plafond",
    )
    .bind(octets, octets)
    .run()
  return (r.meta.changes ?? 0) > 0
}

export async function libererOctets(db: D1Database, octets: number): Promise<void> {
  await db
    .prepare("UPDATE quota SET octets_utilises = MAX(0, octets_utilises - ?) WHERE id = 1")
    .bind(octets)
    .run()
}
