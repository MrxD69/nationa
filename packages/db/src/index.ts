import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { DatabaseConfig } from "./config";

export * from "./schema";
export type { DatabaseConfig } from "./config";

type GlobalDbCache = {
  __nationaDb?: Database;
  __nationaDbUrl?: string;
};

function getGlobalCache(): GlobalDbCache {
  return globalThis as GlobalDbCache;
}

export function createDb(env: DatabaseConfig): Database {
  const url = env.DATABASE_URL || "";
  const g = getGlobalCache();

  if (g.__nationaDb && g.__nationaDbUrl === url) {
    return g.__nationaDb;
  }

  const client = postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    prepare: false,
    onnotice: () => {},
  });

  const db = drizzle({ client });
  g.__nationaDb = db;
  g.__nationaDbUrl = url;

  return db;
}

export function getCachedDb(): Database | undefined {
  return getGlobalCache().__nationaDb;
}

export type Database = ReturnType<typeof drizzle>;
