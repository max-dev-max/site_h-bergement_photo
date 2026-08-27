import path from "node:path"
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers"
import { defineConfig } from "vitest/config"

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"))
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            FOYER_IDENTIFIANT: "foyer",
            FOYER_MOT_DE_PASSE_HASH:
              "pbkdf2-sha256$100000$a1b2c3d4e5f60718293a4b5c6d7e8f90$e06ca8a586a2270fdb19038064c4345a25569d08aa13b893d35b6eba93008c99",
            SESSION_SECRET: "secret-de-test-au-moins-32-caracteres!",
          },
        },
      }),
    ],
    test: {
      setupFiles: ["./tests/apply-migrations.ts"],
      include: ["tests/unit/**/*.test.ts", "tests/contract/**/*.test.ts", "tests/integration/**/*.test.ts"],
    },
  }
})
