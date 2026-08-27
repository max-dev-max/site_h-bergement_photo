const vidage = document.getElementById("btn-vidage")
if (vidage) {
  vidage.addEventListener("click", async () => {
    const message = vidage.getAttribute("data-confirm") || "Confirmer ?"
    if (!window.confirm(message)) return
    const res = await fetch("/api/corbeille/vidage", { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      window.alert(data.erreur || "Action impossible.")
      return
    }
    window.location.reload()
  })
}

document.querySelectorAll(".btn-restaurer").forEach((bouton) => {
  bouton.addEventListener("click", async () => {
    const carte = bouton.closest(".carte-corbeille")
    const id = carte && carte.getAttribute("data-id")
    if (!id) return
    const res = await fetch(`/api/photos/${id}/restauration`, { method: "POST" })
    if (res.ok) {
      window.location.reload()
      return
    }
    const data = await res.json().catch(() => ({}))
    window.alert(data.erreur || "Action impossible.")
  })
})
