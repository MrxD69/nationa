<script setup lang="ts">
import EmptyState from "~/components/ui/EmptyState.vue";
import SectionHeader from "~/components/ui/SectionHeader.vue";

type NotificationRow = {
  id: string;
  type?: string | null;
  title: string;
  body?: string | null;
  readAt?: string | Date | null;
  createdAt?: string | Date | null;
  entityType?: string | null;
  entityId?: string | null;
  companyId?: string | null;
};

defineProps<{
  items: NotificationRow[];
  loading?: boolean;
}>();

const emit = defineEmits<{ markRead: [id: string]; markAllRead: [] }>();

const { t } = useI18n();

function isReco(row: NotificationRow): boolean {
  return row.type === "system" && row.entityType === "company";
}

function formatDate(value?: string | Date | null) {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}
</script>

<template>
  <div class="flex max-h-96 w-[min(20rem,calc(100vw-2rem))] flex-col">
    <div class="border-b border-default px-3 py-2">
      <SectionHeader :title="t('notifications.title')" icon="i-tabler-bell">
        <template #actions>
          <UButton
            color="neutral"
            variant="ghost"
            size="lg"
            square
            icon="i-tabler-checks"
            :aria-label="t('notifications.markAllRead')"
            :title="t('notifications.markAllRead')"
            :disabled="items.length === 0"
            @click="emit('markAllRead')"
          />
        </template>
      </SectionHeader>
    </div>

    <div v-if="loading" class="flex items-center gap-2 px-3 py-6 text-sm text-muted">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      {{ t("notifications.loading") }}
    </div>

    <div v-else-if="items.length === 0" class="p-3">
      <EmptyState size="sm" icon="i-tabler-bell-off" :title="t('notifications.empty')" />
    </div>

    <ul v-else class="min-h-0 flex-1 divide-y divide-default overflow-y-auto">
      <li
        v-for="notification in items"
        :key="notification.id"
        class="hover-surface cursor-pointer px-3 py-3"
        :class="notification.readAt ? '' : 'bg-primary/5'"
        @click="emit('markRead', notification.id)"
      >
        <div class="flex items-start gap-2">
          <UIcon
            v-if="isReco(notification)"
            name="i-tabler-sparkles"
            class="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span
            v-else-if="!notification.readAt"
            class="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-base text-highlighted">
              {{ isReco(notification) ? t("notifications.recommendedTitle") : notification.title }}
            </p>
            <p v-if="notification.body" class="line-clamp-2 text-sm text-muted">
              {{
                isReco(notification)
                  ? t("notifications.recommendedBody", { codes: notification.body })
                  : notification.body
              }}
            </p>
            <p class="mt-0.5 text-sm text-muted">{{ formatDate(notification.createdAt) }}</p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
