import { describe, expect, it } from "vitest"
import { ErreurDerives, produireDerives, repliUtilisable } from "../../src/lib/images"
import { jpegMinimal } from "../helpers"

describe("dérivés d’image", () => {
  it("refuse un HEIC si Images et canvas sont absents", async () => {
    const octets = new Uint8Array(32).buffer
    const env = {
      IMAGES: { input: () => { throw new Error("images") } },
    }
    await expect(produireDerives(octets, "image/heic", env as never)).rejects.toBeInstanceOf(ErreurDerives)
  })

  it("accepte un repli JPEG validé quand Images échoue", async () => {
    const jpeg = jpegMinimal()
    const copie = jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.byteLength)
    const env = {
      IMAGES: { input: () => { throw new Error("images") } },
    }
    const r = await produireDerives(new Uint8Array(32).buffer, "image/heic", env as never, {
      miniature: copie,
      affichage: copie,
      largeur: 12,
      hauteur: 8,
    })
    expect(r.mimeSortie).toBe("image/jpeg")
    expect(r.largeur).toBe(12)
    expect(r.hauteur).toBe(8)
  })

  it("recopie un JPEG original sans Images ni repli", async () => {
    const jpeg = jpegMinimal()
    const tampon = jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.byteLength)
    const r = await produireDerives(tampon, "image/jpeg", {} as never)
    expect(r.mimeSortie).toBe("image/jpeg")
    expect(r.affichage.byteLength).toBe(jpeg.byteLength)
  })

  it("rejette un repli qui n’est pas un JPEG", () => {
    expect(
      repliUtilisable({
        miniature: new Uint8Array([1, 2, 3, 4]).buffer,
        affichage: new Uint8Array([1, 2, 3, 4]).buffer,
        largeur: 10,
        hauteur: 10,
      }),
    ).toBe(false)
  })
})
