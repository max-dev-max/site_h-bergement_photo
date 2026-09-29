import { describe, expect, it } from "vitest"
import { doitRenouvelerSession, estCheminPublic } from "../../src/middleware/auth"

describe("session et chemins", () => {
  it("ne rend publics que l’entrée, robots et la feuille de styles", () => {
    expect(estCheminPublic("GET", "/entree")).toBe(true)
    expect(estCheminPublic("GET", "/styles.css")).toBe(true)
    expect(estCheminPublic("GET", "/robots.txt")).toBe(true)
    expect(estCheminPublic("GET", "/favicon.ico")).toBe(true)
    expect(estCheminPublic("POST", "/sortie")).toBe(true)
    expect(estCheminPublic("GET", "/galerie.js")).toBe(false)
    expect(estCheminPublic("GET", "/ajout.js")).toBe(false)
    expect(estCheminPublic("GET", "/galerie")).toBe(false)
  })

  it("ne renouvelle pas la session sur les médias ni les fichiers statiques", () => {
    expect(doitRenouvelerSession("GET", "/galerie")).toBe(true)
    expect(doitRenouvelerSession("POST", "/api/photos")).toBe(true)
    expect(doitRenouvelerSession("GET", "/api/photos")).toBe(true)
    expect(doitRenouvelerSession("GET", "/styles.css")).toBe(false)
    expect(doitRenouvelerSession("GET", "/galerie.js")).toBe(false)
    expect(
      doitRenouvelerSession("GET", "/api/photos/11111111-1111-4111-8111-111111111111/miniature"),
    ).toBe(false)
    expect(
      doitRenouvelerSession("GET", "/api/photos/11111111-1111-4111-8111-111111111111/affichage"),
    ).toBe(false)
    expect(
      doitRenouvelerSession("GET", "/api/photos/11111111-1111-4111-8111-111111111111/fichier"),
    ).toBe(false)
    expect(doitRenouvelerSession("GET", "/entree")).toBe(false)
  })
})
