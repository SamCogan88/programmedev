import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { resolve } from "path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

function generateSchemaPlugin(): Plugin {
  return {
    name: "generate-programme-schema",
    buildStart() {
      execFileSync(process.execPath, ["--import", "tsx", "scripts/generate-schema.ts"], {
        cwd: resolve(__dirname),
        stdio: "inherit",
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react({
      // Use automatic JSX runtime for React 17+
      jsxRuntime: "automatic",
    }),
    generateSchemaPlugin(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["color-functions", "global-builtin", "import", "if-function"],
      },
    },
  },
  server: {
    allowedHosts: ["gaming.emu-ordinal.ts.net"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        template: resolve(__dirname, "template.html"),
      },
    },
  },
});
