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

  return (
    <Layout titre={photo.nom_fichier} connecte scripts={["/photo.js"]}>
      <p class="fil">
        <a href="/galerie">{textes.retourGalerie}</a>
      </p>
      <article class="vue-photo" data-id={photo.id} data-confirm={textes.confirmerCorbeille}>
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
          {photo.etat === "active" ? (
            <div class="gestes">
              <a class="bouton" href={`/api/photos/${photo.id}/fichier`}>
                {textes.telecharger}
              </a>
              <button type="button" id="btn-corbeille" class="bouton danger">
                {textes.mettreCorbeille}
              </button>
            </div>
          ) : null}
        </aside>
      </article>
    </Layout>
  )
}
