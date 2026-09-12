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

function isAddressInUse(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === "EADDRINUSE" || (typeof message === "string" && message.includes("in use"));
}

let server: BunServer;
try {
  server = bun.serve({
    port,
    fetch: (request) => app.fetch(request, process.env as unknown as ServerRuntimeEnv),
  });
} catch (error) {
  if (isAddressInUse(error)) {
    console.error(
      [
        `Port ${port} is already in use. Another dev server is likely running.`,
        `Stop it with: lsof -ti:${port} | xargs -r kill`,
        `To run this server on a different port instead, use: PORT=${port + 1} pnpm dev:server`,
      ].join("\n"),
    );
    process.exit(1);
  }
  throw error;
}

console.log(`[server] listening on http://localhost:${server.port}`);
