import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { documentVersions } from "./documents";
import { persons } from "./persons";
import type { Address } from "./types";
import { users } from "./users";

export const registryTypeEnum = pgEnum("registry_type", ["societe", "entreprise"]);
export const registryStateEnum = pgEnum("registry_state", ["actif", "suspendu", "radie"]);
export const fiscalDefaultEnum = pgEnum("fiscal_default", [
  "none",
  "months_12_24",
  "over_24_months",
  "unknown",
]);
export const companyStatusEnum = pgEnum("company_status", [
  "draft",
  "active",
  "suspended",
  "radiated",
]);
export const companyPersonRoleEnum = pgEnum("company_person_role", [
  "manager",
  "agent",
  "owner",
  "legal_representative",
  "auditor",
  "liquidator",
  "other",
]);

export type RneExtractSnapshot = Record<string, unknown>;

export const companies = snakeCase.table.withRLS(
  "companies",
  {
    id: uuid().primaryKey().defaultRandom(),
    uniqueIdentifier: text(),
    internalManagementNumber: text(),
    registryType: registryTypeEnum(),
    legalName: text().notNull(),
    legalNameAr: text(),
    tradeName: text(),
    brandName: text(),
    legalForm: text(),
    capitalAmount: numeric({ precision: 14, scale: 3 }),
    currency: text().notNull().default("TND"),
    durationYears: integer(),
    publicationDate: date({ mode: "string" }),
    headquartersAddress: jsonb().$type<Address>(),
    activityAddress: jsonb().$type<Address>(),
    mainActivityLabel: text(),
    mainActivityLabelAr: text(),
    mainActivityCode: text(),
    activityStartDate: date({ mode: "string" }),
    registryState: registryStateEnum().notNull().default("actif"),
    secondaryEstablishmentsCount: integer(),
    leasing: boolean().notNull().default(false),
    hasPledge: boolean().notNull().default(false),
    fiscalDefault: fiscalDefaultEnum().notNull().default("unknown"),
    mentionDate: date({ mode: "string" }),
    lastModificationDate: date({ mode: "string" }),
    lastFinancialStatementsDate: date({ mode: "string" }),
    lastBeneficialDeclarationDate: date({ mode: "string" }),
    workforce: integer(),
    taxId: text(),
    status: companyStatusEnum().notNull().default("draft"),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("companies_unique_identifier_uidx").on(table.uniqueIdentifier),
    uniqueIndex("companies_internal_management_number_uidx").on(table.internalManagementNumber),
    index("companies_tax_id_idx").on(table.taxId),
    index("companies_status_deleted_created_idx").on(
      table.status,
      table.deletedAt,
      table.createdAt,
    ),
    index("companies_legal_name_idx").on(table.legalName),
    index("companies_created_by_idx").on(table.createdByUserId),
  ],
);

export const companyPersons = snakeCase.table.withRLS(
  "company_persons",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    personId: uuid()
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    role: companyPersonRoleEnum().notNull(),
    roleLabelRaw: text(),
    startDate: date({ mode: "string" }),
    endDate: date({ mode: "string" }),
    ownershipPercent: numeric({ precision: 5, scale: 2 }),
    addedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("company_persons_company_person_role_uidx").on(
      table.companyId,
      table.personId,
      table.role,
    ),
    index("company_persons_person_role_idx").on(table.personId, table.role),
    index("company_persons_company_role_idx").on(table.companyId, table.role),
    index("company_persons_added_by_idx").on(table.addedBy),
  ],
);

export const companyRegistrySnapshots = snakeCase.table.withRLS(
  "company_registry_snapshots",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    documentVersionId: uuid().references(() => documentVersions.id, { onDelete: "set null" }),
    extractNumber: text(),
    editionDate: date({ mode: "string" }),
    verificationNumber: text(),
    registryState: registryStateEnum(),
    snapshot: jsonb().$type<RneExtractSnapshot>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("company_registry_snapshots_company_created_idx").on(table.companyId, table.createdAt),
    index("company_registry_snapshots_extract_number_idx").on(table.extractNumber),
    index("company_registry_snapshots_document_version_id_idx").on(table.documentVersionId),
  ],
);

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type CompanyPerson = typeof companyPersons.$inferSelect;
export type NewCompanyPerson = typeof companyPersons.$inferInsert;
export type CompanyRegistrySnapshot = typeof companyRegistrySnapshots.$inferSelect;
export type NewCompanyRegistrySnapshot = typeof companyRegistrySnapshots.$inferInsert;
