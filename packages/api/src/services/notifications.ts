export type { NotificationType, NotifyInput } from "../rpc/services/notifications.service";
export {
  listNotifications,
  markAllRead,
  markRead,
  nextDeadlineFromRule,
  notify,
  syncDeadlineNotifications,
  unreadCount,
} from "../rpc/services/notifications.service";
