<script setup lang="ts">
import NotificationList from "~/components/notification/NotificationList.vue";

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

const client = useApi();
const router = useRouter();
const { t } = useI18n();

const notifications = ref<NotificationRow[]>([]);
const unread = ref(0);
const loading = ref(false);
const loaded = ref(false);
const open = ref(false);

async function refreshUnread() {
  try {
    unread.value = Number(await client.notifications.unreadCount({}));
  } catch {
    unread.value = 0;
  }
}

async function loadList() {
  loading.value = true;
  try {
    notifications.value = (await client.notifications.list({
      limit: 20,
    })) as unknown as NotificationRow[];
    loaded.value = true;
  } catch {
    notifications.value = [];
  } finally {
    loading.value = false;
  }
}

async function markRead(id: string) {
  const target = notifications.value.find((item) => item.id === id);
  try {
    await client.notifications.markRead({ notificationId: id });
    await Promise.all([loadList(), refreshUnread()]);
  } catch {
    // Best-effort: still navigate below for company rows.
  }
  // Reco rows carry the company in entityId; land on its recommended section.
  if (target?.entityType === "company") {
    const companyId = target.entityId ?? target.companyId ?? null;
    if (companyId) {
      await router.push(`/actions?companyId=${companyId}`);
    }
  }
}

async function markAllRead() {
  try {
    await client.notifications.markAllRead({});
    await Promise.all([loadList(), refreshUnread()]);
  } catch {
    return;
  }
}

async function onOpenChange(value: boolean) {
  open.value = value;
  if (value && !loaded.value) {
    await loadList();
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  void refreshUnread();
  timer = setInterval(refreshUnread, 60000);
});
onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <UPopover :open="open" :content="{ align: 'end' }" @update:open="onOpenChange">
    <UButton
      color="neutral"
      variant="ghost"
      square
      class="press relative"
      :aria-label="t('notifications.title')"
      :title="t('notifications.title')"
    >
      <UIcon name="i-tabler-bell" class="size-6 shrink-0" />

      <span
        v-if="unread > 0"
        class="absolute -end-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-xs font-semibold text-white tabular-nums"
      >
        {{ unread > 9 ? "9+" : unread }}
      </span>
    </UButton>

    <template #content>
      <NotificationList
        :items="notifications"
        :loading="loading"
        @mark-read="markRead"
        @mark-all-read="markAllRead"
      />
    </template>
  </UPopover>
</template>
