import { index, jsonb, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import type { JsonObject } from "./types";
import { users } from "./users";

export const accountTypeEnum = pgEnum("account_type", ["owner", "accountant", "officer", "admin"]);

export type OnboardingAnswers = JsonObject;

export const profiles = snakeCase.table.withRLS(
  "profiles",
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    accountType: accountTypeEnum().notNull().default("owner"),
    displayName: text(),
    locale: text().notNull().default("fr"),
    phone: text(),
    avatarUrl: text(),
    onboardingAnswers: jsonb().$type<OnboardingAnswers>(),
    termsAcceptedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index("profiles_account_type_idx").on(table.accountType)],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
