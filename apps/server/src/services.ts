import { type Database, createDb } from "@nationa/db";

import { env } from "./env.server";

export function getDb(): Database {
  return createDb(env);
}
