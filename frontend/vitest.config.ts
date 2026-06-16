import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // v1 calc engine is framework-agnostic pure TS — no DOM env needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
