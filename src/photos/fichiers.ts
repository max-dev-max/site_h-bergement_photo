import type { Context } from "hono"
import type { Env } from "../env"
import { EN_TETES_MEDIA } from "../lib/r2"
import { trouverPhoto } from "./liste"

type AppEnv = { Bindings: Env }

function nomDisposition(nom: string): string {
  const propre = nom.replace(/[\r\n"]/g, "_").slice(0, 180)
  const ascii = propre.replace(/[^\x20-\x7E]/g, "_") || "photo"
  const star = encodeURIComponent(nom).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${star}`
}

async function servirObjet(
  c: Context<AppEnv>,
  cle: string,
  contentTypeDefaut: string,
  disposition?: string,
): Promise<Response> {
  const objet = await c.env.PHOTOS.get(cle)
  if (!objet) {
    return c.json({ erreur: "Photo introuvable." }, 404)
  }
  const headers = new Headers({
    "Content-Type": objet.httpMetadata?.contentType ?? contentTypeDefaut,
    ...EN_TETES_MEDIA,
  })
  if (disposition) headers.set("Content-Disposition", disposition)
  return new Response(objet.body, { status: 200, headers })
}

export async function servirMiniature(c: Context<AppEnv>): Promise<Response> {
  const photo = await trouverPhoto(c.env.DB, c.req.param("id"))
  if (!photo) return c.json({ erreur: "Photo introuvable." }, 404)
  return servirObjet(c, photo.cle_miniature, "image/jpeg")
}

export async function servirAffichage(c: Context<AppEnv>): Promise<Response> {
  const photo = await trouverPhoto(c.env.DB, c.req.param("id"))
  if (!photo) return c.json({ erreur: "Photo introuvable." }, 404)
  return servirObjet(c, photo.cle_affichage, "image/jpeg")
}

export async function servirFichier(c: Context<AppEnv>): Promise<Response> {
  const photo = await trouverPhoto(c.env.DB, c.req.param("id"))
  if (!photo) return c.json({ erreur: "Photo introuvable." }, 404)
  if (photo.etat === "corbeille") {
    return c.json({ erreur: "Restaurez la photo avant de la télécharger." }, 409)
  }
  return servirObjet(c, photo.cle_original, photo.type_mime, nomDisposition(photo.nom_fichier))
}
