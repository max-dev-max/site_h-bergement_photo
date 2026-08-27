import { SELF } from "cloudflare:test"
import { describe, expect, it } from "vitest"
import { cookieSession, jpegMinimal } from "../helpers"

describe("parcours foyer", () => {
  it("entrée → ajout → galerie → agrandi → téléchargement → corbeille", async () => {
    const anonymeGalerie = await SELF.fetch("https://exemple.test/galerie", { redirect: "manual" })
    expect(anonymeGalerie.status).toBe(302)
    expect(anonymeGalerie.headers.get("Location")).toBe("/entree")

    const cookie = await cookieSession()
    const galerie = await SELF.fetch("https://exemple.test/galerie", { headers: { Cookie: cookie } })
    expect(galerie.status).toBe(200)
    const htmlGalerie = await galerie.text()
    expect(htmlGalerie).toContain("Galerie")

    const corps = new FormData()
    corps.append("fichiers", new File([jpegMinimal()], "salon.jpg", { type: "image/jpeg" }))
    const ajout = await SELF.fetch("https://exemple.test/api/photos", {
      method: "POST",
      headers: { Cookie: cookie },
      body: corps,
    })
    expect(ajout.status).toBe(201)
    const { photos } = await ajout.json<{ photos: { id: string; url_fichier: string | null }[] }>()
    const id = photos[0]!.id

    const page = await SELF.fetch(`https://exemple.test/photos/${id}`, { headers: { Cookie: cookie } })
    expect(page.status).toBe(200)
    expect(await page.text()).toContain("salon.jpg")

    const fichier = await SELF.fetch(`https://exemple.test/api/photos/${id}/fichier`, {
      headers: { Cookie: cookie },
    })
    expect(fichier.status).toBe(200)
    expect(fichier.headers.get("Content-Disposition")).toMatch(/attachment/)
    const bytes = new Uint8Array(await fichier.arrayBuffer())
    expect(bytes[0]).toBe(0xff)
    expect(bytes[1]).toBe(0xd8)

    const corbeille = await SELF.fetch(`https://exemple.test/api/photos/${id}/corbeille`, {
      method: "POST",
      headers: { Cookie: cookie },
    })
    expect(corbeille.status).toBe(200)

    const liste = await SELF.fetch("https://exemple.test/api/photos", { headers: { Cookie: cookie } })
    const actives = await liste.json<{ photos: { id: string }[] }>()
    expect(actives.photos.some((p) => p.id === id)).toBe(false)

    const poubelle = await SELF.fetch("https://exemple.test/api/corbeille", { headers: { Cookie: cookie } })
    const dansCorbeille = await poubelle.json<{ photos: { id: string; url_fichier: string | null }[] }>()
    const item = dansCorbeille.photos.find((p) => p.id === id)
    expect(item).toBeTruthy()
    expect(item?.url_fichier).toBeNull()
  })
})
