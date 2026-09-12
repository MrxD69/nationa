import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { DatabaseConfig } from "./config";

export * from "./schema";
export type { DatabaseConfig } from "./config";

export function createDb(env: DatabaseConfig) {
  const client = postgres(env.DATABASE_URL || "", { max: 1 });

  return drizzle({ client });
}

export type Database = ReturnType<typeof createDb>;
