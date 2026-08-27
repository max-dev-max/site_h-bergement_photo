import { SELF } from "cloudflare:test"

export const IDENTIFIANT = "foyer"
export const MOT_DE_PASSE = "mot-de-passe-test"

export async function cookieSession(): Promise<string> {
  const res = await SELF.fetch("https://exemple.test/entree", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `identifiant=${encodeURIComponent(IDENTIFIANT)}&mot_de_passe=${encodeURIComponent(MOT_DE_PASSE)}`,
    redirect: "manual",
  })
  const setCookie = res.headers.get("Set-Cookie") ?? ""
  const session = setCookie.split(";")[0]
  if (!session || !session.startsWith("session=")) {
    throw new Error(`pas de cookie session (statut ${res.status})`)
  }
  return session
}

export function jpegMinimal(): Uint8Array {
  const b64 =
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP/EABQQAQAAAAAAAAAAAAAAAAAAACL/2gAIAQEAAT8Af//Z"
  const binaire = atob(b64)
  const out = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) out[i] = binaire.charCodeAt(i)
  return out
}
