import { z } from "zod";

import { companyProcedure, userProcedure } from "../builders";
import {
  listNotifications,
  markAllRead,
  markRead,
  syncDeadlineNotifications,
  unreadCount,
} from "../services/notifications.service";

export const notificationsRouter = {
  list: userProcedure
    .input(
      z.object({
        companyId: z.string().min(1).optional(),
        unreadOnly: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .handler(({ context, input }) => listNotifications(context, input)),

  unreadCount: userProcedure
    .input(z.object({ companyId: z.string().min(1).optional() }).optional())
    .handler(({ context, input }) => unreadCount(context, input ?? {})),

  markRead: userProcedure
    .input(z.object({ notificationId: z.guid() }))
    .handler(({ context, input }) => markRead(context, input)),

  markAllRead: userProcedure
    .input(z.object({ companyId: z.string().min(1).optional() }).optional())
    .handler(({ context, input }) => markAllRead(context, input ?? {})),

  syncDeadlines: companyProcedure("notifications.manage")
    .input(
      z.object({
        companyId: z.string().min(1),
        withinDays: z.number().int().min(1).max(120).optional(),
      }),
    )
    .handler(({ context, input }) => syncDeadlineNotifications(context, input)),
};
