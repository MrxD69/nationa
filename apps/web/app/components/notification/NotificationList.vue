<script setup lang="ts">
type NotificationRow = {
  id: string;
  type?: string | null;
  title: string;
  body?: string | null;
  readAt?: string | Date | null;
  createdAt?: string | Date | null;
};

defineProps<{
  items: NotificationRow[];
  loading?: boolean;
}>();

const emit = defineEmits<{ markRead: [id: string]; markAllRead: [] }>();

const { t } = useI18n();

function formatDate(value?: string | Date | null) {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}
</script>

<template>
  <div class="flex max-h-96 w-80 flex-col">
    <div class="flex items-center justify-between gap-2 border-b border-default px-3 py-2">
      <span class="text-base font-semibold text-highlighted">{{ t("notifications.title") }}</span>
      <UButton
        color="neutral"
        variant="ghost"
        size="lg"
        icon="i-tabler-checks"
        :label="t('notifications.markAllRead')"
        @click="emit('markAllRead')"
      />
    </div>

    <div v-if="loading" class="flex items-center gap-2 px-3 py-6 text-sm text-muted">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      {{ t("notifications.loading") }}
    </div>

    <div v-else-if="items.length === 0" class="px-3 py-6 text-center text-sm text-muted">
      {{ t("notifications.empty") }}
    </div>

    <ul v-else class="min-h-0 flex-1 divide-y divide-default overflow-y-auto">
      <li
        v-for="notification in items"
        :key="notification.id"
        class="cursor-pointer px-3 py-3 hover:bg-elevated/60"
        :class="notification.readAt ? '' : 'bg-primary/5'"
        @click="emit('markRead', notification.id)"
      >
        <div class="flex items-start gap-2">
          <span
            v-if="!notification.readAt"
            class="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-base text-highlighted">{{ notification.title }}</p>
            <p v-if="notification.body" class="line-clamp-2 text-sm text-muted">
              {{ notification.body }}
            </p>
            <p class="mt-0.5 text-sm text-muted">{{ formatDate(notification.createdAt) }}</p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
