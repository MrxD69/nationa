import type { Context as ApiContext, AuthUser } from "@nationa/api/context";
import type { Context as HonoContext } from "hono";

import { getCachedDb } from "@nationa/db";

import { getModel } from "./ai";
import { env as serverEnv, type ServerRuntimeEnv } from "./env.server";
import { getDb } from "./services";
import { createStorageFromRuntimeEnv } from "./storage/r2";

export type AppHonoEnv = {
  Bindings: ServerRuntimeEnv;
  Variables: { user: AuthUser | null };
};

export type CreateContextOptions = {
  context: HonoContext<AppHonoEnv>;
};

let warnedUrlMismatch = false;

export async function createContext({ context }: CreateContextOptions): Promise<ApiContext> {
  const runtimeEnv = context.env ?? serverEnv;
  // getDb is now a cheap cached passthrough (WS1 singleton) — no new client per request.
  // Guard: if DATABASE_URL differs from cached URL, reuse cached pool in dev, never open a second pool.
  const cached = getCachedDb();
  const cachedUrl = (globalThis as { __nationaDbUrl?: string }).__nationaDbUrl;
  if (cached && cachedUrl && runtimeEnv.DATABASE_URL && runtimeEnv.DATABASE_URL !== cachedUrl) {
    if (!warnedUrlMismatch) {
      warnedUrlMismatch = true;
      console.warn("[db] DATABASE_URL changed, reusing cached pool");
    }
    return {
      db: cached,
      user: context.get("user") ?? null,
      ai: { model: getModel(runtimeEnv) },
      storage: createStorageFromRuntimeEnv(runtimeEnv),
      env: runtimeEnv as unknown as Record<string, unknown>,
    };
  }
  const db = getDb(runtimeEnv);
  return {
    db,
    user: context.get("user") ?? null,
    ai: { model: getModel(runtimeEnv) },
    storage: createStorageFromRuntimeEnv(runtimeEnv),
    env: runtimeEnv as unknown as Record<string, unknown>,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
