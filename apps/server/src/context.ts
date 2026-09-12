import type { Context as ApiContext } from "@nationa/api/context";
import type { Context as HonoContext } from "hono";

import { getDb } from "./services";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext(_options: CreateContextOptions): Promise<ApiContext> {
  const db = await getDb();
  return {
    db,
    auth: null,
    session: null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
