/** Taille maximale d’une photo : 50 Mio. */
export const OCTETS_MAX_FICHIER = 50 * 1024 * 1024

/** Plafond foyer (galerie + corbeille) : 9 Gio. */
export const OCTETS_PLAFOND_FOYER = 9 * 1024 * 1024 * 1024

export function formatOctets(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`
  if (octets < 1024 * 1024 * 1024) return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
  return `${(octets / (1024 * 1024 * 1024)).toFixed(2)} Go`
}
