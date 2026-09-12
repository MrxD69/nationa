import type { AppRouterClient } from "@nationa/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin(() => {
  const event = useRequestEvent();
  const requestURL = useRequestURL();
  const config = useRuntimeConfig();
  const serverUrl = (import.meta.server && config.serverUrl) || config.public.serverUrl;
  const rpcUrl = new URL(`${serverUrl.replace(/\/$/, "")}/rpc`, requestURL.origin).href;

  const rpcLink = new RPCLink({
    url: rpcUrl,
    headers: () => event?.headers ?? {},
  });

  const client: AppRouterClient = createORPCClient(rpcLink);
  const orpcUtils = createTanstackQueryUtils(client);

  return {
    provide: {
      orpc: orpcUtils,
    },
  };
});
