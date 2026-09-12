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
  modules: ["@nuxt/ui", "@nuxtjs/i18n", "@nuxtjs/supabase"],
  css: ["~/assets/css/main.css"],
  // White-mode-first: default to light while keeping the toggle usable.
  colorMode: {
    preference: "light",
    fallback: "light",
    classSuffix: "",
  },
  routeRules: {
    // The AI assistant now lives in the unified shell's panel, open by default.
    "/ai": { redirect: "/" },
    "/assistant": { redirect: "/" },
  },
  i18n: {
    strategy: "no_prefix",
    defaultLocale: "fr",
    defaultDirection: "ltr",
    langDir: "locales",
    locales: [
      {
        code: "fr",
        name: "Français",
        language: "fr",
        dir: "ltr",
        files: [
          "fr/common.json",
          "fr/onboarding.json",
          "fr/companies.json",
          "fr/cases.json",
          "fr/documents.json",
          "fr/checks.json",
          "fr/submissions.json",
          "fr/officer.json",
          "fr/assistant.json",
          "fr/auth.json",
          "fr/invoices.json",
          "fr/filings.json",
          "fr/actions.json",
          "fr/docgen.json",
          "fr/shell.json",
          "fr/settings.json",
          "fr/help.json",
          "fr/notifications.json",
        ],
      },
      {
        code: "ar",
        name: "العربية",
        language: "ar",
        dir: "rtl",
        files: [
          "ar/common.json",
          "ar/onboarding.json",
          "ar/companies.json",
          "ar/cases.json",
          "ar/documents.json",
          "ar/checks.json",
          "ar/submissions.json",
          "ar/officer.json",
          "ar/assistant.json",
          "ar/auth.json",
          "ar/invoices.json",
          "ar/filings.json",
          "ar/actions.json",
          "ar/docgen.json",
          "ar/shell.json",
          "ar/settings.json",
          "ar/help.json",
          "ar/notifications.json",
        ],
      },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
      alwaysRedirect: false,
      fallbackLocale: "fr",
    },
  },
  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_KEY,
    types: false, // no generated DB types yet
    useSsrCookies: true,
    redirect: false, // don't globally guard routes yet
    redirectOptions: { login: "/login", callback: "/confirm", exclude: [] },
  },
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
