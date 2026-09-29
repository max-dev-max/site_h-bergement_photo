import type { Photo } from "../photos/types"
import { formatOctets } from "../lib/quota"
import { Layout } from "./layout"
import { textes } from "./textes"

function formaterDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d)
}

export function PageCorbeille(props: { photos: Photo[] }) {
  const { photos } = props

  return (
    <Layout titre={textes.corbeille} connecte scripts={["/corbeille.js"]}>
      <section class="barre-galerie">
        <h1>{textes.corbeille}</h1>
        <p class="aide">Les photos ici ne sont pas téléchargeables. Restaurez-les d’abord.</p>
        {photos.length > 0 ? (
          <div class="gestes-corbeille">
            <button
              type="button"
              id="btn-tout-restaurer"
              class="bouton secondaire"
              data-confirm={textes.confirmerToutRestaurer}
            >
              {textes.toutRestaurer}
            </button>
            <button type="button" id="btn-vidage" class="bouton danger" data-confirm={textes.confirmerVidage}>
              {textes.viderCorbeille}
            </button>
          </div>
        ) : null}
      </section>

      <section id="etat-vide-corbeille" class="etat-vide" hidden={photos.length > 0 ? true : undefined}>
        <p>{textes.corbeilleVide}</p>
        <p class="aide">{textes.corbeilleVideAide}</p>
      </section>

      {photos.length > 0 ? (
        <ul class="liste-corbeille">
          {photos.map((photo) => (
            <li class="carte-corbeille" data-id={photo.id}>
              <a href={`/photos/${photo.id}`}>
                <img
                  src={`/api/photos/${photo.id}/miniature`}
                  alt={photo.nom_fichier}
                  width={photo.largeur}
                  height={photo.hauteur}
                />
              </a>
              <div>
                <p class="nom">
                  <a href={`/photos/${photo.id}`}>{photo.nom_fichier}</a>
                </p>
                <p class="meta">
                  {photo.date_prise_de_vue ? formaterDate(photo.date_prise_de_vue) : textes.datePriseInconnue}
                  {" · "}
                  {formatOctets(photo.octets)}
                  {" · "}
                  {photo.largeur} × {photo.hauteur}
                </p>
                <button type="button" class="bouton btn-restaurer">
                  {textes.restaurer}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Layout>
  )
}
