import type { MiddlewareHandler } from "hono"
import type { Env } from "../env"
import type { Session } from "../auth/session"

export const erreurs: MiddlewareHandler<{ Bindings: Env; Variables: { session: Session } }> = async (
  c,
  next,
) => {
  try {
    await next()
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur inconnue"
    console.error("erreur-technique", message)
    const chemin = new URL(c.req.url).pathname
    if (chemin.startsWith("/api/")) {
      return c.json({ erreur: "Une erreur est survenue." }, 500)
    }
    return c.text("Une erreur est survenue.", 500)
  }
}
