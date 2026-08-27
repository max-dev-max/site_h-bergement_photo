import type { JSX } from "hono/jsx"
import { textes } from "./textes"

export function Layout(props: {
  titre: string
  connecte?: boolean
  scripts?: string[]
  children?: JSX.Element
}) {
  return (
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <title>
          {props.titre} — {textes.titreSite}
        </title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header class="bandeau">
          <a class="marque" href={props.connecte ? "/galerie" : "/entree"}>
            {textes.titreSite}
          </a>
          {props.connecte ? (
            <nav class="actions-bandeau">
              <a href="/galerie">{textes.galerie}</a>
              <a href="/corbeille">{textes.corbeille}</a>
              <form method="post" action="/sortie" class="form-sortie">
                <button type="submit">{textes.sortie}</button>
              </form>
            </nav>
          ) : null}
        </header>
        <main>{props.children}</main>
        {(props.scripts ?? []).map((src) => (
          <script src={src}></script>
        ))}
      </body>
    </html>
  )
}
