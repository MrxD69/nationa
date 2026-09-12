import "varlock/auto-load";

import app from "./index";
import type { ServerRuntimeEnv } from "./env.server";

type BunServer = { port: number };

type BunRuntime = {
  serve(options: {
    port: number;
    fetch: (request: Request) => Response | Promise<Response>;
  }): BunServer;
};

const bun = (globalThis as { Bun?: BunRuntime }).Bun;

if (!bun) {
  throw new Error("The bare dev server requires the Bun runtime (globalThis.Bun is undefined)");
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = bun.serve({
  port,
  fetch: (request) => app.fetch(request, process.env as unknown as ServerRuntimeEnv),
});

console.log(`[server] listening on http://localhost:${server.port}`);
