import {
  date,
  index,
  jsonb,
  pgEnum,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import type { Address } from "./types";
import { users } from "./users";

export const genderEnum = pgEnum("gender", ["male", "female", "other", "unknown"]);

export const persons = snakeCase.table.withRLS(
  "persons",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    firstName: text(),
    lastName: text(),
    fullName: text().notNull(),
    fullNameAr: text(),
    nationalId: text(),
    nationality: text(),
    birthDate: date({ mode: "string" }),
    gender: genderEnum(),
    email: text(),
    phone: text(),
    address: jsonb().$type<Address>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("persons_user_id_idx").on(table.userId),
    uniqueIndex("persons_national_id_uidx").on(table.nationalId),
    index("persons_full_name_idx").on(table.fullName),
  ],
);

export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
