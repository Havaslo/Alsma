import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { URL, fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const GENERATED_ENV_PATH = "AMAZI_ENV_GENERATED.env";

if (existsSync(GENERATED_ENV_PATH)) {
  loadEnvFile(GENERATED_ENV_PATH);
}

const readPort = (): number | undefined => {
  const configuredPort = process.env.PORT?.trim();
  if (!configuredPort) return undefined;

  const port = Number(configuredPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
};

export default defineConfig(() => {
  const port = readPort();
  const previewHost = process.env.AMAZI_PREVIEW_HOST?.trim();

  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes("/node_modules/embla-carousel")) {
              return "carousel";
            }

            if (
              id.includes("/node_modules/framer-motion") ||
              id.includes("/node_modules/motion-dom") ||
              id.includes("/node_modules/motion/")
            ) {
              return "motion";
            }

            return undefined;
          },
        },
      },
    },
    plugins: [tanstackRouter(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    preview: {
      ...(previewHost ? { allowedHosts: [previewHost] } : {}),
      host: "0.0.0.0",
      port,
      strictPort: port !== undefined,
    },
    server: {
      ...(previewHost ? { allowedHosts: [previewHost] } : {}),
      host: "0.0.0.0",
      port,
      strictPort: port !== undefined,
    },
  };
});
