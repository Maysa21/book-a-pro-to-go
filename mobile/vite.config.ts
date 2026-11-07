import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const mobileDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(mobileDir, "..");

// Phone-only build: a static single-page bundle the Android WebView can load
// from inside the app. The web app keeps its own server build (vite.config.ts).
export default defineConfig({
  root: mobileDir,
  envDir: projectRoot,
  base: "./",
  plugins: [
    tsConfigPaths({ projects: [path.join(projectRoot, "tsconfig.json")] }),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: false,
      routesDirectory: path.join(projectRoot, "src/routes"),
      generatedRouteTree: path.join(projectRoot, "src/routeTree.gen.ts"),
    }),
    tailwindcss(),
    react(),
  ],
  build: {
    outDir: path.join(projectRoot, "dist-mobile"),
    emptyOutDir: true,
  },
});
