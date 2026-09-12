import type { AppRouterClient } from "@nationa/api/routers/index";

export function useApi(): AppRouterClient {
  return useNuxtApp().$orpcClient;
}

export function useApiUtils() {
  return useNuxtApp().$orpc;
}
