import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "BQ Finance — Catat Uangmu",
        short_name: "BQ Finance",
        description: "Aplikasi manajemen keuangan pribadi dan keluarga tanpa ribet.",
        start_url: "/",
        display: "standalone",
        background_color: "#121212",
        theme_color: "#ffffff",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/auth/, /^\/api/]
      }
    })
  ],
  server: {
    port: 5173,
  },
});
