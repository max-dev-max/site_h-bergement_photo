import { Hono } from "hono"
import type { Env } from "./env"
import type { Session } from "./auth/session"
import { posterEntree, posterSortie } from "./auth/entree"
import { attributsCookie, cookieDepuisRequete, cookieNom, estHttps, lireSession } from "./auth/session"
import { auth, FICHIERS_STATIQUES } from "./middleware/auth"
import { erreurs } from "./middleware/erreurs"
import { noindex, X_ROBOTS_TAG } from "./middleware/noindex"
import { ajouterPhotos, type RepliNavigateur } from "./photos/ajout"
import { viderCorbeille } from "./photos/corbeille"
import {
  idsValides,
  mettreALaCorbeille,
  mettrePlusieursALaCorbeille,
  photoApres,
  restaurerPhoto,
  restaurerPlusieurs,
} from "./photos/etats"
import { servirAffichage, servirFichier, servirMiniature } from "./photos/fichiers"
import { listerActives, listerCorbeille, trouverPhoto } from "./photos/liste"
import { lireEspace } from "./photos/quota"
import { normaliserTri } from "./photos/rangement"
import { photoVersJson } from "./photos/types"
import { PageErreurPhoto } from "./vues/ajout"
import { PageCorbeille } from "./vues/corbeille"
import { PageEntree } from "./vues/entree"
import { PageGalerie } from "./vues/galerie"
import { PagePhoto } from "./vues/photo"

type AppEnv = { Bindings: Env; Variables: { session: Session } }

const app = new Hono<AppEnv>()

app.use("*", noindex)
app.use("*", erreurs)
app.use("*", auth)

app.get("/favicon.ico", () => new Response(null, { status: 204 }))

app.get("/robots.txt", (c) => {
  return c.text("User-agent: *\nDisallow: /\n", 200, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Robots-Tag": X_ROBOTS_TAG,
  })
})

app.get("*", async (c, next) => {
  const chemin = new URL(c.req.url).pathname
  if (!FICHIERS_STATIQUES.has(chemin) || !c.env.ASSETS) {
    await next()
    return
  }
  const res = await c.env.ASSETS.fetch(c.req.raw)
  const headers = new Headers(res.headers)
  headers.set("X-Robots-Tag", X_ROBOTS_TAG)
  headers.set("Cache-Control", "private, no-store")
  return new Response(res.body, { status: res.status, headers })
})

app.get("/", async (c) => {
  const jeton = cookieDepuisRequete(c.req.header("Cookie"))
  const session = c.get("session") ?? (await lireSession(jeton, c.env.SESSION_SECRET))
  if (session) return c.redirect("/galerie", 302)
  return c.redirect("/entree", 302)
})

app.get("/entree", (c) => {
  if (c.get("session")) return c.redirect("/galerie", 302)
  return c.html(PageEntree({}))
})

app.post("/entree", (c) => posterEntree(c))
app.post("/sortie", (c) => posterSortie(c))

app.get("/galerie", async (c) => {
  const demande = c.req.query("tri")
  const cookieTri = cookieNom(c.req.header("Cookie"), "galerie_tri")
  const tri = normaliserTri(demande ?? cookieTri)
  if (demande === "recent" || demande === "ancien") {
    c.header("Set-Cookie", `galerie_tri=${tri}; ${attributsCookie(estHttps(c.req.url), 60 * 60 * 24 * 365)}`, {
      append: true,
    })
  }
  const photos = await listerActives(c.env.DB, tri)
  const espace = await lireEspace(c.env.DB)
  return c.html(PageGalerie({ photos, espace, tri }))
})

app.get("/photos/:id", async (c) => {
  const photo = await trouverPhoto(c.env.DB, c.req.param("id"))
  if (!photo) {
    return c.html(PageErreurPhoto(), 404)
  }
  return c.html(PagePhoto({ photo }))
})

app.get("/corbeille", async (c) => {
  const photos = await listerCorbeille(c.env.DB)
  return c.html(PageCorbeille({ photos }))
})

app.get("/api/espace", async (c) => {
  const espace = await lireEspace(c.env.DB)
  return c.json(espace)
})

app.get("/api/photos", async (c) => {
  const tri = normaliserTri(c.req.query("tri"))
  const photos = await listerActives(c.env.DB, tri)
  return c.json({ photos: photos.map(photoVersJson) })
})

app.post("/api/photos", async (c) => {
  const form = await c.req.parseBody({ all: true })
  const fichiers = fichiersDuChamp(form.fichiers)
  const replis = await replisDuFormulaire(form, fichiers.length)
  const resultat = await ajouterPhotos(c.env, fichiers, replis)
  if (!resultat.ok) {
    return c.json({ erreur: resultat.echec.erreur }, resultat.echec.statut)
  }
  return c.json({ photos: resultat.photos.map(photoVersJson) }, 201)
})

app.post("/api/photos/corbeille", async (c) => {
  const corps = await c.req.json().catch(() => null)
  const ids = idsValides(corps && typeof corps === "object" ? (corps as { ids?: unknown }).ids : null)
  if (ids.length === 0) return c.json({ erreur: "Aucune photo à traiter." }, 400)
  const deplacees = await mettrePlusieursALaCorbeille(c.env.DB, ids)
  return c.json({ ids: deplacees })
})

app.post("/api/photos/restauration", async (c) => {
  const corps = await c.req.json().catch(() => null)
  const ids = idsValides(corps && typeof corps === "object" ? (corps as { ids?: unknown }).ids : null)
  if (ids.length === 0) return c.json({ erreur: "Aucune photo à traiter." }, 400)
  const restaurees = await restaurerPlusieurs(c.env.DB, ids)
  return c.json({ ids: restaurees })
})

app.get("/api/photos/:id", async (c) => {
  const photo = await trouverPhoto(c.env.DB, c.req.param("id"))
  if (!photo) return c.json({ erreur: "Photo introuvable." }, 404)
  return c.json(photoVersJson(photo))
})

app.get("/api/photos/:id/miniature", (c) => servirMiniature(c))
app.get("/api/photos/:id/affichage", (c) => servirAffichage(c))
app.get("/api/photos/:id/fichier", (c) => servirFichier(c))

app.post("/api/photos/:id/corbeille", async (c) => {
  const id = c.req.param("id")
  const r = await mettreALaCorbeille(c.env.DB, id)
  if (r === "introuvable") return c.json({ erreur: "Photo introuvable." }, 404)
  if (r === "deja") return c.json({ erreur: "Cette photo est déjà à la corbeille." }, 409)
  const photo = await photoApres(c.env.DB, id)
  if (!photo) return c.json({ erreur: "Photo introuvable." }, 404)
  return c.json(photoVersJson(photo))
})

app.post("/api/photos/:id/restauration", async (c) => {
  const id = c.req.param("id")
  const r = await restaurerPhoto(c.env.DB, id)
  if (r === "introuvable") return c.json({ erreur: "Photo introuvable." }, 404)
  if (r === "deja") return c.json({ erreur: "Cette photo est déjà dans la galerie." }, 409)
  const photo = await photoApres(c.env.DB, id)
  if (!photo) return c.json({ erreur: "Photo introuvable." }, 404)
  return c.json(photoVersJson(photo))
})

app.get("/api/corbeille", async (c) => {
  const photos = await listerCorbeille(c.env.DB)
  return c.json({ photos: photos.map(photoVersJson) })
})

app.post("/api/corbeille/vidage", async (c) => {
  const resultat = await viderCorbeille(c.env)
  return c.json(resultat)
})

function fichiersDuChamp(brut: unknown): File[] {
  const liste = Array.isArray(brut) ? brut : brut ? [brut] : []
  return liste.filter((f): f is File => {
    if (f instanceof File) return true
    return typeof Blob !== "undefined" && f instanceof Blob && typeof (f as File).name === "string"
  })
}

function nombresDuChamp(brut: unknown): number[] {
  const liste = Array.isArray(brut) ? brut : brut != null && brut !== "" ? [brut] : []
  return liste.map((v) => Number(v))
}

async function replisDuFormulaire(
  form: Record<string, unknown>,
  nFichiers: number,
): Promise<Array<RepliNavigateur | undefined>> {
  const minis = fichiersDuChamp(form.derive_miniature)
  const affs = fichiersDuChamp(form.derive_affichage)
  const largeurs = nombresDuChamp(form.derive_largeur)
  const hauteurs = nombresDuChamp(form.derive_hauteur)
  const n = Math.min(nFichiers, minis.length, affs.length, largeurs.length, hauteurs.length)
  const replis: Array<RepliNavigateur | undefined> = Array.from({ length: nFichiers })
  for (let i = 0; i < n; i++) {
    const mini = minis[i]
    const aff = affs[i]
    const largeur = largeurs[i]
    const hauteur = hauteurs[i]
    if (!mini || !aff || !(largeur > 0) || !(hauteur > 0)) continue
    replis[i] = {
      miniature: await mini.arrayBuffer(),
      affichage: await aff.arrayBuffer(),
      largeur,
      hauteur,
    }
  }
  return replis
}

export default app
