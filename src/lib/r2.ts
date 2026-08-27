export function cleOriginal(id: string): string {
  return `originaux/${id}`
}

export function cleAffichage(id: string): string {
  return `affichage/${id}`
}

export function cleMiniature(id: string): string {
  return `miniatures/${id}`
}

export async function supprimerObjetsPhoto(
  seau: R2Bucket,
  id: string,
): Promise<void> {
  await Promise.all([
    seau.delete(cleOriginal(id)),
    seau.delete(cleAffichage(id)),
    seau.delete(cleMiniature(id)),
  ])
}

export const EN_TETES_MEDIA = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
} as const
