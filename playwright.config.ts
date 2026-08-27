import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:8787",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx wrangler dev --port 8787 --ip 127.0.0.1",
    url: "http://127.0.0.1:8787/robots.txt",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
