const vue = document.querySelector(".vue-photo")
const bouton = document.getElementById("btn-corbeille")
const restaurer = document.getElementById("btn-restaurer")

if (vue && bouton) {
  bouton.addEventListener("click", async () => {
    const message = vue.getAttribute("data-confirm") || "Confirmer ?"
    if (!window.confirm(message)) return
    const id = vue.getAttribute("data-id")
    const res = await fetch(`/api/photos/${id}/corbeille`, { method: "POST" })
    if (res.ok) {
      window.location.href = "/galerie"
      return
    }
    const data = await res.json().catch(() => ({}))
    window.alert(data.erreur || "Action impossible.")
  })
}

if (vue && restaurer) {
  restaurer.addEventListener("click", async () => {
    const id = vue.getAttribute("data-id")
    restaurer.disabled = true
    const res = await fetch(`/api/photos/${id}/restauration`, { method: "POST" })
    if (res.ok) {
      window.location.href = `/photos/${id}`
      return
    }
    restaurer.disabled = false
    const data = await res.json().catch(() => ({}))
    window.alert(data.erreur || "Action impossible.")
  })
}
