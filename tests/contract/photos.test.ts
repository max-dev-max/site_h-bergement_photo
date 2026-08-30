import { SELF } from "cloudflare:test"
import { describe, expect, it } from "vitest"
import { cookieSession, jpegMinimal } from "../helpers"

async function ajouterJpeg(cookie: string): Promise<string> {
  const corps = new FormData()
  corps.append("fichiers", new File([jpegMinimal()], "vacances.jpg", { type: "image/jpeg" }))
  const res = await SELF.fetch("https://exemple.test/api/photos", {
    method: "POST",
    headers: { Cookie: cookie },
    body: corps,
  })
  expect(res.status).toBe(201)
  const data = await res.json<{ photos: { id: string }[] }>()
  return data.photos[0]!.id
}

describe("contrat photos", () => {
  it("refuse un PDF", async () => {
    const cookie = await cookieSession()
    const corps = new FormData()
    corps.append("fichiers", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0])], "x.pdf", { type: "application/pdf" }))
    const res = await SELF.fetch("https://exemple.test/api/photos", {
      method: "POST",
      headers: { Cookie: cookie },
      body: corps,
    })
    expect(res.status).toBe(400)
    const data = await res.json<{ erreur: string }>()
    expect(data.erreur).toMatch(/n’est pas une photo acceptée/)
  })

  it("liste, métadonnées, médias, quota et corbeille", async () => {
    const cookie = await cookieSession()
    const id = await ajouterJpeg(cookie)

    const liste = await SELF.fetch("https://exemple.test/api/photos", { headers: { Cookie: cookie } })
    expect(liste.status).toBe(200)
    const photos = await liste.json<{ photos: { id: string; url_fichier: string | null }[] }>()
    expect(photos.photos.some((p) => p.id === id)).toBe(true)

    const meta = await SELF.fetch(`https://exemple.test/api/photos/${id}`, { headers: { Cookie: cookie } })
    expect(meta.status).toBe(200)

    const miniature = await SELF.fetch(`https://exemple.test/api/photos/${id}/miniature`, {
      headers: { Cookie: cookie },
    })
    expect(miniature.status).toBe(200)
    expect(miniature.headers.get("Cache-Control")).toBe("private, no-store")
    expect(miniature.headers.get("X-Robots-Tag")).toMatch(/noindex/)

    const espace = await SELF.fetch("https://exemple.test/api/espace", { headers: { Cookie: cookie } })
    expect(espace.status).toBe(200)
    const quota = await espace.json<{ octets_plafond: number }>()
    expect(quota.octets_plafond).toBe(9663676416)

    const id2 = await ajouterJpeg(cookie)
    const lot = await SELF.fetch("https://exemple.test/api/photos/corbeille", {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id, id2] }),
    })
    expect(lot.status).toBe(200)
    const lotJson = await lot.json<{ ids: string[] }>()
    expect(lotJson.ids).toEqual(expect.arrayContaining([id, id2]))

    const restoLot = await SELF.fetch("https://exemple.test/api/photos/restauration", {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id, id2] }),
    })
    expect(restoLot.status).toBe(200)

    const corbeille = await SELF.fetch(`https://exemple.test/api/photos/${id}/corbeille`, {
      method: "POST",
      headers: { Cookie: cookie },
    })
    expect(corbeille.status).toBe(200)

    const fichier = await SELF.fetch(`https://exemple.test/api/photos/${id}/fichier`, {
      headers: { Cookie: cookie },
    })
    expect(fichier.status).toBe(409)

    const resto = await SELF.fetch(`https://exemple.test/api/photos/${id}/restauration`, {
      method: "POST",
      headers: { Cookie: cookie },
    })
    expect(resto.status).toBe(200)

    await SELF.fetch(`https://exemple.test/api/photos/${id}/corbeille`, {
      method: "POST",
      headers: { Cookie: cookie },
    })
    const vidage = await SELF.fetch("https://exemple.test/api/corbeille/vidage", {
      method: "POST",
      headers: { Cookie: cookie },
    })
    expect(vidage.status).toBe(200)
    const v = await vidage.json<{ detruites: number; message: string }>()
    expect(v.detruites).toBeGreaterThanOrEqual(1)
  })
})
