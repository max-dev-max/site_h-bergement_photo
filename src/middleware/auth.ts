import type { Context, Next } from "hono"
import type { Env } from "../env"
import type { Session } from "../auth/session"
import {
  cookieDepuisRequete,
  enteteSetCookie,
  estHttps,
  lireSession,
  renouvelerJeton,
} from "../auth/session"

type AppEnv = { Bindings: Env; Variables: { session: Session } }

/** CSS de la page d’entrée + robots : seuls fichiers statiques publics. */
export const FICHIERS_STATIQUES = new Set([
  "/styles.css",
  "/ajout.js",
  "/galerie.js",
  "/photo.js",
  "/corbeille.js",
])

const CHEMINS_PUBLICS = new Set(["/entree", "/robots.txt", "/styles.css", "/favicon.ico"])

export function estCheminPublic(methode: string, chemin: string): boolean {
  if (chemin === "/") return true
  if (CHEMINS_PUBLICS.has(chemin)) return true
  if (methode === "POST" && chemin === "/entree") return true
  if (methode === "POST" && chemin === "/sortie") return true
  return false
}

export function estFichierStatique(chemin: string): boolean {
  return FICHIERS_STATIQUES.has(chemin)
}

/** Pages HTML et mutations : oui. Miniatures, originaux, CSS/JS : non. */
export function doitRenouvelerSession(methode: string, chemin: string): boolean {
  if (estCheminPublic(methode, chemin)) return false
  if (estFichierStatique(chemin)) return false
  if (/^\/api\/photos\/[^/]+\/(miniature|affichage|fichier)$/.test(chemin)) return false
  return true
}

export async function auth(c: Context<AppEnv>, next: Next): Promise<Response | void> {
  const chemin = new URL(c.req.url).pathname

  if (c.req.method === "POST" && chemin === "/sortie") {
    await next()
    return
  }

  if (estCheminPublic(c.req.method, chemin)) {
    const jeton = cookieDepuisRequete(c.req.header("Cookie"))
    const session = await lireSession(jeton, c.env.SESSION_SECRET)
    if (session) c.set("session", session)
    await next()
    return
  }

  const jeton = cookieDepuisRequete(c.req.header("Cookie"))
  const session = await lireSession(jeton, c.env.SESSION_SECRET)
  if (!session) {
    return refuserSansSession(c)
  }

  c.set("session", session)
  if (doitRenouvelerSession(c.req.method, chemin)) {
    const renouvelé = await renouvelerJeton(c.env.SESSION_SECRET, session)
    c.header("Set-Cookie", enteteSetCookie(renouvelé, estHttps(c.req.url)), { append: true })
  }
  await next()
}

export function refuserSansSession(c: Context<AppEnv>): Response {
  const chemin = new URL(c.req.url).pathname
  if (chemin.startsWith("/api/")) {
    return c.json({ erreur: "Authentification requise." }, 401)
  }
  return c.redirect("/entree", 302)
}
