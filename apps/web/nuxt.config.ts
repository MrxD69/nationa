import { fileURLToPath } from "node:url";

const apiReference = { path: fileURLToPath(new URL("../../packages/api", import.meta.url)) };

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  typescript: {
    tsConfig: { references: [apiReference] },
    nodeTsConfig: { references: [apiReference] },
    sharedTsConfig: { references: [apiReference] },
  },
  compatibilityDate: "latest",
  devtools: { enabled: true },
  experimental: {
    payloadExtraction: "client",
  },
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  devServer: {
    port: 3001,
  },
  nitro: {
    typescript: {
      tsConfig: { references: [apiReference] },
    },
  },
  runtimeConfig: {
    // server-side override for SSR fetches (NUXT_SERVER_URL); falls back to the public URL
    serverUrl: "",
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL ?? "",
    },
  },
});
