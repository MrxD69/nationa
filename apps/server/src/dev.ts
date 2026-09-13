import "varlock/auto-load";

import app from "./index";
import type { ServerRuntimeEnv } from "./env.server";

type BunServer = { port: number };

type BunRuntime = {
  serve(options: {
    port: number;
    hostname?: string;
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
    // Bind the IPv6 wildcard ("::"), which also accepts IPv4-mapped addresses (dual-stack).
    // Binding IPv4-only left [::1]:PORT free, so a stray dev server could squat it and shadow
    // the API for browsers that resolve localhost to ::1 (they got HTML, not oRPC JSON).
    hostname: "::",
    fetch: (request) => app.fetch(request, process.env as unknown as ServerRuntimeEnv),
  });
} catch (error) {
  if (isAddressInUse(error)) {
    console.error(
      [
        `Port ${port} is already in use. Another dev server is likely running.`,
        `Stop it with: lsof -tiTCP:${port} -sTCP:LISTEN | xargs -r kill`,
        `To run this server on a different port instead, use: PORT=${port + 1} pnpm dev:server`,
      ].join("\n"),
    );
    process.exit(1);
  }
  throw error;
}

console.log(`[server] listening on http://localhost:${server.port} (dual-stack)`);

// ponytail: one log line, no deps. Masked host only — never print password.
const dbUrl = process.env.DATABASE_URL ?? "";
const masked = dbUrl ? dbUrl.replace(/:[^@]+@/, "://***@") : "(DATABASE_URL unset)";
console.log(`[server] db ${masked} (pool max:5 direct local; prod use 6543?pgbouncer=true)`);
