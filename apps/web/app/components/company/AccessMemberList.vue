<script setup lang="ts">
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

const { t } = useI18n();
</script>

<template>
  <div
    v-if="props.members.length === 0"
    class="rounded-lg border border-dashed border-default px-6 py-10 text-center text-base text-muted"
  >
    {{ t("companies.access.noMembers") }}
  </div>

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
        </div>
      </div>

      <UButton
        color="error"
        variant="ghost"
        size="lg"
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
