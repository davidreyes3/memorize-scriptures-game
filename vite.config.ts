import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// game/ and srs/ tests need no DOM, so "node" is the lighter default. A future UI test
// pass (React Testing Library) will need environment: "jsdom" for component files.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
  },
});
