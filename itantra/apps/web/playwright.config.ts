import { defineConfig } from "@playwright/test";

/**
 * Drives the statically exported app against MockBridge. Phone width 390 px, day and night.
 * Run `pnpm --filter web test:e2e` after `pnpm --filter web build`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 4173 --directory out",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
