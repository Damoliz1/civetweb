import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Only the student app lives in this repo's web build; keep the C sources out of Vite's way.
  publicDir: "public-app",
  build: { outDir: "dist", emptyOutDir: true },
});
