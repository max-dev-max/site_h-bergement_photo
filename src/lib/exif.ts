/**
 * Extrait uniquement DateTimeOriginal (ou équivalent) depuis un JPEG EXIF.
 * Pas de GPS, pas de modèle d’appareil. Si absent → null (jamais inventé).
 */
export function extraireDatePriseDeVue(octets: Uint8Array): string | null {
  const brut = lireExifDateTimeOriginal(octets)
  if (!brut) return null
  return normaliserDateExif(brut)
}

function normaliserDateExif(valeur: string): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(valeur.trim())
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  if (y === "0000" || mo === "00" || d === "00") return null
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`
}

function lireExifDateTimeOriginal(octets: Uint8Array): string | null {
  if (octets.length < 4 || octets[0] !== 0xff || octets[1] !== 0xd8) return null

  let i = 2
  while (i + 4 < octets.length) {
    if (octets[i] !== 0xff) break
    const marqueur = octets[i + 1]!
    if (marqueur === 0xda) break
    const taille = (octets[i + 2]! << 8) | octets[i + 3]!
    if (taille < 2 || i + 2 + taille > octets.length) break
    if (marqueur === 0xe1) {
      const segment = octets.subarray(i + 4, i + 2 + taille)
      const date = parserApp1Exif(segment)
      if (date) return date
    }
    i += 2 + taille
  }
  return null
}

function parserApp1Exif(segment: Uint8Array): string | null {
  if (segment.length < 14) return null
  const prefixe = String.fromCharCode(...segment.subarray(0, 6))
  if (prefixe !== "Exif\0\0") return null
  const tiff = segment.subarray(6)
  const le = tiff[0] === 0x49 && tiff[1] === 0x49
  const be = tiff[0] === 0x4d && tiff[1] === 0x4d
  if (!le && !be) return null

  const u16 = (offset: number) =>
    le ? tiff[offset]! | (tiff[offset + 1]! << 8) : (tiff[offset]! << 8) | tiff[offset + 1]!
  const u32 = (offset: number) =>
    le
      ? tiff[offset]! | (tiff[offset + 1]! << 8) | (tiff[offset + 2]! << 16) | (tiff[offset + 3]! << 24)
      : (tiff[offset]! << 24) | (tiff[offset + 1]! << 16) | (tiff[offset + 2]! << 8) | tiff[offset + 3]!

  const ifd0 = u32(4)
  const depuisIfd = (debutIfd: number, tagCherche: number): string | null => {
    if (debutIfd + 2 > tiff.length) return null
    const n = u16(debutIfd)
    for (let k = 0; k < n; k++) {
      const e = debutIfd + 2 + k * 12
      if (e + 12 > tiff.length) return null
      const tag = u16(e)
      if (tag !== tagCherche) continue
      const type = u16(e + 2)
      const count = u32(e + 4)
      const valeurOff = e + 8
      let offset = valeurOff
      if (type === 2 && count > 4) offset = u32(valeurOff)
      if (offset + count > tiff.length) return null
      const brut = String.fromCharCode(...tiff.subarray(offset, offset + count)).replace(/\0/g, "")
      return brut || null
    }
    return null
  }

  const n0 = u16(ifd0)
  let exifIfd: number | null = null
  for (let k = 0; k < n0; k++) {
    const e = ifd0 + 2 + k * 12
    if (e + 12 > tiff.length) break
    if (u16(e) === 0x8769) exifIfd = u32(e + 8)
  }

  if (exifIfd != null) {
    const original = depuisIfd(exifIfd, 0x9003)
    if (original) return original
    const digitalise = depuisIfd(exifIfd, 0x9004)
    if (digitalise) return digitalise
  }
  return depuisIfd(ifd0, 0x0132)
}
