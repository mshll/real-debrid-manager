import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": decodeURIComponent(new URL("./src", import.meta.url).pathname) } },
  test: { include: ["src/**/*.test.ts"] },
});
