import type { Context } from "hono"
import type { Env } from "../env"
import { comparerChainesTempsConstant, verifierMotDePasse } from "./hachage"
import { creerJeton, enteteEffacerCookie, enteteSetCookie, estHttps } from "./session"
import { PageEntree } from "../vues/entree"
import { textes } from "../vues/textes"

type AppEnv = { Bindings: Env }

async function lireChamps(c: Context<AppEnv>): Promise<{ identifiant: string; mot_de_passe: string }> {
  const type = c.req.header("Content-Type") ?? ""
  if (type.includes("application/json")) {
    const corps = await c.req.json<{ identifiant?: string; mot_de_passe?: string }>()
    return {
      identifiant: (corps.identifiant ?? "").trim(),
      mot_de_passe: corps.mot_de_passe ?? "",
    }
  }
  const form = await c.req.parseBody()
  return {
    identifiant: String(form.identifiant ?? "").trim(),
    mot_de_passe: String(form.mot_de_passe ?? ""),
  }
}

function veutJson(c: Context<AppEnv>): boolean {
  const accept = c.req.header("Accept") ?? ""
  const type = c.req.header("Content-Type") ?? ""
  return type.includes("application/json") || accept.includes("application/json")
}

export async function posterEntree(c: Context<AppEnv>): Promise<Response> {
  const { identifiant, mot_de_passe } = await lireChamps(c)
  if (!identifiant || !mot_de_passe) {
    if (veutJson(c)) {
      return c.json({ erreur: textes.champsVides }, 400)
    }
    return c.html(PageEntree({ erreur: textes.champsVides }), 400)
  }

  const identifiantOk = comparerChainesTempsConstant(identifiant, c.env.FOYER_IDENTIFIANT)
  const motDePasseOk = await verifierMotDePasse(mot_de_passe, c.env.FOYER_MOT_DE_PASSE_HASH)
  if (!identifiantOk || !motDePasseOk) {
    if (veutJson(c)) {
      return c.json({ erreur: textes.identifiantsIncorrects }, 401)
    }
    return c.html(PageEntree({ erreur: textes.identifiantsIncorrects }), 401)
  }

  const jeton = await creerJeton(c.env.SESSION_SECRET)
  c.header("Set-Cookie", enteteSetCookie(jeton, estHttps(c.req.url)))
  return c.redirect("/galerie", 302)
}

export function posterSortie(c: Context<AppEnv>): Response {
  c.header("Set-Cookie", enteteEffacerCookie(estHttps(c.req.url)))
  return c.redirect("/entree", 302)
}
