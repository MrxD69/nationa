import type { AppRouterClient } from "@nationa/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const requestURL = useRequestURL();
  const serverUrl = (import.meta.server && config.serverUrl) || config.public.serverUrl;
  const rpcUrl = new URL(`${serverUrl.replace(/\/$/, "")}/rpc`, requestURL.origin).href;

  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const requestHeaders = useRequestHeaders();

  async function resolveAccessToken(): Promise<string | null> {
    if (session.value?.access_token) {
      return session.value.access_token;
    }

    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  const rpcLink = new RPCLink({
    url: rpcUrl,
    headers: async () => {
      const headers: Record<string, string> = { ...requestHeaders };
      const accessToken = await resolveAccessToken();

      if (accessToken) {
        headers.authorization = `Bearer ${accessToken}`;
      }

      return headers;
    },
  });

  const client: AppRouterClient = createORPCClient(rpcLink);
  const orpcUtils = createTanstackQueryUtils(client);

  return {
    provide: {
      orpc: orpcUtils,
      orpcClient: client,
    },
  };
});
