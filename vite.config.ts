import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// game/ and srs/ tests need no DOM, so "node" is the lighter default. A future UI test
// pass (React Testing Library) will need environment: "jsdom" for component files.
export default defineConfig({
  // GitHub Pages serves a project site from /<repo-name>/, not the domain root, so every
  // asset URL Vite emits needs this prefix or the deployed build 404s on its own JS/CSS/fonts.
  base: "/memorize-scriptures-game/",
  plugins: [react()],
  test: {
    environment: "node",
  },
});
