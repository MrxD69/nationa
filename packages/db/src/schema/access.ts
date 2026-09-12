import { index, pgEnum, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { companies } from "./companies";
import { users } from "./users";

export const companyAccessRoleEnum = pgEnum("company_access_role", [
  "owner",
  "employee",
  "accountant",
  "accountant_assistant",
  "admin",
]);
export const companyAccessStatusEnum = pgEnum("company_access_status", [
  "invited",
  "active",
  "suspended",
  "revoked",
]);

export const companyAccessGrants = snakeCase.table.withRLS(
  "company_access_grants",
  {
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: companyAccessRoleEnum().notNull(),
    scopes: text().array().notNull().default([]),
    status: companyAccessStatusEnum().notNull().default("invited"),
    grantedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    grantedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.companyId, table.userId] }),
    index("company_access_grants_user_status_idx").on(table.userId, table.status),
    index("company_access_grants_company_status_idx").on(table.companyId, table.status),
    index("company_access_grants_granted_by_idx").on(table.grantedBy),
  ],
);

export const accessInvitations = snakeCase.table.withRLS(
  "access_invitations",
  {
    id: uuid().primaryKey().defaultRandom(),
    token: text().notNull(),
    email: text().notNull(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: companyAccessRoleEnum().notNull(),
    scopes: text().array().notNull().default([]),
    invitedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    acceptedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("access_invitations_token_uidx").on(table.token),
    index("access_invitations_email_company_idx").on(table.email, table.companyId),
    index("access_invitations_company_accepted_idx").on(table.companyId, table.acceptedAt),
  ],
);

export type CompanyAccessGrant = typeof companyAccessGrants.$inferSelect;
export type NewCompanyAccessGrant = typeof companyAccessGrants.$inferInsert;
export type AccessInvitation = typeof accessInvitations.$inferSelect;
export type NewAccessInvitation = typeof accessInvitations.$inferInsert;
