import { env } from "cloudflare:test"
import { describe, expect, it } from "vitest"
import { OCTETS_MAX_FICHIER, OCTETS_PLAFOND_FOYER } from "../../src/lib/quota"
import { viderCorbeille } from "../../src/photos/corbeille"
import { mettreALaCorbeille } from "../../src/photos/etats"
import { lireEspace, reserverOctets } from "../../src/photos/quota"

describe("quota", () => {
  it("fixe 50 Mo par fichier et 9 Go pour le foyer", () => {
    expect(OCTETS_MAX_FICHIER).toBe(50 * 1024 * 1024)
    expect(OCTETS_PLAFOND_FOYER).toBe(9 * 1024 * 1024 * 1024)
    expect(OCTETS_PLAFOND_FOYER).toBe(9663676416)
  })

  it("refuse un ajout au-delà du plafond", async () => {
    const espace = await lireEspace(env.DB)
    const trop = espace.octets_plafond - espace.octets_utilises + 1
    const ok = await reserverOctets(env.DB, trop)
    expect(ok).toBe(false)
  })

  it("la corbeille ne libère pas de place ; le vidage libère", async () => {
    const id = crypto.randomUUID()
    const octets = 1024
    const maintenant = new Date().toISOString()
    const reserve = await reserverOctets(env.DB, octets)
    expect(reserve).toBe(true)
    await env.DB.prepare(
      `INSERT INTO photo (
        id, nom_fichier, type_mime, octets, largeur, hauteur,
        date_prise_de_vue, date_ajout, etat, date_corbeille,
        cle_original, cle_affichage, cle_miniature
      ) VALUES (?, 'a.jpg', 'image/jpeg', ?, 1, 1, NULL, ?, 'active', NULL, ?, ?, ?)`,
    )
      .bind(id, octets, maintenant, `originaux/${id}`, `affichage/${id}`, `miniatures/${id}`)
      .run()

    const avant = await lireEspace(env.DB)
    await mettreALaCorbeille(env.DB, id)
    const apresCorbeille = await lireEspace(env.DB)
    expect(apresCorbeille.octets_utilises).toBe(avant.octets_utilises)

    const vidage = await viderCorbeille({ DB: env.DB, PHOTOS: env.PHOTOS })
    expect(vidage.detruites).toBe(1)
    const apresVidage = await lireEspace(env.DB)
    expect(apresVidage.octets_utilises).toBe(avant.octets_utilises - octets)
  })
})
