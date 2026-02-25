import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    clearMocks: true,
    restoreMocks: true,
  },
});
