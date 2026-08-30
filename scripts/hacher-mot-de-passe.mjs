#!/usr/bin/env node
import { pbkdf2Sync, randomBytes } from "node:crypto"

const motDePasse = process.argv[2]
if (!motDePasse) {
  console.error("Usage : npm run hacher -- \"ton-mot-de-passe\"")
  process.exit(1)
}

const sel = randomBytes(16)
const hash = pbkdf2Sync(motDePasse, sel, 100_000, 32, "sha256")
const ligne = `pbkdf2-sha256$100000$${sel.toString("hex")}$${hash.toString("hex")}`
console.log(ligne)
console.log("\nColle cette ligne telle quelle dans : npx wrangler secret put FOYER_MOT_DE_PASSE_HASH")
