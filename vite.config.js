import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export function stripConsoleInProd() {
  return {
    name: "strip-console-in-prod",
    apply: "build",
    enforce: "post",
    transform(code, id) {
      const normalized = id.split("\\").join("/");
      if (!normalized.includes("/src/") || /\.test\.(js|jsx|ts|tsx)$/.test(normalized)) {
        return null;
      }
      return {
        code: code.replace(/\bconsole\.(?:error|warn)\s*\(/g, "/* DROPPED_console */ ("),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    stripConsoleInProd(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-512.png",
        "icons/apple-touch-icon.png",
      ],
      manifest: {
        name: "BQ Finance — Catat Uangmu",
        short_name: "BQ Finance",
        description: "Aplikasi manajemen keuangan pribadi dan keluarga tanpa ribet.",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#00ab6b",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/auth/, /^\/api/],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const nid = id.split("\\").join("/");
          if (
            nid.includes("/node_modules/react/") ||
            nid.includes("/node_modules/react-dom/") ||
            nid.includes("/node_modules/scheduler/")
          )
            return "react";
          if (nid.includes("/node_modules/recharts/") || nid.includes("/node_modules/d3-")) return "charts";
          if (nid.includes("/node_modules/@supabase/")) return "supabase";
          if (
            nid.includes("/node_modules/jspdf/") ||
            nid.includes("/node_modules/jspdf-autotable/") ||
            nid.includes("/node_modules/html2canvas/")
          )
            return "pdf";
          if (nid.includes("/node_modules/lucide-react/")) return "icons";
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    include: ["src/**/*.test.{ts,tsx,js,jsx}"],
  },
});
