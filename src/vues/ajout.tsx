import type { Photo } from "../photos/types"
import { Layout } from "./layout"
import { textes } from "./textes"

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
