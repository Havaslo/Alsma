import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { URL, fileURLToPath } from "node:url";
import { type ProxyOptions, type ServerOptions, defineConfig } from "vite";

const GENERATED_ENV_PATH = "AMAZI_ENV_GENERATED.env";

if (existsSync(GENERATED_ENV_PATH)) {
  loadEnvFile(GENERATED_ENV_PATH);
}

const DEFAULT_BACKEND_PROXY_TARGET = "http://localhost:3000";

export const createBackendProxyServerConfig = (
  configuredTarget?: string,
): Pick<ServerOptions, "proxy"> => {
  const target = configuredTarget?.trim() || DEFAULT_BACKEND_PROXY_TARGET;
  const proxy: ProxyOptions = {
    changeOrigin: true,
    target,
  };

  return {
    proxy: {
      "/api": proxy,
    },
  };
};

export default defineConfig(() => {
  const backendProxyTarget = process.env.BACKEND_PROXY_TARGET;
  const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "";

  return {
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: createBackendProxyServerConfig(backendProxyTarget),
  };
});
