<script setup lang="ts">
import EmptyState from "~/components/ui/EmptyState.vue";

type AccessMember = {
  userId: string;
  email?: string | null;
  role: string;
  scopes?: string[];
  status: string;
  grantedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  revokedAt?: string | Date | null;
};

const props = defineProps<{
  members: AccessMember[];
  currentUserId?: string | null;
  busy?: boolean;
}>();

const emit = defineEmits<{ revoke: [userId: string] }>();

const { t, locale } = useI18n();

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(date);
}
</script>

<template>
  <EmptyState
    v-if="props.members.length === 0"
    size="sm"
    icon="i-tabler-users"
    :title="t('companies.access.noMembers')"
  />

  <ul v-else class="divide-y divide-default overflow-hidden rounded-lg border border-default">
    <li
      v-for="member in props.members"
      :key="member.userId"
      class="flex items-center justify-between gap-4 px-5 py-4"
    >
      <div class="min-w-0">
        <p class="truncate text-base font-medium text-highlighted">
          {{ member.email ?? member.userId }}
        </p>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          <UBadge
            color="neutral"
            variant="subtle"
            size="lg"
            :label="t(`companies.roles.${member.role}`)"
          />
          <UBadge color="neutral" variant="outline" size="lg" :label="member.status" />
          <span
            v-if="formatDate(member.grantedAt)"
            class="inline-flex items-center gap-1 tabular-nums"
          >
            <UIcon name="i-tabler-calendar" class="size-4" />
            <span dir="ltr">{{ formatDate(member.grantedAt) }}</span>
          </span>
        </div>
      </div>

      <UButton
        color="error"
        variant="ghost"
        icon="i-tabler-user-minus"
        :disabled="
          props.busy || member.userId === props.currentUserId || member.status === 'revoked'
        "
        :label="t('companies.access.revoke')"
        @click="emit('revoke', member.userId)"
      />
    </li>
  </ul>
</template>
