import { supprimerObjetsPhoto } from "../lib/r2"
import { listerCorbeille } from "./liste"
import { libererOctets } from "./quota"

export type ResultatVidage = {
  detruites: number
  message: string
}

export async function viderCorbeille(env: {
  DB: D1Database
  PHOTOS: R2Bucket
}): Promise<ResultatVidage> {
  const photos = await listerCorbeille(env.DB)
  if (photos.length === 0) {
    return { detruites: 0, message: "La corbeille est déjà vide." }
  }

  const somme = photos.reduce((acc, p) => acc + p.octets, 0)
  const parallele = 8
  for (let i = 0; i < photos.length; i += parallele) {
    await Promise.all(photos.slice(i, i + parallele).map((photo) => supprimerObjetsPhoto(env.PHOTOS, photo.id)))
  }

  await env.DB.prepare("DELETE FROM photo WHERE etat = 'corbeille'").run()
  await libererOctets(env.DB, somme)

  return { detruites: photos.length, message: "La corbeille a été vidée." }
}
