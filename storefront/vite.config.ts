import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Built INTO definitions/, which is what the static host serves. The catalogue and the
// item files already live there, so the page fetches `catalogue.json` beside itself and
// needs no absolute URL to anything.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // DEV serves the generated definitions folder, so the page fetches the real
  // catalogue.json. BUILD copies nothing: the output goes INTO that same folder, and a
  // stale public copy would overwrite the freshly generated catalogue.
  publicDir: command === "serve" ? "../definitions" : false,
  base: "./",
  build: { outDir: "../definitions", emptyOutDir: false },
}));
