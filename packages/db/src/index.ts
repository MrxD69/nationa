import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { DatabaseConfig } from "./config";
import * as schema from "./schema";

export function createDb(env: DatabaseConfig) {
  const client = postgres(env.DATABASE_URL || "", { max: 1 });

  return drizzle({ client, schema });
}

export type Database = ReturnType<typeof createDb>;
