declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    PHOTOS: R2Bucket
    IMAGES?: ImagesBinding
    ASSETS: Fetcher
    FOYER_IDENTIFIANT: string
    FOYER_MOT_DE_PASSE_HASH: string
    SESSION_SECRET: string
    TEST_MIGRATIONS?: { name: string; queries: string[] }[]
  }
}

interface Env extends Cloudflare.Env {}

interface ImagesBinding {
  input(stream: ReadableStream | ArrayBuffer | ArrayBufferView | Blob): ImageTransformer
}

interface ImageTransformer {
  transform(options: {
    width?: number
    height?: number
    fit?: "scale-down" | "contain" | "cover" | "crop" | "pad"
  }): ImageTransformer
  info(): Promise<{ format: string; width: number; height: number }>
  output(options: { format: "image/jpeg" | "image/webp" | "image/png"; quality?: number }): Promise<{
    response(): Response
  }>
}
