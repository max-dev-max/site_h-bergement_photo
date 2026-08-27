import { describe, expect, it } from "vitest"
import { grouperParJour, jourDeRangement, normaliserTri } from "../../src/photos/rangement"
import type { Photo } from "../../src/photos/types"

function photo(id: string, prise: string | null, ajout: string): Photo {
  return {
    id,
    nom_fichier: `${id}.jpg`,
    type_mime: "image/jpeg",
    octets: 10,
    largeur: 1,
    hauteur: 1,
    date_prise_de_vue: prise,
    date_ajout: ajout,
    etat: "active",
    date_corbeille: null,
    cle_original: `originaux/${id}`,
    cle_affichage: `affichage/${id}`,
    cle_miniature: `miniatures/${id}`,
  }
}

describe("rangement par date", () => {
  it("utilise la date de prise de vue, sinon la date d’ajout", () => {
    expect(jourDeRangement(photo("a", "2024-08-15T10:00:00", "2026-08-27T10:00:00Z"))).toBe("2024-08-15")
    expect(jourDeRangement(photo("b", null, "2026-08-27T10:00:00Z"))).toBe("2026-08-27")
  })

  it("regroupe les jours consécutifs identiques", () => {
    const groupes = grouperParJour([
      photo("1", "2026-08-27T12:00:00", "2026-08-27T12:00:00Z"),
      photo("2", null, "2026-08-27T08:00:00Z"),
      photo("3", "2026-08-20T09:00:00", "2026-08-27T09:00:00Z"),
    ])
    expect(groupes).toHaveLength(2)
    expect(groupes[0]?.jour).toBe("2026-08-27")
    expect(groupes[0]?.photos.map((p) => p.id)).toEqual(["1", "2"])
    expect(groupes[1]?.jour).toBe("2026-08-20")
  })

  it("normalise le tri", () => {
    expect(normaliserTri("ancien")).toBe("ancien")
    expect(normaliserTri("recent")).toBe("recent")
    expect(normaliserTri("nimporte")).toBe("recent")
  })
})
