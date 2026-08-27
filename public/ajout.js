const MAX = 50 * 1024 * 1024

const form = document.getElementById("form-ajout")
const input = document.getElementById("fichiers")
const statut = document.getElementById("statut-ajout")

function dire(message, erreur) {
  if (!statut) return
  statut.hidden = false
  statut.textContent = message
  statut.classList.toggle("erreur", Boolean(erreur))
}

async function envoyerFichier(fichier, signal) {
  if (fichier.size > MAX) {
    throw new Error("La photo dépasse la taille acceptée (50 Mo).")
  }
  const corps = new FormData()
  corps.append("fichiers", fichier, fichier.name)
  const res = await fetch("/api/photos", { method: "POST", body: corps, signal })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.erreur || "L’ajout a échoué.")
  }
}

if (form && input) {
  input.addEventListener("change", async () => {
    const fichiers = [...(input.files || [])]
    if (fichiers.length === 0) return
    const controle = new AbortController()
    const abandon = () => controle.abort()
    window.addEventListener("pagehide", abandon)
    dire("Envoi en cours…")
    try {
      for (const fichier of fichiers) {
        await envoyerFichier(fichier, controle.signal)
      }
      window.location.href = "/galerie"
    } catch (err) {
      if (err && err.name === "AbortError") {
        dire("Envoi interrompu : la photo n’a pas été enregistrée.", true)
      } else {
        dire(err && err.message ? err.message : "L’ajout a échoué.", true)
      }
    } finally {
      window.removeEventListener("pagehide", abandon)
      input.value = ""
    }
  })
}
