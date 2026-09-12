import { boolean, index, pgEnum, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { users } from "./users";

export const agencyMembershipRoleEnum = pgEnum("agency_membership_role", [
  "officer",
  "supervisor",
  "admin",
]);
export const agencyMembershipStatusEnum = pgEnum("agency_membership_status", [
  "invited",
  "active",
  "suspended",
  "revoked",
]);

export const agencies = snakeCase.table.withRLS(
  "agencies",
  {
    id: text().primaryKey(),
    nameFr: text().notNull(),
    nameAr: text(),
    nameEn: text(),
    description: text(),
    website: text(),
    active: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("agencies_active_idx").on(table.active)],
);

export const agencyMemberships = snakeCase.table.withRLS(
  "agency_memberships",
  {
    agencyId: text()
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: agencyMembershipRoleEnum().notNull().default("officer"),
    status: agencyMembershipStatusEnum().notNull().default("invited"),
    addedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.agencyId, table.userId] }),
    index("agency_memberships_user_status_idx").on(table.userId, table.status),
    index("agency_memberships_agency_status_idx").on(table.agencyId, table.status),
    index("agency_memberships_added_by_idx").on(table.addedBy),
  ],
);

export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;
export type AgencyMembership = typeof agencyMemberships.$inferSelect;
export type NewAgencyMembership = typeof agencyMemberships.$inferInsert;
