import { type Database, type DatabaseConfig, createDb } from "@nationa/db";

import { env as serverEnv } from "./env.server";

export function getDb(runtimeEnv: DatabaseConfig = serverEnv): Database {
  return createDb(runtimeEnv);
}
