import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
export default defineConfig({
  server: { port: 8401, strictPort: true },
  preview: { port: 8401, strictPort: true },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules\/(?:react(?:-dom)?|scheduler)\//,
              priority: 30,
            },
            {
              name: "controls",
              test: /node_modules\/(?:@base-ui|@floating-ui)\//,
              priority: 20,
            },
            {
              name: "motion",
              test: /node_modules\/(?:motion|framer-motion|motion-dom|motion-utils)\//,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
