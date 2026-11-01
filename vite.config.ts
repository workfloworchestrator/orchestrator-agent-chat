import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import pkg from "./package.json" with { type: "json" };

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The package: one ES module and one stylesheet (the types come from tsc). React and the
// dependencies stay the host's, installed once and deduplicated with its own.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: { entry: here("./src/index.ts"), formats: ["es"], fileName: "wfo-chat", cssFileName: "wfo-chat" },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", ...Object.keys(pkg.dependencies), /^@ag-ui\//],
    },
    outDir: "dist",
  },
});
