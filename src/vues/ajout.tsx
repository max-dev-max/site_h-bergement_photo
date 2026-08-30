import type { Photo } from "../photos/types"
import { Layout } from "./layout"
import { textes } from "./textes"

export function PageAjout() {
  return (
    <Layout titre={textes.ajouter} connecte scripts={["/ajout.js"]}>
      <section class="carte-entree">
        <h1>{textes.ajouter}</h1>
        <form id="form-ajout" class="form-ajout">
          <label class="bouton-fichier">
            {textes.choisirFichiers}
            <input id="fichiers" type="file" name="fichiers" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif" />
          </label>
          <p class="aide">{textes.formatsAcceptes}</p>
          <p id="statut-ajout" class="statut" hidden></p>
          <div id="barre-envoi" class="barre-envoi" hidden>
            <div id="barre-envoi-plein" class="barre-envoi-plein"></div>
          </div>
        </form>
      </section>
    </Layout>
  )
}

export function PageErreurPhoto() {
  return (
    <Layout titre={textes.photoIntrouvable} connecte>
      <section class="etat-vide">
        <p>{textes.photoIntrouvable}</p>
        <p>
          <a href="/galerie">{textes.retourGalerie}</a>
        </p>
      </section>
    </Layout>
  )
}
