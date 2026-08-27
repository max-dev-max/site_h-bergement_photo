const ITERATIONS = 100_000
const LONGUEUR_CLE = 32

export function comparerTempsConstant(a: Uint8Array, b: Uint8Array): boolean {
  const n = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < n; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

export function comparerChainesTempsConstant(a: string, b: string): boolean {
  return comparerTempsConstant(new TextEncoder().encode(a), new TextEncoder().encode(b))
}

function octetsVersHex(octets: Uint8Array): string {
  return [...octets].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function hexVersOctets(hex: string): Uint8Array | null {
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

async function pbkdf2(motDePasse: string, sel: Uint8Array, iterations: number): Promise<Uint8Array> {
  const cle = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(motDePasse),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sel as BufferSource, iterations },
    cle,
    LONGUEUR_CLE * 8,
  )
  return new Uint8Array(bits)
}

export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  const sel = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(motDePasse, sel, ITERATIONS)
  return `pbkdf2-sha256$${ITERATIONS}$${octetsVersHex(sel)}$${octetsVersHex(hash)}`
}

export async function verifierMotDePasse(motDePasse: string, stocke: string): Promise<boolean> {
  const parties = stocke.split("$")
  if (parties.length !== 4 || parties[0] !== "pbkdf2-sha256") {
    await pbkdf2(motDePasse, new Uint8Array(16), ITERATIONS)
    return false
  }
  const iterations = Number(parties[1])
  if (!Number.isFinite(iterations) || iterations < 1 || iterations > 5_000_000) {
    return false
  }
  const sel = hexVersOctets(parties[2] ?? "")
  const attendu = hexVersOctets(parties[3] ?? "")
  if (!sel || !attendu) return false
  const derive = await pbkdf2(motDePasse, sel, iterations)
  return comparerTempsConstant(derive, attendu)
}
