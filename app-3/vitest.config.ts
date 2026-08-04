import react from "@vitejs/plugin-react";
import { URL, fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      "**/*.e2e.{spec,test}.{js,jsx,ts,tsx}",
    ],
    passWithNoTests: true,
  },
});
