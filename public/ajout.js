const MAX = 50 * 1024 * 1024
const RE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i
const MIME_OK = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
])
const CLE_BILAN = "foyer-ajout-bilan"

const form = document.getElementById("form-ajout")
const input = document.getElementById("fichiers")
const statut = document.getElementById("statut-ajout")
const barre = document.getElementById("barre-envoi")
const plein = document.getElementById("barre-envoi-plein")

let enCours = false

function dire(message, erreur) {
  if (!statut) return
  statut.hidden = false
  statut.textContent = message
  statut.classList.toggle("erreur", Boolean(erreur))
}

function progression(faits, total) {
  if (barre && plein) {
    barre.hidden = total === 0
    plein.style.width = total ? `${Math.round((faits / total) * 100)}%` : "0%"
  }
  dire(total <= 1 ? "Envoi en cours…" : `Envoi : ${faits} / ${total}`)
}

function allerGalerie() {
  if (window.location.pathname === "/galerie") {
    window.location.reload()
    return
  }
  window.location.assign("/galerie")
}

function estPhotoPossible(fichier) {
  if (RE_EXT.test(fichier.name || "")) return true
  const type = (fichier.type || "").toLowerCase()
  if (MIME_OK.has(type)) return true
  return type.startsWith("image/")
}

async function envoyerFichier(fichier) {
  if (fichier.size > MAX) {
    throw new Error("La photo dépasse la taille acceptée (50 Mo).")
  }
  const corps = new FormData()
  corps.append("fichiers", fichier, fichier.name || "photo.jpg")
  let res
  try {
    res = await fetch("/api/photos", { method: "POST", body: corps })
  } catch {
    throw new Error("L’envoi n’a pas atteint le site. Vérifiez que le serveur tourne, puis réessayez.")
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.erreur || "L’ajout a échoué.")
  }
}

async function envoyerLots(fichiers) {
  let ok = 0
  let erreurs = 0
  let premiereErreur = ""
  progression(0, fichiers.length)
  for (const fichier of fichiers) {
    try {
      await envoyerFichier(fichier)
      ok += 1
    } catch (err) {
      erreurs += 1
      if (!premiereErreur && err && err.message) premiereErreur = err.message
    }
    progression(ok + erreurs, fichiers.length)
  }
  return { ok, erreurs, premiereErreur }
}

async function lancerAjout(liste) {
  if (enCours) {
    dire("Un envoi est déjà en cours…")
    return
  }
  const tous = [...(liste || [])]
  if (tous.length === 0) {
    dire("Aucune photo n’a été reçue. Réessayez le bouton « Choisir des photos ».", true)
    return
  }
  const originaux = tous.filter(estPhotoPossible)
  const ignores = tous.length - originaux.length
  if (originaux.length === 0) {
    dire(`${ignores} fichier(s) ignoré(s) : ce n’est pas une photo acceptée.`, true)
    return
  }
  enCours = true
  dire(originaux.length <= 1 ? "Envoi en cours…" : `Envoi : 0 / ${originaux.length}`)
  try {
    const { ok, erreurs, premiereErreur } = await envoyerLots(originaux)
    if (ok === 0) {
      dire(premiereErreur || "L’ajout a échoué.", true)
      if (barre) barre.hidden = true
      return
    }
    let message =
      erreurs > 0
        ? `${ok} photos ajoutées, ${erreurs} refusées. ${premiereErreur}`.trim()
        : ok === 1
          ? "Photo ajoutée."
          : `${ok} photos ajoutées.`
    if (ignores > 0) message += ` ${ignores} fichier(s) ignoré(s).`
    sessionStorage.setItem(CLE_BILAN, JSON.stringify({ message, erreur: false }))
    allerGalerie()
  } catch (err) {
    dire(err && err.message ? err.message : "L’ajout a échoué.", true)
    if (barre) barre.hidden = true
  } finally {
    enCours = false
    if (input) input.value = ""
  }
}

window.foyerAjouter = lancerAjout

const brutBilan = sessionStorage.getItem(CLE_BILAN)
if (brutBilan && statut) {
  sessionStorage.removeItem(CLE_BILAN)
  try {
    const bilan = JSON.parse(brutBilan)
    dire(bilan.message || "", Boolean(bilan.erreur))
  } catch {
    dire(brutBilan)
  }
}

if (form) {
  form.addEventListener("submit", (e) => e.preventDefault())
}

document.addEventListener("change", (e) => {
  const cible = e.target
  if (!cible || cible.id !== "fichiers") return
  void lancerAjout(cible.files || [])
})

if (form) {
  ;["dragenter", "dragover"].forEach((type) => {
    form.addEventListener(type, (e) => {
      e.preventDefault()
      form.classList.add("depot")
    })
  })
  ;["dragleave", "drop"].forEach((type) => {
    form.addEventListener(type, (e) => {
      e.preventDefault()
      form.classList.remove("depot")
    })
  })
  form.addEventListener("drop", (e) => {
    void lancerAjout(e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [])
  })
}
