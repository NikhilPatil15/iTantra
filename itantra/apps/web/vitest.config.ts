import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**", "out/**"],
    passWithNoTests: true,
    // Node environment: current tests are pure logic. Component tests that need a DOM should
    // set `// @vitest-environment jsdom` per file once a compatible jsdom is wired.
    environment: "node",
  },
});
