import type { Context as ApiContext, AuthUser } from "@nationa/api/context";
import type { Context as HonoContext } from "hono";

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

export async function createContext({ context }: CreateContextOptions): Promise<ApiContext> {
  const runtimeEnv = context.env ?? serverEnv;
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
