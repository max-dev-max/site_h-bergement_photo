const CLE = "foyer-galerie-scroll"

history.scrollRestoration = "manual"

const sauve = sessionStorage.getItem(CLE)
if (sauve) {
  window.scrollTo(0, Number(sauve))
}

window.addEventListener("pagehide", () => {
  sessionStorage.setItem(CLE, String(window.scrollY))
})

const grille = document.getElementById("galerie-photos")
const barre = document.getElementById("barre-selection")
const compte = document.getElementById("compte-selection")
const statutSelection = document.getElementById("statut-selection")
const btnMode = document.getElementById("btn-mode-selection")
const btnTout = document.getElementById("btn-tout-selectionner")
const btnAnnuler = document.getElementById("btn-annuler-selection")
const btnTelecharger = document.getElementById("btn-telecharger-selection")
const btnCorbeille = document.getElementById("btn-corbeille-selection")

const selection = new Set()
let modeSelection = false
let dernierIndex = -1

function cellules() {
  return [...document.querySelectorAll(".cellule-photo")]
}

function idsOrdonnes() {
  return cellules().map((el) => el.getAttribute("data-id")).filter(Boolean)
}

function direSelection(message) {
  if (!statutSelection) return
  statutSelection.hidden = !message
  statutSelection.textContent = message || ""
}

function majSelection() {
  const liste = cellules()
  const n = selection.size
  document.body.classList.toggle("mode-selection", modeSelection)

  liste.forEach((cellule) => {
    const id = cellule.getAttribute("data-id")
    const on = selection.has(id)
    cellule.classList.toggle("selectionnee", on)
    const caseSel = cellule.querySelector(".case-selection")
    if (caseSel) caseSel.setAttribute("aria-pressed", on ? "true" : "false")
  })

  if (barre) {
    barre.hidden = !modeSelection
  }
  if (compte && barre) {
    compte.textContent =
      n <= 1 ? barre.getAttribute("data-une") || "1 photo sélectionnée" : `${n} ${barre.getAttribute("data-plusieurs")}`
    if (n === 0 && modeSelection) compte.textContent = "Sélection"
  }
  if (btnTout && barre) {
    const tout = n > 0 && n === liste.length
    btnTout.textContent = tout ? barre.getAttribute("data-detout") : barre.getAttribute("data-tout")
  }
  if (btnTelecharger) btnTelecharger.disabled = n === 0
  if (btnCorbeille) btnCorbeille.disabled = n === 0
}

function basculer(id, etendre) {
  const ordre = idsOrdonnes()
  const index = ordre.indexOf(id)
  if (etendre && dernierIndex >= 0 && index >= 0) {
    const debut = Math.min(dernierIndex, index)
    const fin = Math.max(dernierIndex, index)
    for (let i = debut; i <= fin; i++) selection.add(ordre[i])
  } else if (selection.has(id)) {
    selection.delete(id)
  } else {
    selection.add(id)
  }
  if (index >= 0) dernierIndex = index
  modeSelection = true
  majSelection()
}

function nomDepuisDisposition(entete, repli) {
  if (!entete) return repli
  const etoile = /filename\*=UTF-8''([^;]+)/i.exec(entete)
  if (etoile) {
    try {
      return decodeURIComponent(etoile[1])
    } catch {
      /* ignore */
    }
  }
  const simple = /filename="([^"]+)"/i.exec(entete)
  return simple ? simple[1] : repli
}

function afficherGalerieVide() {
  const contenu = document.querySelector(".galerie-contenu")
  if (contenu) contenu.remove()
  const vide = document.getElementById("etat-vide-galerie")
  if (vide) vide.hidden = false
  const mode = document.getElementById("btn-mode-selection")
  if (mode) mode.remove()
  const tri = document.querySelector(".tri-date")
  if (tri) tri.remove()
}

document.querySelectorAll(".vignette").forEach((lien) => {
  lien.addEventListener("click", (e) => {
    sessionStorage.setItem(CLE, String(window.scrollY))
    if (!modeSelection) return
    e.preventDefault()
    const id = lien.getAttribute("data-id")
    if (id) basculer(id, e.shiftKey)
  })
})

document.querySelectorAll(".case-selection").forEach((bouton) => {
  bouton.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    const cellule = bouton.closest(".cellule-photo")
    const id = cellule && cellule.getAttribute("data-id")
    if (id) basculer(id, e.shiftKey)
  })
})

if (btnMode) {
  btnMode.addEventListener("click", () => {
    modeSelection = true
    majSelection()
  })
}

if (btnTout) {
  btnTout.addEventListener("click", () => {
    const ordre = idsOrdonnes()
    if (selection.size === ordre.length) {
      selection.clear()
    } else {
      ordre.forEach((id) => selection.add(id))
    }
    modeSelection = true
    majSelection()
  })
}

if (btnAnnuler) {
  btnAnnuler.addEventListener("click", () => {
    selection.clear()
    modeSelection = false
    dernierIndex = -1
    majSelection()
    direSelection("")
  })
}

function retirerDeLaGalerie(ids) {
  for (const id of ids) {
    const cellule = document.querySelector(`.cellule-photo[data-id="${id}"]`)
    if (!cellule) continue
    const groupe = cellule.closest(".groupe-date")
    cellule.remove()
    if (groupe && !groupe.querySelector(".cellule-photo")) groupe.remove()
  }
}

if (btnCorbeille && barre) {
  btnCorbeille.addEventListener("click", async () => {
    if (selection.size === 0) return
    const message = barre.getAttribute("data-confirm") || "Confirmer ?"
    if (!window.confirm(message)) return
    const ids = [...selection]
    btnCorbeille.disabled = true
    try {
      const deplacees = []
      for (let i = 0; i < ids.length; i += 400) {
        const lot = ids.slice(i, i + 400)
        const res = await fetch("/api/photos/corbeille", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: lot }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          window.alert(data.erreur || "Action impossible.")
          if (deplacees.length) retirerDeLaGalerie(deplacees)
          return
        }
        deplacees.push(...(data.ids || []))
      }
      retirerDeLaGalerie(deplacees)
      for (const id of deplacees) selection.delete(id)
      modeSelection = false
      dernierIndex = -1
      majSelection()
      if (!document.querySelector(".cellule-photo")) {
        afficherGalerieVide()
      }
    } finally {
      btnCorbeille.disabled = selection.size === 0
    }
  })
}

async function ecrireDansDossier(ids) {
  if (typeof window.showDirectoryPicker !== "function" || ids.length < 2) return false
  let dossier
  try {
    dossier = await window.showDirectoryPicker()
  } catch (err) {
    if (err && err.name === "AbortError") return true
    return false
  }
  const prefixe = (barre && barre.getAttribute("data-telechargement")) || "Téléchargement en cours…"
  let faits = 0
  for (const id of ids) {
    const res = await fetch(`/api/photos/${id}/fichier`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.erreur || "Téléchargement impossible.")
    }
    const nom = nomDepuisDisposition(res.headers.get("Content-Disposition"), `photo-${id}`)
    const handle = await dossier.getFileHandle(nom, { create: true })
    const writable = await handle.createWritable()
    await writable.write(await res.blob())
    await writable.close()
    faits += 1
    direSelection(`${prefixe} ${faits} / ${ids.length}`)
  }
  return true
}

async function telechargerUnParUn(ids) {
  const prefixe = (barre && barre.getAttribute("data-telechargement")) || "Téléchargement en cours…"
  let faits = 0
  for (const id of ids) {
    const res = await fetch(`/api/photos/${id}/fichier`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.erreur || "Téléchargement impossible.")
    }
    const blob = await res.blob()
    const nom = nomDepuisDisposition(res.headers.get("Content-Disposition"), `photo-${id}`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = nom
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    faits += 1
    direSelection(`${prefixe} ${faits} / ${ids.length}`)
    if (ids.length > 1) await new Promise((r) => setTimeout(r, 450))
  }
}

if (btnTelecharger) {
  btnTelecharger.addEventListener("click", async () => {
    if (selection.size === 0) return
    const ids = [...selection]
    btnTelecharger.disabled = true
    const prefixe = (barre && barre.getAttribute("data-telechargement")) || "Téléchargement en cours…"
    direSelection(prefixe)
    try {
      const dossier = await ecrireDansDossier(ids)
      if (!dossier) await telechargerUnParUn(ids)
    } catch (err) {
      window.alert(err && err.message ? err.message : "Téléchargement impossible.")
    } finally {
      direSelection("")
      btnTelecharger.disabled = selection.size === 0
    }
  })
}

if (grille) majSelection()

const tri = document.getElementById("tri-date")
if (tri && tri.form) {
  tri.addEventListener("change", () => tri.form.submit())
}
