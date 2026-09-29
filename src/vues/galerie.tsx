import type { Espace, Photo } from "../photos/types"
import type { TriGalerie } from "../photos/rangement"
import { grouperParJour } from "../photos/rangement"
import { formatOctets } from "../lib/quota"
import { Layout } from "./layout"
import { textes } from "./textes"

const MINIATURES_EAGER = 24

function Vignette(props: { photo: Photo; prioritaire: boolean }) {
  const { photo, prioritaire } = props
  const url = `/api/photos/${photo.id}/miniature`
  return (
    <li class="cellule-photo" data-id={photo.id}>
      <a class="vignette" href={`/photos/${photo.id}`} data-id={photo.id}>
        <img
          src={url}
          alt={photo.nom_fichier}
          width={photo.largeur}
          height={photo.hauteur}
          loading={prioritaire ? "eager" : "lazy"}
          decoding="async"
        />
      </a>
      <button
        type="button"
        class="case-selection"
        aria-label={`${textes.selectionner} ${photo.nom_fichier}`}
        aria-pressed="false"
      ></button>
    </li>
  )
}

export function PageGalerie(props: { photos: Photo[]; espace: Espace; tri: TriGalerie }) {
  const { photos, espace, tri } = props
  const pourcentage = Math.min(100, Math.round((espace.octets_utilises / espace.octets_plafond) * 100))
  const groupes = grouperParJour(photos)
  let rang = 0

  return (
    <Layout titre={textes.galerie} connecte scripts={["/galerie.js", "/ajout.js"]}>
      <section class="barre-galerie">
        <h1>{textes.galerie}</h1>
        <p class="quota">
          {textes.espaceUtilise} : {formatOctets(espace.octets_utilises)} / {formatOctets(espace.octets_plafond)} ({pourcentage} %)
        </p>
        {espace.octets_corbeille > 0 ? (
          <p class="aide quota-corbeille">
            {formatOctets(espace.octets_corbeille)} {textes.quotaCorbeille}
          </p>
        ) : null}
        <div class="actions-galerie">
          <form
            id="form-ajout"
            class="form-ajout"
            method="post"
            action="/api/photos"
            enctype="multipart/form-data"
            data-interrompu={textes.envoiInterrompu}
            data-ignores={textes.fichiersIgnores}
          >
            <label class="bouton-fichier">
              <span>{textes.choisirFichiers}</span>
              <input
                id="fichiers"
                class="bouton-fichier-input"
                type="file"
                name="fichiers"
                multiple
                accept="image/*,.heic,.heif,.avif"
              />
            </label>
            {photos.length > 0 ? (
              <button type="button" id="btn-mode-selection" class="bouton secondaire">
                {textes.selectionner}
              </button>
            ) : null}
            <p class="aide">{textes.formatsAcceptes}</p>
            <p id="statut-ajout" class="statut" hidden></p>
            <div id="barre-envoi" class="barre-envoi" hidden>
              <div id="barre-envoi-plein" class="barre-envoi-plein"></div>
            </div>
          </form>
          {photos.length > 0 ? (
            <form class="tri-date" method="get" action="/galerie">
              <label>
                {textes.rangement}
                <select id="tri-date" name="tri">
                  <option value="recent" selected={tri === "recent" ? true : undefined}>
                    {textes.plusRecentes}
                  </option>
                  <option value="ancien" selected={tri === "ancien" ? true : undefined}>
                    {textes.plusAnciennes}
                  </option>
                </select>
              </label>
            </form>
          ) : null}
        </div>
      </section>

      <section id="etat-vide-galerie" class="etat-vide" hidden={photos.length > 0 ? true : undefined}>
        <p>{textes.aucunePhoto}</p>
        <p class="aide">{textes.aucunePhotoAide}</p>
      </section>

      {photos.length > 0 ? (
        <div class="galerie-contenu">
          <div
            id="barre-selection"
            class="barre-selection"
            hidden
            data-confirm={textes.confirmerCorbeillePlusieurs}
            data-une={textes.unePhotoSelectionnee}
            data-plusieurs={textes.photosSelectionnees}
            data-tout={textes.toutSelectionner}
            data-detout={textes.toutDeselectionner}
            data-telechargement={textes.telechargerEnCours}
          >
            <p id="compte-selection" class="compte-selection"></p>
            <p id="statut-selection" class="statut" hidden></p>
            <div class="gestes-selection">
              <button type="button" id="btn-tout-selectionner" class="bouton secondaire">
                {textes.toutSelectionner}
              </button>
              <button type="button" id="btn-annuler-selection" class="bouton secondaire">
                {textes.annulerSelection}
              </button>
              <button type="button" id="btn-telecharger-selection" class="bouton">
                {textes.telecharger}
              </button>
              <button type="button" id="btn-corbeille-selection" class="bouton danger">
                {textes.mettreCorbeille}
              </button>
            </div>
          </div>
          <div id="galerie-photos">
            {groupes.map((groupe) => (
              <section class="groupe-date">
                <h2 class="titre-jour">{groupe.libelle}</h2>
                <ul class="grille">
                  {groupe.photos.map((photo) => {
                    const prioritaire = rang < MINIATURES_EAGER
                    rang += 1
                    return <Vignette photo={photo} prioritaire={prioritaire} />
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </Layout>
  )
}
