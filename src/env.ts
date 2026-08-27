export type Env = {
  DB: D1Database
  PHOTOS: R2Bucket
  IMAGES?: ImagesBinding
  ASSETS: Fetcher
  FOYER_IDENTIFIANT: string
  FOYER_MOT_DE_PASSE_HASH: string
  SESSION_SECRET: string
  TEST_MIGRATIONS?: { name: string; queries: string[] }[]
}
