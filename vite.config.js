import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/cloud-kitchen-app/", // <-- Required for GitHub Pages
  optimizeDeps: {
    exclude: ["postcss"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("@react-google-maps/api")) return "maps-vendor";

          if (
            id.includes("chart.js") ||
            id.includes("react-chartjs-2") ||
            id.includes("react-countup")
          ) {
            return "charts-vendor";
          }

          if (id.includes("firebase/messaging")) return "firebase-messaging";

          if (id.includes("firebase/storage")) return "firebase-storage";

          if (id.includes("firebase")) return "firebase-core";

          if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf-vendor";

          if (id.includes("papaparse") || id.includes("file-saver")) {
            return "data-export-vendor";
          }

          if (id.includes("framer-motion")) return "motion-vendor";

          if (
            id.includes("react-router") ||
            id.includes("react-dom") ||
            id.includes("/react/")
          ) {
            return "react-vendor";
          }
        },
      },
    },
  },
});
