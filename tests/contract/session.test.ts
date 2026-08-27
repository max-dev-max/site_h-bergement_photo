import { SELF } from "cloudflare:test"
import { describe, expect, it } from "vitest"
import { IDENTIFIANT, MOT_DE_PASSE, cookieSession } from "../helpers"

describe("contrat session", () => {
  it("refuse les champs vides", async () => {
    const res = await SELF.fetch("https://exemple.test/entree", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ identifiant: "", mot_de_passe: "" }),
    })
    expect(res.status).toBe(400)
    const corps = await res.json<{ erreur: string }>()
    expect(corps.erreur).toMatch(/remplir/i)
  })

  it("refuse de mauvais identifiants avec un message générique", async () => {
    const res = await SELF.fetch("https://exemple.test/entree", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ identifiant: "x", mot_de_passe: "y" }),
    })
    expect(res.status).toBe(401)
    const corps = await res.json<{ erreur: string }>()
    expect(corps.erreur).toBe("Identifiant ou mot de passe incorrect.")
  })

  it("pose un cookie session et redirige après une entrée valide", async () => {
    const res = await SELF.fetch("https://exemple.test/entree", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `identifiant=${IDENTIFIANT}&mot_de_passe=${MOT_DE_PASSE}`,
      redirect: "manual",
    })
    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe("/galerie")
    expect(res.headers.get("Set-Cookie")).toMatch(/session=/)
    expect(res.headers.get("Set-Cookie")).toMatch(/HttpOnly/i)
    expect(res.headers.get("Set-Cookie")).toMatch(/SameSite=Strict/i)
  })

  it("vide le cookie à la sortie", async () => {
    const cookie = await cookieSession()
    const res = await SELF.fetch("https://exemple.test/sortie", {
      method: "POST",
      headers: { Cookie: cookie },
      redirect: "manual",
    })
    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe("/entree")
    expect(res.headers.get("Set-Cookie")).toMatch(/Max-Age=0/)
  })

  it("renvoie le même 401 anonyme que la ressource existe ou non", async () => {
    const uuid = "00000000-0000-4000-8000-000000000001"
    const a = await SELF.fetch(`https://exemple.test/api/photos/${uuid}`)
    const b = await SELF.fetch(`https://exemple.test/api/photos/${uuid}/miniature`)
    const c = await SELF.fetch(`https://exemple.test/api/photos/${uuid}/fichier`)
    expect(a.status).toBe(401)
    expect(b.status).toBe(401)
    expect(c.status).toBe(401)
    expect(await a.json()).toEqual({ erreur: "Authentification requise." })
    expect(await b.json()).toEqual({ erreur: "Authentification requise." })
    expect(await c.json()).toEqual({ erreur: "Authentification requise." })
    expect(b.headers.get("Content-Type")).not.toMatch(/image\//)
  })
})
