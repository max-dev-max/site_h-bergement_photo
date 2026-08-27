import type { MiddlewareHandler } from "hono"

export const X_ROBOTS_TAG = "noindex, nofollow, noarchive, nosnippet"

export const noindex: MiddlewareHandler = async (c, next) => {
  await next()
  c.header("X-Robots-Tag", X_ROBOTS_TAG)
}
