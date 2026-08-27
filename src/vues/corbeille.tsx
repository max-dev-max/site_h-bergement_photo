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
          <button type="button" id="btn-vidage" class="bouton danger" data-confirm={textes.confirmerVidage}>
            {textes.viderCorbeille}
          </button>
        ) : null}
      </section>

      {photos.length === 0 ? (
        <section class="etat-vide">
          <p>{textes.corbeilleVide}</p>
          <p class="aide">{textes.corbeilleVideAide}</p>
        </section>
      ) : (
        <ul class="liste-corbeille">
          {photos.map((photo) => (
            <li class="carte-corbeille" data-id={photo.id}>
              <img
                src={`/api/photos/${photo.id}/miniature`}
                alt={photo.nom_fichier}
                width={photo.largeur}
                height={photo.hauteur}
              />
              <div>
                <p class="nom">{photo.nom_fichier}</p>
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
      )}
    </Layout>
  )
}
