import type { Env } from "../env"
import { extraireDatePriseDeVue } from "../lib/exif"
import { ErreurDerives, produireDerives, type RepliNavigateur } from "../lib/images"
import { validerFichierImage } from "../lib/mime"
import { OCTETS_MAX_FICHIER } from "../lib/quota"
import { cleAffichage, cleMiniature, cleOriginal, supprimerObjetsPhoto } from "../lib/r2"
import type { Photo } from "./types"
import { libererOctets, reserverOctets } from "./quota"

export type { RepliNavigateur }

export type EchecAjout = {
  statut: 400 | 413 | 409 | 503
  erreur: string
}

export type ResultatAjout = { ok: true; photos: Photo[] } | { ok: false; echec: EchecAjout }

export async function ajouterPhotos(
  env: Env,
  fichiers: File[],
  replis: Array<RepliNavigateur | undefined> = [],
): Promise<ResultatAjout> {
  if (fichiers.length === 0) {
    return { ok: false, echec: { statut: 400, erreur: "Ce fichier n’est pas une photo acceptée." } }
  }

  const ajoutees: Photo[] = []
  for (let i = 0; i < fichiers.length; i++) {
    const resultat = await ajouterUne(env, fichiers[i]!, replis[i])
    if (!resultat.ok) {
      return resultat
    }
    ajoutees.push(resultat.photo)
  }
  return { ok: true, photos: ajoutees }
}

async function ajouterUne(
  env: Env,
  fichier: File,
  repli?: RepliNavigateur,
): Promise<{ ok: true; photo: Photo } | { ok: false; echec: EchecAjout }> {
  if (fichier.size > OCTETS_MAX_FICHIER) {
    return {
      ok: false,
      echec: { statut: 413, erreur: "La photo dépasse la taille acceptée (50 Mo)." },
    }
  }
  if (fichier.size < 1) {
    return {
      ok: false,
      echec: { statut: 400, erreur: "Ce fichier n’est pas une photo acceptée." },
    }
  }

  const tampon = await fichier.arrayBuffer()
  const octets = new Uint8Array(tampon)
  const mime = validerFichierImage(octets, fichier.type)
  if (!mime) {
    return {
      ok: false,
      echec: { statut: 400, erreur: "Ce fichier n’est pas une photo acceptée." },
    }
  }

  let derives
  try {
    derives = await produireDerives(tampon, mime, env, repli)
  } catch (err) {
    if (err instanceof ErreurDerives) {
      return { ok: false, echec: { statut: 400, erreur: err.message } }
    }
    const message = err instanceof Error ? err.message : "derives"
    console.error("derives", message)
    return {
      ok: false,
      echec: { statut: 400, erreur: "Cette photo n’a pas pu être préparée pour l’affichage." },
    }
  }

  const id = crypto.randomUUID()
  const nom = (fichier.name || "photo").slice(0, 255)
  const maintenant = new Date().toISOString()
  const datePrise = extraireDatePriseDeVue(octets)
  const dateRangement = datePrise ?? maintenant

  const reserve = await reserverOctets(env.DB, fichier.size)
  if (!reserve) {
    return {
      ok: false,
      echec: { statut: 409, erreur: "Il n’y a plus assez de place (9 Go)." },
    }
  }

  try {
    await env.PHOTOS.put(cleOriginal(id), tampon, {
      httpMetadata: { contentType: mime },
    })
    await env.PHOTOS.put(cleAffichage(id), derives.affichage, {
      httpMetadata: { contentType: derives.mimeSortie },
    })
    await env.PHOTOS.put(cleMiniature(id), derives.miniature, {
      httpMetadata: { contentType: derives.mimeSortie },
    })
  } catch (err) {
    await libererOctets(env.DB, fichier.size)
    await supprimerObjetsPhoto(env.PHOTOS, id)
    const message = err instanceof Error ? err.message : "r2"
    console.error("ecriture-r2", message)
    return { ok: false, echec: { statut: 503, erreur: "L’enregistrement a échoué. Réessayez." } }
  }

  const photo: Photo = {
    id,
    nom_fichier: nom,
    type_mime: mime,
    octets: fichier.size,
    largeur: derives.largeur,
    hauteur: derives.hauteur,
    date_prise_de_vue: datePrise,
    date_ajout: maintenant,
    date_rangement: dateRangement,
    etat: "active",
    date_corbeille: null,
    cle_original: cleOriginal(id),
    cle_affichage: cleAffichage(id),
    cle_miniature: cleMiniature(id),
  }

  try {
    await env.DB.prepare(
      `INSERT INTO photo (
        id, nom_fichier, type_mime, octets, largeur, hauteur,
        date_prise_de_vue, date_ajout, date_rangement, etat, date_corbeille,
        cle_original, cle_affichage, cle_miniature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        photo.id,
        photo.nom_fichier,
        photo.type_mime,
        photo.octets,
        photo.largeur,
        photo.hauteur,
        photo.date_prise_de_vue,
        photo.date_ajout,
        photo.date_rangement,
        photo.etat,
        photo.date_corbeille,
        photo.cle_original,
        photo.cle_affichage,
        photo.cle_miniature,
      )
      .run()
  } catch (err) {
    await libererOctets(env.DB, fichier.size)
    await supprimerObjetsPhoto(env.PHOTOS, id)
    const message = err instanceof Error ? err.message : "d1"
    console.error("insertion-photo", message)
    return { ok: false, echec: { statut: 503, erreur: "L’enregistrement a échoué. Réessayez." } }
  }

  return { ok: true, photo }
}
