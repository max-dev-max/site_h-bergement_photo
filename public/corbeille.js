function retirerCartes(ids) {
  for (const id of ids) {
    const carte = document.querySelector(`.carte-corbeille[data-id="${id}"]`)
    if (carte) carte.remove()
  }
  if (!document.querySelector(".carte-corbeille")) {
    document.querySelector(".liste-corbeille")?.remove()
    document.querySelector(".gestes-corbeille")?.remove()
    const vide = document.getElementById("etat-vide-corbeille")
    if (vide) vide.hidden = false
    else window.location.reload()
  }
}

const vidage = document.getElementById("btn-vidage")
if (vidage) {
  vidage.addEventListener("click", async () => {
    const message = vidage.getAttribute("data-confirm") || "Confirmer ?"
    if (!window.confirm(message)) return
    vidage.disabled = true
    const texte = vidage.textContent
    vidage.textContent = "Vidage en cours…"
    try {
      const res = await fetch("/api/corbeille/vidage", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data.erreur || "Action impossible.")
        vidage.disabled = false
        vidage.textContent = texte
        return
      }
      window.location.reload()
    } catch {
      vidage.disabled = false
      vidage.textContent = texte
      window.alert("Action impossible.")
    }
  })
}

const toutRestaurer = document.getElementById("btn-tout-restaurer")
if (toutRestaurer) {
  toutRestaurer.addEventListener("click", async () => {
    const message = toutRestaurer.getAttribute("data-confirm") || "Confirmer ?"
    if (!window.confirm(message)) return
    const ids = [...document.querySelectorAll(".carte-corbeille")]
      .map((el) => el.getAttribute("data-id"))
      .filter(Boolean)
    if (ids.length === 0) return
    toutRestaurer.disabled = true
    try {
      const restaurees = []
      for (let i = 0; i < ids.length; i += 400) {
        const lot = ids.slice(i, i + 400)
        const res = await fetch("/api/photos/restauration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: lot }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          window.alert(data.erreur || "Action impossible.")
          if (restaurees.length) retirerCartes(restaurees)
          return
        }
        restaurees.push(...(data.ids || []))
      }
      retirerCartes(restaurees)
    } finally {
      toutRestaurer.disabled = false
    }
  })
}

document.querySelectorAll(".btn-restaurer").forEach((bouton) => {
  bouton.addEventListener("click", async () => {
    const carte = bouton.closest(".carte-corbeille")
    const id = carte && carte.getAttribute("data-id")
    if (!id) return
    bouton.disabled = true
    const res = await fetch(`/api/photos/${id}/restauration`, { method: "POST" })
    if (res.ok) {
      retirerCartes([id])
      return
    }
    bouton.disabled = false
    const data = await res.json().catch(() => ({}))
    window.alert(data.erreur || "Action impossible.")
  })
})
