export const TYPES_MIME_ACCEPTES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
] as const

export type TypeMimeAccepte = (typeof TYPES_MIME_ACCEPTES)[number]

const MARQUES_HEIF = new Set([
  "heic",
  "heix",
  "heif",
  "heis",
  "heim",
  "hevc",
  "hevx",
  "mif1",
  "msf1",
])

const MARQUES_AVIF = new Set(["avif", "avis", "avio"])

function ascii(octets: Uint8Array, debut: number, fin: number): string {
  return String.fromCharCode(...octets.subarray(debut, fin))
}

export function typeMimeDepuisMagic(octets: Uint8Array): TypeMimeAccepte | null {
  if (octets.length < 12) return null

  if (octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff) {
    return "image/jpeg"
  }

  if (
    octets[0] === 0x89 &&
    octets[1] === 0x50 &&
    octets[2] === 0x4e &&
    octets[3] === 0x47 &&
    octets[4] === 0x0d &&
    octets[5] === 0x0a &&
    octets[6] === 0x1a &&
    octets[7] === 0x0a
  ) {
    return "image/png"
  }

  if (ascii(octets, 0, 6) === "GIF87a" || ascii(octets, 0, 6) === "GIF89a") {
    return "image/gif"
  }

  if (ascii(octets, 0, 4) === "RIFF" && ascii(octets, 8, 12) === "WEBP") {
    return "image/webp"
  }

  if (ascii(octets, 4, 8) === "ftyp") {
    const marque = ascii(octets, 8, 12).replace(/\0/g, "").trim()
    if (MARQUES_AVIF.has(marque)) return "image/avif"
    if (MARQUES_HEIF.has(marque)) {
      return marque.startsWith("hei") ? "image/heic" : "image/heif"
    }
    // Compatibilité : certaines photos HEIF ont une marque compatible plus loin.
    const ftyp = ascii(octets, 8, Math.min(octets.length, 32)).toLowerCase()
    if (ftyp.includes("avif") || ftyp.includes("avis")) return "image/avif"
    if (ftyp.includes("heic") || ftyp.includes("heif") || ftyp.includes("mif1")) {
      return ftyp.includes("heic") ? "image/heic" : "image/heif"
    }
  }

  return null
}

export function mimeDeclareAccepte(declare: string): boolean {
  const normalise = declare.toLowerCase().split(";")[0]?.trim() ?? ""
  return (TYPES_MIME_ACCEPTES as readonly string[]).includes(normalise)
}

export function validerFichierImage(
  octets: Uint8Array,
  mimeDeclare: string,
): TypeMimeAccepte | null {
  const magic = typeMimeDepuisMagic(octets)
  if (!magic) return null
  if (!mimeDeclareAccepte(mimeDeclare) && mimeDeclare !== "" && mimeDeclare !== "application/octet-stream") {
    const declare = mimeDeclare.toLowerCase().split(";")[0]?.trim() ?? ""
    const famillesJpeg = declare === "image/jpg" && magic === "image/jpeg"
    const famillesHeif =
      (declare === "image/heic" || declare === "image/heif") &&
      (magic === "image/heic" || magic === "image/heif")
    if (!famillesJpeg && !famillesHeif && declare !== magic) {
      // On fait confiance aux magic bytes si c’est bien une image acceptée.
      return magic
    }
  }
  return magic
}
