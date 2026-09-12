import type { Database } from "@nationa/db";

export type Context = {
  auth: null;
  session: null;
  db: Database;
};
