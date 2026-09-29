import { describe, expect, it } from "vitest"
import { extraireDatePriseDeVue } from "../../src/lib/exif"

function tamponTiffDateHeure(): Uint8Array {
  const date = "2020:01:02 03:04:05\0"
  const tiff = new Uint8Array(46)
  tiff[0] = 0x49
  tiff[1] = 0x49
  tiff[2] = 0x2a
  tiff[3] = 0x00
  tiff[4] = 8
  tiff[8] = 1
  tiff[10] = 0x32
  tiff[11] = 0x01
  tiff[12] = 2
  tiff[14] = 20
  tiff[18] = 26
  new TextEncoder().encodeInto(date, tiff.subarray(26))
  return tiff
}

describe("date EXIF", () => {
  it("lit un bloc Exif hors JPEG (conteneur HEIC-like)", () => {
    const tiff = tamponTiffDateHeure()
    const prefixe = new TextEncoder().encode("ftypheicxxxxExif\0\0")
    const brut = new Uint8Array(prefixe.length + tiff.length)
    brut.set(prefixe, 0)
    brut.set(tiff, prefixe.length)
    expect(extraireDatePriseDeVue(brut)).toBe("2020-01-02T03:04:05")
  })

  it("ne fabrique pas de date sur un tampon vide", () => {
    expect(extraireDatePriseDeVue(new Uint8Array(8))).toBeNull()
  })
})
