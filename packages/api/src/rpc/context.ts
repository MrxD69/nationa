import type { Database } from "@nationa/db";
import type { LanguageModel } from "ai";

import type { StoragePort } from "../storage/port";

export type AuthUser = {
  id: string;
  email?: string;
  role?: string;
  accountType?: string;
};

export type Context = {
  db: Database;
  user: AuthUser | null;
  ai: { model: LanguageModel };
  storage: StoragePort;
  env?: Record<string, unknown>;
};

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Db = Database | Tx;
