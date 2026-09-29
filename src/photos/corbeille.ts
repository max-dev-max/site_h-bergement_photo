import { supprimerObjetsPhoto } from "../lib/r2"
import { libererOctets } from "./quota"

export type ResultatVidage = {
  detruites: number
  message: string
}

const TAILLE_LOT = 20

export async function viderCorbeille(env: {
  DB: D1Database
  PHOTOS: R2Bucket
}): Promise<ResultatVidage> {
  let detruites = 0

  while (true) {
    const { results } = await env.DB.prepare(
      "SELECT id, octets FROM photo WHERE etat = 'corbeille' LIMIT ?",
    )
      .bind(TAILLE_LOT)
      .all<{ id: string; octets: number }>()
    const lot = results ?? []
    if (lot.length === 0) break

    const ids = lot.map((p) => p.id)
    const ph = ids.map(() => "?").join(", ")
    const { results: detruitesLot } = await env.DB.prepare(
      `DELETE FROM photo WHERE etat = 'corbeille' AND id IN (${ph}) RETURNING id, octets`,
    )
      .bind(...ids)
      .all<{ id: string; octets: number }>()
    const effectivement = detruitesLot ?? []
    if (effectivement.length === 0) continue

    const somme = effectivement.reduce((acc, p) => acc + p.octets, 0)
    await libererOctets(env.DB, somme)

    try {
      await Promise.all(effectivement.map((photo) => supprimerObjetsPhoto(env.PHOTOS, photo.id)))
    } catch (err) {
      const message = err instanceof Error ? err.message : "r2"
      console.error("vidage-r2", message)
    }

    detruites += effectivement.length
  }

  if (detruites === 0) {
    return { detruites: 0, message: "La corbeille est déjà vide." }
  }
  return { detruites, message: "La corbeille a été vidée." }
}
