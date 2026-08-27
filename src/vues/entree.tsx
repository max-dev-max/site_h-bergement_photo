import { Layout } from "./layout"
import { textes } from "./textes"

export function PageEntree(props: { erreur?: string }) {
  return (
    <Layout titre={textes.entreeTitre}>
      <section class="carte-entree">
        <h1>{textes.entreeTitre}</h1>
        <p class="accroche">Identifiant et mot de passe du foyer — les photos restent privées.</p>
        {props.erreur ? <p class="erreur" role="alert">{props.erreur}</p> : null}
        <form method="post" action="/entree" class="form-entree" autocomplete="on">
          <label>
            {textes.identifiant}
            <input type="text" name="identifiant" required autocomplete="username" />
          </label>
          <label>
            {textes.motDePasse}
            <input type="password" name="mot_de_passe" required autocomplete="current-password" />
          </label>
          <button type="submit">{textes.boutonEntrer}</button>
        </form>
      </section>
    </Layout>
  )
}
