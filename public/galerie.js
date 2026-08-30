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
        deplacees.push(...(data.ids || lot))
      }
      retirerDeLaGalerie(deplacees)
      selection.clear()
      modeSelection = false
      dernierIndex = -1
      majSelection()
      if (!document.querySelector(".cellule-photo")) {
        window.location.reload()
      }
    } finally {
      btnCorbeille.disabled = selection.size === 0
    }
  })
}

if (btnTelecharger) {
  btnTelecharger.addEventListener("click", async () => {
    if (selection.size === 0) return
    btnTelecharger.disabled = true
    try {
      for (const id of selection) {
        const res = await fetch(`/api/photos/${id}/fichier`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          window.alert(data.erreur || "Téléchargement impossible.")
          return
        }
        const blob = await res.blob()
        const nom = nomDepuisDisposition(res.headers.get("Content-Disposition"), `photo-${id}`)
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = nom
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      btnTelecharger.disabled = selection.size === 0
    }
  })
}

if (grille) majSelection()

const tri = document.getElementById("tri-date")
if (tri && tri.form) {
  tri.addEventListener("change", () => tri.form.submit())
}
