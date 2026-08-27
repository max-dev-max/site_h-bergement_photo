export const NOM_COOKIE_SESSION = "session"
export const DUREE_INACTIVITE_S = 30 * 60

export type Session = {
  iat: number
  exp: number
}

function versBase64Url(octets: Uint8Array): string {
  let binaire = ""
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function depuisBase64Url(valeur: string): Uint8Array | null {
  try {
    const pad = "=".repeat((4 - (valeur.length % 4)) % 4)
    const b64 = (valeur + pad).replaceAll("-", "+").replaceAll("_", "/")
    const binaire = atob(b64)
    const out = new Uint8Array(binaire.length)
    for (let i = 0; i < binaire.length; i++) out[i] = binaire.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

async function hmac(secret: string, message: Uint8Array): Promise<Uint8Array> {
  const cle = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", cle, message as BufferSource)
  return new Uint8Array(sig)
}

export async function creerJeton(secret: string, maintenantMs = Date.now()): Promise<string> {
  const iat = Math.floor(maintenantMs / 1000)
  const session: Session = { iat, exp: iat + DUREE_INACTIVITE_S }
  return signer(session, secret)
}

export async function renouvelerJeton(
  secret: string,
  session: Session,
  maintenantMs = Date.now(),
): Promise<string> {
  const exp = Math.floor(maintenantMs / 1000) + DUREE_INACTIVITE_S
  return signer({ iat: session.iat, exp }, secret)
}

async function signer(session: Session, secret: string): Promise<string> {
  const corps = new TextEncoder().encode(JSON.stringify(session))
  const signature = await hmac(secret, corps)
  return `${versBase64Url(corps)}.${versBase64Url(signature)}`
}

export async function lireSession(
  jeton: string | undefined,
  secret: string,
  maintenantMs = Date.now(),
): Promise<Session | null> {
  if (!jeton) return null
  const [corpsB64, sigB64] = jeton.split(".")
  if (!corpsB64 || !sigB64) return null
  const corps = depuisBase64Url(corpsB64)
  const sig = depuisBase64Url(sigB64)
  if (!corps || !sig) return null
  const attendu = await hmac(secret, corps)
  if (attendu.length !== sig.length) return null
  let diff = 0
  for (let i = 0; i < attendu.length; i++) diff |= attendu[i]! ^ sig[i]!
  if (diff !== 0) return null
  try {
    const session = JSON.parse(new TextDecoder().decode(corps)) as Session
    if (typeof session.iat !== "number" || typeof session.exp !== "number") return null
    if (session.exp * 1000 <= maintenantMs) return null
    return session
  } catch {
    return null
  }
}

export function attributsCookie(https: boolean, maxAgeS: number): string {
  const parties = ["Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAgeS}`]
  if (https) parties.push("Secure")
  return parties.join("; ")
}

export function enteteSetCookie(jeton: string, https: boolean): string {
  return `${NOM_COOKIE_SESSION}=${jeton}; ${attributsCookie(https, DUREE_INACTIVITE_S)}`
}

export function enteteEffacerCookie(https: boolean): string {
  return `${NOM_COOKIE_SESSION}=; ${attributsCookie(https, 0)}`
}

export function cookieNom(cookieHeader: string | undefined, nomCherche: string): string | undefined {
  if (!cookieHeader) return undefined
  for (const partie of cookieHeader.split(";")) {
    const [nom, ...reste] = partie.trim().split("=")
    if (nom === nomCherche) return reste.join("=")
  }
  return undefined
}

export function cookieDepuisRequete(cookieHeader: string | undefined): string | undefined {
  return cookieNom(cookieHeader, NOM_COOKIE_SESSION)
}

export function estHttps(url: string): boolean {
  return new URL(url).protocol === "https:"
}
