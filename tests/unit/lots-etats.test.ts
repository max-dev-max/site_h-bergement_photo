import { env } from "cloudflare:test"
import { describe, expect, it } from "vitest"
import { idsValides, mettrePlusieursALaCorbeille, restaurerPlusieurs } from "../../src/photos/etats"
import { reserverOctets } from "../../src/photos/quota"

describe("lots corbeille", () => {
  it("garde seulement des UUID distincts", () => {
    const a = "11111111-1111-4111-8111-111111111111"
    expect(idsValides([a, a, "pas-un-id", 3])).toEqual([a])
    expect(idsValides({ ids: [a] })).toEqual([])
  })

  it("déplace et restaure plusieurs photos d’un coup", async () => {
    const maintenant = new Date().toISOString()
    const ids = [crypto.randomUUID(), crypto.randomUUID()]
    for (const id of ids) {
      expect(await reserverOctets(env.DB, 16)).toBe(true)
      await env.DB.prepare(
        `INSERT INTO photo (
          id, nom_fichier, type_mime, octets, largeur, hauteur,
          date_prise_de_vue, date_ajout, etat, date_corbeille,
          cle_original, cle_affichage, cle_miniature
        ) VALUES (?, 'lot.jpg', 'image/jpeg', 16, 1, 1, NULL, ?, 'active', NULL, ?, ?, ?)`,
      )
        .bind(id, maintenant, `originaux/${id}`, `affichage/${id}`, `miniatures/${id}`)
        .run()
    }

    const deplacees = await mettrePlusieursALaCorbeille(env.DB, ids)
    expect(deplacees.sort()).toEqual([...ids].sort())
    const enCorbeille = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM photo WHERE etat = 'corbeille' AND id IN (?, ?)",
    )
      .bind(ids[0], ids[1])
      .first<{ n: number }>()
    expect(Number(enCorbeille?.n)).toBe(2)

    const restaurees = await restaurerPlusieurs(env.DB, ids)
    expect(restaurees.sort()).toEqual([...ids].sort())
    const actives = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM photo WHERE etat = 'active' AND id IN (?, ?)",
    )
      .bind(ids[0], ids[1])
      .first<{ n: number }>()
    expect(Number(actives?.n)).toBe(2)
  })

  it("n’invente pas d’id dans un lot", async () => {
    const fantome = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    const deplacees = await mettrePlusieursALaCorbeille(env.DB, [fantome])
    expect(deplacees).toEqual([])
  })

  it("accepte un UUID hors RFC strict (variante Microsoft)", () => {
    expect(idsValides(["00000000-0000-0000-0000-000000000000"])).toEqual([
      "00000000-0000-0000-0000-000000000000",
    ])
  })
})
