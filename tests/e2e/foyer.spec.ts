import { expect, test } from "@playwright/test"
import { writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const jpegB64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP/EABQQAQAAAAAAAAAAAAAAAAAAACL/2gAIAQEAAT8Af//Z"

function jpegTemp(): string {
  const chemin = join(tmpdir(), `foyer-${Date.now()}.jpg`)
  writeFileSync(chemin, Buffer.from(jpegB64, "base64"))
  return chemin
}

test("SC-001 à SC-006 : foyer privé", async ({ page, browser, request }) => {
  await page.goto("/galerie")
  await expect(page).toHaveURL(/\/entree/)
  await expect(page.locator("img")).toHaveCount(0)

  const robots = await request.get("/robots.txt")
  expect(await robots.text()).toContain("Disallow: /")

  await page.getByLabel("Identifiant").fill("foyer")
  await page.getByLabel("Mot de passe").fill("mot-de-passe-test")
  await page.getByRole("button", { name: "Entrer" }).click()
  await expect(page).toHaveURL(/\/galerie/, { timeout: 60_000 })

  const avant = await page.locator(".vignette").count()
  const fichier = jpegTemp()
  await page.locator("#fichiers").setInputFiles(fichier)
  await expect(page.locator(".vignette")).toHaveCount(avant + 1, { timeout: 30_000 })

  await page.locator(".vignette").first().click()
  await expect(page.locator(".image-entiere")).toBeVisible()
  await expect(page.getByText("Date de prise de vue inconnue")).toBeVisible()

  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("link", { name: "Télécharger" }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.jpg$/i)

  page.once("dialog", (d) => d.accept())
  await page.getByRole("button", { name: "Mettre à la corbeille" }).click()
  await expect(page).toHaveURL(/\/galerie/)

  await page.getByRole("link", { name: "Corbeille" }).click()
  await expect(page.locator(".carte-corbeille").first()).toBeVisible()

  const prive = await browser.newContext()
  const pagePrivee = await prive.newPage()
  await pagePrivee.goto("/galerie")
  await expect(pagePrivee).toHaveURL(/\/entree/)
  const media = await prive.request.get("/api/photos/00000000-0000-4000-8000-000000000001/miniature")
  expect(media.status()).toBe(401)
  const corps = await media.body()
  expect(corps.subarray(0, 3)).not.toEqual(Buffer.from([0xff, 0xd8, 0xff]))
  await prive.close()
})

test("sélection de plusieurs photos vers la corbeille", async ({ page }) => {
  await page.goto("/entree")
  await page.getByLabel("Identifiant").fill("foyer")
  await page.getByLabel("Mot de passe").fill("mot-de-passe-test")
  await page.getByRole("button", { name: "Entrer" }).click()
  await expect(page).toHaveURL(/\/galerie/)

  const avant = await page.locator(".vignette").count()
  await page.locator("#fichiers").setInputFiles([jpegTemp(), jpegTemp()])
  await expect(page.locator(".vignette")).toHaveCount(avant + 2, { timeout: 30_000 })

  await page.locator("#btn-mode-selection").click()
  await expect(page.locator("#barre-selection")).toBeVisible()

  await page.locator(".case-selection").nth(0).click()
  await page.locator(".case-selection").nth(1).click()
  await expect(page.getByText("2 photos sélectionnées")).toBeVisible()

  page.once("dialog", (d) => d.accept())
  await page.locator("#btn-corbeille-selection").click()
  await expect(page).toHaveURL(/\/galerie/)
  await expect(page.locator(".vignette")).toHaveCount(avant)
})

test("rangement par date dans la galerie", async ({ page }) => {
  await page.goto("/entree")
  await page.getByLabel("Identifiant").fill("foyer")
  await page.getByLabel("Mot de passe").fill("mot-de-passe-test")
  await page.getByRole("button", { name: "Entrer" }).click()
  await expect(page).toHaveURL(/\/galerie/)

  if ((await page.locator(".vignette").count()) === 0) {
    await page.locator("#fichiers").setInputFiles(jpegTemp())
    await expect(page.locator(".vignette")).toHaveCount(1, { timeout: 30_000 })
  }

  await expect(page.locator(".titre-jour").first()).toBeVisible()
  await page.locator("#tri-date").selectOption("ancien")
  await expect(page).toHaveURL(/tri=ancien/)
  await expect(page.locator("#tri-date")).toHaveValue("ancien")
  await expect(page.locator(".titre-jour").first()).toBeVisible()
})
