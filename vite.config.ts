import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [tanstackRouter(), react(), tailwindcss()],
  publicDir: "static",
  resolve: {
    alias: {
      "@": "/src",
      "@opencode-ai/sdk/server": "/src/empty-module.ts",
    },
  },
  optimizeDeps: {
    exclude: ["@opencode-ai/sdk/server"],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
