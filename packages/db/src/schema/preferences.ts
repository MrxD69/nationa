import { jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import type { JsonObject } from "./types";
import { users } from "./users";

export type ThemePreferences = JsonObject;
export type AiInstructions = JsonObject;

export const preferences = snakeCase.table.withRLS(
  "preferences",
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    theme: jsonb().$type<ThemePreferences>(),
    aiInstructions: jsonb().$type<AiInstructions>(),
    locale: text().notNull().default("fr"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  () => [],
);

export type Preferences = typeof preferences.$inferSelect;
export type NewPreferences = typeof preferences.$inferInsert;
