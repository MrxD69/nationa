import { type Database, type DatabaseConfig, createDb } from "@nationa/db";

import { env as serverEnv } from "./env.server";

export function getDb(runtimeEnv: DatabaseConfig = serverEnv): Database {
  // Never create a new postgres client here — createDb is the process-wide singleton (globalThis cache, max:5, prepare:false).
  return createDb(runtimeEnv);
}
