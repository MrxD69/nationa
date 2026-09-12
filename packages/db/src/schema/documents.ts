import {
  index,
  integer,
  pgEnum,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { cases } from "./cases";
import { companies } from "./companies";
import { documentTypes } from "./document_types";
import { users } from "./users";

export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "processing",
  "extracted",
  "needs_review",
  "verified",
  "failed",
]);
export const documentVersionSourceEnum = pgEnum("document_version_source", [
  "upload",
  "generated",
  "ai_generated",
]);
export const documentLinkTypeEnum = pgEnum("document_link_type", [
  "company",
  "case",
  "person",
  "submission",
]);

export const documents = snakeCase.table.withRLS(
  "documents",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid().references(() => companies.id, { onDelete: "set null" }),
    caseId: uuid().references(() => cases.id, { onDelete: "set null" }),
    documentTypeId: uuid().references(() => documentTypes.id, { onDelete: "set null" }),
    ownerUserId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text().notNull(),
    description: text(),
    status: documentStatusEnum().notNull().default("uploaded"),
    currentVersionId: uuid().references((): AnyPgColumn => documentVersions.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("documents_company_status_created_idx").on(
      table.companyId,
      table.status,
      table.createdAt,
    ),
    index("documents_case_id_idx").on(table.caseId),
    index("documents_owner_status_idx").on(table.ownerUserId, table.status),
    index("documents_document_type_id_idx").on(table.documentTypeId),
    index("documents_current_version_id_idx").on(table.currentVersionId),
  ],
);

export const documentVersions = snakeCase.table.withRLS(
  "document_versions",
  {
    id: uuid().primaryKey().defaultRandom(),
    documentId: uuid()
      .notNull()
      .references((): AnyPgColumn => documents.id, { onDelete: "cascade" }),
    version: integer().notNull(),
    storageBucket: text().notNull(),
    storagePath: text().notNull(),
    fileName: text().notNull(),
    mimeType: text().notNull(),
    size: integer().notNull(),
    hash: text(),
    pageCount: integer(),
    source: documentVersionSourceEnum().notNull().default("upload"),
    uploadedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    supersedesVersionId: uuid().references((): AnyPgColumn => documentVersions.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("document_versions_document_version_uidx").on(table.documentId, table.version),
    uniqueIndex("document_versions_storage_path_uidx").on(table.storagePath),
    index("document_versions_document_uploaded_idx").on(table.documentId, table.uploadedAt),
    index("document_versions_supersedes_version_id_idx").on(table.supersedesVersionId),
    index("document_versions_uploaded_by_idx").on(table.uploadedByUserId),
  ],
);

export const documentLinks = snakeCase.table.withRLS(
  "document_links",
  {
    documentId: uuid()
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    linkType: documentLinkTypeEnum().notNull(),
    linkId: uuid().notNull(),
    addedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.linkType, table.linkId] }),
    index("document_links_link_type_link_id_idx").on(table.linkType, table.linkId),
    index("document_links_added_by_idx").on(table.addedBy),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type DocumentLink = typeof documentLinks.$inferSelect;
export type NewDocumentLink = typeof documentLinks.$inferInsert;
