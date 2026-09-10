import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import market from "./api/market.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Server-only: Vite only exposes VITE_* variables to browser bundles.
  for (const key of ["DATABASE_URL", "DEMO_MODE"]) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [
      react(),
      {
        name: "local-market-api",
        configureServer(server) {
          server.middlewares.use("/api/market", market);
        },
        configurePreviewServer(server) {
          server.middlewares.use("/api/market", market);
        },
      },
    ],
  };
});
