import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Bütün test faylları eyni Neon `test` branch-ını paylaşır — paralel
    // işləsələr bir-birinin datasını silərlər
    fileParallelism: false,
    // Baza artıq şəbəkədədir (Frankfurt) — hər sorğu ~50ms
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
