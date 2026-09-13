import "varlock/auto-load";

import app from "./index";
import type { ServerRuntimeEnv } from "./env.server";

// Production entry (Render/Railway/Fly/any long-lived host).
// Mirrors dev.ts but binds all interfaces and has no dev-only diagnostics.
type BunServer = { hostname: string; port: number };

type BunRuntime = {
  serve(options: {
    port: number;
    hostname?: string;
    fetch: (request: Request) => Response | Promise<Response>;
  }): BunServer;
};

const bun = (globalThis as { Bun?: BunRuntime }).Bun;

if (!bun) {
  throw new Error("The production server requires the Bun runtime (globalThis.Bun is undefined)");
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch: (request) => app.fetch(request, process.env as unknown as ServerRuntimeEnv),
});

console.log(`[server] listening on http://0.0.0.0:${server.port}`);
