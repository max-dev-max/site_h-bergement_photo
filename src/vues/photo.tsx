import type { Photo } from "../photos/types"
import { formatOctets } from "../lib/quota"
import { Layout } from "./layout"
import { textes } from "./textes"

function formaterDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(d)
}

export function PagePhoto(props: { photo: Photo }) {
  const { photo } = props
  const prise = photo.date_prise_de_vue
    ? formaterDate(photo.date_prise_de_vue)
    : textes.datePriseInconnue
  const enCorbeille = photo.etat === "corbeille"

  return (
    <Layout titre={photo.nom_fichier} connecte scripts={["/photo.js"]}>
      <p class="fil">
        <a href={enCorbeille ? "/corbeille" : "/galerie"}>
          {enCorbeille ? textes.corbeille : textes.retourGalerie}
        </a>
      </p>
      <article
        class="vue-photo"
        data-id={photo.id}
        data-confirm={textes.confirmerCorbeille}
      >
        {enCorbeille ? <p class="bandeau-corbeille">{textes.photoEnCorbeille}</p> : null}
        <figure class="cadre-affichage">
          <img
            class="image-entiere"
            src={`/api/photos/${photo.id}/affichage`}
            alt={photo.nom_fichier}
            width={photo.largeur}
            height={photo.hauteur}
          />
        </figure>
        <aside class="infos-photo">
          <h1>{photo.nom_fichier}</h1>
          <dl>
            <dt>{textes.nomFichier}</dt>
            <dd>{photo.nom_fichier}</dd>
            <dt>{textes.dateAjout}</dt>
            <dd>{formaterDate(photo.date_ajout)}</dd>
            <dt>{textes.datePrise}</dt>
            <dd>{prise}</dd>
            <dt>{textes.dimensions}</dt>
            <dd>
              {photo.largeur} × {photo.hauteur}
            </dd>
            <dt>{textes.poids}</dt>
            <dd>{formatOctets(photo.octets)}</dd>
          </dl>
          {enCorbeille ? (
            <div class="gestes">
              <button type="button" id="btn-restaurer" class="bouton">
                {textes.restaurer}
              </button>
            </div>
          ) : (
            <div class="gestes">
              <a class="bouton" href={`/api/photos/${photo.id}/fichier`}>
                {textes.telecharger}
              </a>
              <button type="button" id="btn-corbeille" class="bouton danger">
                {textes.mettreCorbeille}
              </button>
            </div>
          )}
        </aside>
      </article>
    </Layout>
  )
}
