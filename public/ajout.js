const MAX = 50 * 1024 * 1024
const PARALLELE = 3

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

async function enParallele(items, limite, travail) {
  let index = 0
  async function suivant() {
    const i = index++
    if (i >= items.length) return
    await travail(items[i], i)
    await suivant()
  }
  const n = Math.min(limite, items.length)
  await Promise.all(Array.from({ length: n }, () => suivant()))
}

async function envoyerLots(fichiers) {
  const controle = new AbortController()
  const abandon = () => controle.abort()
  window.addEventListener("pagehide", abandon)
  let ok = 0
  let erreurs = 0
  let premiereErreur = ""
  progression(0, fichiers.length)
  try {
    await enParallele(fichiers, PARALLELE, async (fichier) => {
      try {
        await envoyerFichier(fichier, controle.signal)
        ok += 1
      } catch (err) {
        if (err && err.name === "AbortError") throw err
        erreurs += 1
        if (!premiereErreur && err && err.message) premiereErreur = err.message
      }
      progression(ok + erreurs, fichiers.length)
    })
  } finally {
    window.removeEventListener("pagehide", abandon)
  }
  return { ok, erreurs, premiereErreur }
}

async function lancerAjout(liste) {
  if (enCours) return
  const originaux = [...liste]
  if (originaux.length === 0) return
  enCours = true
  try {
    const { ok, erreurs, premiereErreur } = await envoyerLots(originaux)
    if (ok === 0) {
      dire(premiereErreur || "L’ajout a échoué.", true)
      if (barre) barre.hidden = true
      return
    }
    if (erreurs > 0) {
      dire(`${ok} photos ajoutées, ${erreurs} refusées. ${premiereErreur}`.trim())
    } else {
      dire(ok === 1 ? "Photo ajoutée." : `${ok} photos ajoutées.`)
    }
    window.location.reload()
  } catch (err) {
    if (err && err.name === "AbortError") {
      dire("Envoi interrompu : les photos déjà envoyées sont enregistrées.", true)
    } else {
      dire(err && err.message ? err.message : "L’ajout a échoué.", true)
    }
    if (barre) barre.hidden = true
  } finally {
    enCours = false
    if (input) input.value = ""
  }
}

if (form && input) {
  const surChoix = () => {
    void lancerAjout(input.files || [])
  }
  input.addEventListener("change", surChoix)
  input.addEventListener("input", surChoix)

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
    const fichiers = [...(e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [])]
    void lancerAjout(fichiers)
  })
}
