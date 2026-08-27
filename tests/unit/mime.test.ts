import { describe, expect, it } from "vitest"
import { typeMimeDepuisMagic, validerFichierImage } from "../../src/lib/mime"

function jpeg(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
}

function png(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
}

function pdf(): Uint8Array {
  return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0, 0, 0, 0])
}

describe("mime / magic bytes", () => {
  it("accepte JPEG et PNG", () => {
    expect(typeMimeDepuisMagic(jpeg())).toBe("image/jpeg")
    expect(typeMimeDepuisMagic(png())).toBe("image/png")
    expect(validerFichierImage(jpeg(), "image/jpeg")).toBe("image/jpeg")
  })

  it("refuse un PDF", () => {
    expect(typeMimeDepuisMagic(pdf())).toBeNull()
    expect(validerFichierImage(pdf(), "application/pdf")).toBeNull()
    expect(validerFichierImage(pdf(), "image/jpeg")).toBeNull()
  })
})
