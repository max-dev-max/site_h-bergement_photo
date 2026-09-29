/**
 * DateTimeOriginal (ou équivalent) depuis JPEG APP1 ou un bloc TIFF
 * « Exif\\0\\0 » (HEIC/AVIF et autres conteneurs).
 * OffsetTimeOriginal est lu s’il existe. Jamais de date inventée.
 */
export function extraireDatePriseDeVue(octets: Uint8Array): string | null {
  const brut = lireExifDateTimeOriginal(octets) ?? chasserExifDansConteneur(octets)
  if (!brut) return null
  return normaliserDateExif(brut.date, brut.decalage)
}

function normaliserDateExif(valeur: string, decalage: string | null): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(valeur.trim())
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  if (y === "0000" || mo === "00" || d === "00") return null
  const base = `${y}-${mo}-${d}T${h}:${mi}:${s}`
  if (decalage && /^[+-]\d{2}:\d{2}$/.test(decalage)) return `${base}${decalage}`
  return base
}

type ExifDates = { date: string; decalage: string | null }

function lireExifDateTimeOriginal(octets: Uint8Array): ExifDates | null {
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

function chasserExifDansConteneur(octets: Uint8Array): ExifDates | null {
  const marque = new TextEncoder().encode("Exif\0\0")
  const limite = Math.min(octets.length - 16, 2_000_000)
  for (let i = 0; i <= limite; i++) {
    let ok = true
    for (let k = 0; k < marque.length; k++) {
      if (octets[i + k] !== marque[k]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const date = parserTiff(octets.subarray(i + 6))
    if (date) return date
  }
  return null
}

function parserApp1Exif(segment: Uint8Array): ExifDates | null {
  if (segment.length < 14) return null
  const prefixe = String.fromCharCode(...segment.subarray(0, 6))
  if (prefixe !== "Exif\0\0") return null
  return parserTiff(segment.subarray(6))
}

function parserTiff(tiff: Uint8Array): ExifDates | null {
  if (tiff.length < 14) return null
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
      if (offset < 0 || offset + count > tiff.length) return null
      const brut = String.fromCharCode(...tiff.subarray(offset, offset + count)).replace(/\0/g, "")
      return brut || null
    }
    return null
  }

  if (ifd0 + 2 > tiff.length) return null
  const n0 = u16(ifd0)
  let exifIfd: number | null = null
  for (let k = 0; k < n0; k++) {
    const e = ifd0 + 2 + k * 12
    if (e + 12 > tiff.length) break
    if (u16(e) === 0x8769) exifIfd = u32(e + 8)
  }

  let date: string | null = null
  let decalage: string | null = null
  if (exifIfd != null) {
    date = depuisIfd(exifIfd, 0x9003) ?? depuisIfd(exifIfd, 0x9004)
    decalage = depuisIfd(exifIfd, 0x9011)
  }
  if (!date) date = depuisIfd(ifd0, 0x0132)
  if (!date) return null
  return { date, decalage: decalage?.trim() || null }
}
