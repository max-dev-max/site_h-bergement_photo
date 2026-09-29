import type { Env } from "../env"

export type DerivesImage = {
  miniature: ArrayBuffer
  affichage: ArrayBuffer
  largeur: number
  hauteur: number
  mimeSortie: string
}

export type RepliNavigateur = {
  miniature: ArrayBuffer
  affichage: ArrayBuffer
  largeur: number
  hauteur: number
}

export class ErreurDerives extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ErreurDerives"
  }
}

const OCTETS_MAX_MINIATURE = 2 * 1024 * 1024
const OCTETS_MAX_AFFICHAGE = 8 * 1024 * 1024

export function estAffichableNavigateur(typeMime: string): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(typeMime)
}

function estJpeg(octets: ArrayBuffer): boolean {
  const u = new Uint8Array(octets)
  return u.length >= 3 && u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff
}

export function repliUtilisable(repli?: RepliNavigateur): repli is RepliNavigateur {
  if (!repli) return false
  if (!Number.isFinite(repli.largeur) || !Number.isFinite(repli.hauteur)) return false
  if (repli.largeur < 1 || repli.hauteur < 1 || repli.largeur > 20_000 || repli.hauteur > 20_000) {
    return false
  }
  if (repli.miniature.byteLength < 32 || repli.affichage.byteLength < 32) return false
  if (repli.miniature.byteLength > OCTETS_MAX_MINIATURE) return false
  if (repli.affichage.byteLength > OCTETS_MAX_AFFICHAGE) return false
  return estJpeg(repli.miniature) && estJpeg(repli.affichage)
}

/**
 * Miniature + variante d’affichage, toujours dans un format affichable par le navigateur.
 * 1. Cloudflare Images (JPEG)
 * 2. Repli canvas JPEG validé (magic bytes + taille)
 * 3. Recopie de l’original s’il est déjà JPEG/PNG/WebP/GIF
 * Sinon : échec (pas de HEIC/AVIF dans une balise img).
 */
export async function produireDerives(
  octets: ArrayBuffer,
  typeMime: string,
  env: Env,
  repli?: RepliNavigateur,
): Promise<DerivesImage> {
  if (env.IMAGES) {
    try {
      const via = await viaImages(octets, env.IMAGES)
      if (via.largeur <= 1 && via.hauteur <= 1 && repliUtilisable(repli)) {
        return { ...via, largeur: repli.largeur, hauteur: repli.hauteur }
      }
      return via
    } catch (err) {
      const message = err instanceof Error ? err.message : "images"
      console.error("derives-images", message)
    }
  }

  if (repliUtilisable(repli)) {
    return {
      miniature: repli.miniature,
      affichage: repli.affichage,
      largeur: repli.largeur,
      hauteur: repli.hauteur,
      mimeSortie: "image/jpeg",
    }
  }

  if (estAffichableNavigateur(typeMime)) {
    const dims = dimensionsBasiques(new Uint8Array(octets), typeMime)
    return {
      miniature: octets,
      affichage: octets,
      largeur: dims.largeur,
      hauteur: dims.hauteur,
      mimeSortie: typeMime,
    }
  }

  throw new ErreurDerives("Cette photo n’a pas pu être préparée pour l’affichage.")
}

async function viaImages(octets: ArrayBuffer, images: ImagesBinding): Promise<DerivesImage> {
  const source = images.input(octets)
  let largeur = 1
  let hauteur = 1
  if (typeof source.info === "function") {
    const info = await source.info()
    largeur = Math.max(1, info.width)
    hauteur = Math.max(1, info.height)
  } else {
    const dims = dimensionsBasiques(new Uint8Array(octets), "image/jpeg")
    largeur = dims.largeur
    hauteur = dims.hauteur
  }

  const affichageRes = await images
    .input(octets)
    .transform({ width: 2048, fit: "scale-down" })
    .output({ format: "image/jpeg", quality: 85 })
  const miniatureRes = await images
    .input(octets)
    .transform({ width: 400, height: 400, fit: "cover" })
    .output({ format: "image/jpeg", quality: 70 })

  const affichage = await affichageRes.response().arrayBuffer()
  const miniature = await miniatureRes.response().arrayBuffer()
  if (!estJpeg(affichage) || !estJpeg(miniature)) {
    throw new Error("images-pas-jpeg")
  }
  if (largeur <= 1 && hauteur <= 1) {
    const dims = dimensionsBasiques(new Uint8Array(affichage), "image/jpeg")
    largeur = dims.largeur
    hauteur = dims.hauteur
  }
  return {
    miniature,
    affichage,
    largeur: Math.max(1, largeur),
    hauteur: Math.max(1, hauteur),
    mimeSortie: "image/jpeg",
  }
}

export function dimensionsBasiques(
  octets: Uint8Array,
  typeMime: string,
): { largeur: number; hauteur: number } {
  try {
    if (typeMime === "image/png") return png(octets)
    if (typeMime === "image/gif") return gif(octets)
    if (typeMime === "image/jpeg") return jpeg(octets)
    if (typeMime === "image/webp") return webp(octets)
  } catch {
    /* dimensions inconnues */
  }
  return { largeur: 1, hauteur: 1 }
}

function png(octets: Uint8Array): { largeur: number; hauteur: number } {
  if (octets.length < 24) throw new Error("png")
  const dv = new DataView(octets.buffer, octets.byteOffset, octets.byteLength)
  return { largeur: dv.getUint32(16), hauteur: dv.getUint32(20) }
}

function gif(octets: Uint8Array): { largeur: number; hauteur: number } {
  if (octets.length < 10) throw new Error("gif")
  return { largeur: octets[6]! | (octets[7]! << 8), hauteur: octets[8]! | (octets[9]! << 8) }
}

function webp(octets: Uint8Array): { largeur: number; hauteur: number } {
  if (octets.length < 30) throw new Error("webp")
  const tag = String.fromCharCode(...octets.subarray(12, 16))
  if (tag === "VP8X") {
    const largeur = 1 + (octets[24]! | (octets[25]! << 8) | (octets[26]! << 16))
    const hauteur = 1 + (octets[27]! | (octets[28]! << 8) | (octets[29]! << 16))
    return { largeur, hauteur }
  }
  if (tag === "VP8 ") {
    const largeur = (octets[26]! | (octets[27]! << 8)) & 0x3fff
    const hauteur = (octets[28]! | (octets[29]! << 8)) & 0x3fff
    return { largeur, hauteur }
  }
  if (tag === "VP8L") {
    const bits = octets[21]! | (octets[22]! << 8) | (octets[23]! << 16) | (octets[24]! << 24)
    return { largeur: (bits & 0x3fff) + 1, hauteur: ((bits >> 14) & 0x3fff) + 1 }
  }
  throw new Error("webp")
}

function jpeg(octets: Uint8Array): { largeur: number; hauteur: number } {
  let i = 2
  while (i + 8 < octets.length) {
    if (octets[i] !== 0xff) break
    const m = octets[i + 1]!
    if (m === 0xc0 || m === 0xc1 || m === 0xc2) {
      return { hauteur: (octets[i + 5]! << 8) | octets[i + 6]!, largeur: (octets[i + 7]! << 8) | octets[i + 8]! }
    }
    const taille = (octets[i + 2]! << 8) | octets[i + 3]!
    i += 2 + taille
  }
  throw new Error("jpeg")
}
