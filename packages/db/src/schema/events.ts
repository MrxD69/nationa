import { index, jsonb, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { snakeCase } from "drizzle-orm/pg-core";
import { companies } from "./companies";
import type { JsonObject } from "./types";
import { users } from "./users";

export const eventActorTypeEnum = pgEnum("event_actor_type", ["user", "system", "ai", "officer"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "submission_status",
  "review_decision",
  "deadline_reminder",
  "document_processed",
  "check_failed",
  "access_granted",
  "invoice_ready",
  "mention",
  "system",
]);

export const activityEvents = snakeCase.table.withRLS(
  "activity_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid().references(() => companies.id, { onDelete: "set null" }),
    actorUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    actorType: eventActorTypeEnum().notNull().default("system"),
    entityType: text().notNull(),
    entityId: uuid(),
    action: text().notNull(),
    summary: text(),
    data: jsonb().$type<JsonObject>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activity_events_company_created_idx").on(table.companyId, table.createdAt),
    index("activity_events_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    index("activity_events_actor_created_idx").on(table.actorUserId, table.createdAt),
  ],
);

export const notifications = snakeCase.table.withRLS(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid().references(() => companies.id, { onDelete: "set null" }),
    type: notificationTypeEnum().notNull(),
    title: text().notNull(),
    body: text(),
    entityType: text(),
    entityId: uuid(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_read_created_idx").on(table.userId, table.readAt, table.createdAt),
    index("notifications_company_id_idx").on(table.companyId),
  ],
);

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type NewActivityEvent = typeof activityEvents.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
