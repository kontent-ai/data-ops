import { defineConfig } from "vitest/config";

const minute = 60_000;

export default defineConfig({
  test: {
    dir: "tests/integration",
    testTimeout: 5 * minute,
  },
})
