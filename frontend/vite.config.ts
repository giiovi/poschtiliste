import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon-180x180.png",
        "logo.svg",
      ],
      manifest: {
        name: "Poschtilischte",
        short_name: "Poschtilischte",
        description: "Gemeinsame Einkaufslisten mit Poschtilischte verwalten.",
        lang: "de",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#24623a",
        background_color: "#f4f5f2",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        runtimeCaching: [
          {
            // read-only data stays available offline, the network always wins while online
            // the cache name must match OFFLINE_API_CACHE in src/offline/offline-cache.ts
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              /^\/api\/(auth\/me|users|lists(\/.*)?)$/.test(url.pathname),
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "poschtiliste-api",
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/socket.io": { target: "http://localhost:3000", ws: true },
    },
  },
});
