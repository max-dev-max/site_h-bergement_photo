import { describe, expect, it } from "vitest"
import {
  comparerTempsConstant,
  hacherMotDePasse,
  verifierMotDePasse,
} from "../../src/auth/hachage"

describe("hachage", () => {
  it("ne stocke jamais le mot de passe en clair", async () => {
    const clair = "secret-foyer"
    const stocke = await hacherMotDePasse(clair)
    expect(stocke).not.toContain(clair)
    expect(stocke.startsWith("pbkdf2-sha256$")).toBe(true)
  })

  it("accepte le bon mot de passe et refuse un autre", async () => {
    const stocke = await hacherMotDePasse("correct")
    expect(await verifierMotDePasse("correct", stocke)).toBe(true)
    expect(await verifierMotDePasse("incorrect", stocke)).toBe(false)
  })

  it("compare en temps constant deux tableaux de même longueur", () => {
    const a = new Uint8Array([1, 2, 3, 4])
    const b = new Uint8Array([1, 2, 3, 4])
    const c = new Uint8Array([1, 2, 3, 5])
    expect(comparerTempsConstant(a, b)).toBe(true)
    expect(comparerTempsConstant(a, c)).toBe(false)
  })
})
