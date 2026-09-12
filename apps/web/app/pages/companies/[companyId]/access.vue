<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";
import AccessInviteModal from "~/components/company/AccessInviteModal.vue";
import AccessMemberList from "~/components/company/AccessMemberList.vue";

definePageMeta({ middleware: "auth" });

const orpc = useApiUtils();
const route = useRoute();
const user = useSupabaseUser();
const { t } = useI18n();

const companyId = computed(() => String(route.params.companyId ?? ""));
const currentUserId = computed(() => user.value?.id ?? null);

const {
  data: members,
  isPending: loading,
  refetch,
} = useQuery(
  computed(() =>
    orpc.companies.listMembers.queryOptions({ input: { companyId: companyId.value } }),
  ),
);

const inviteOpen = ref(false);
const revokeError = ref<string | null>(null);

const { mutateAsync: revokeGrant, isPending: revoking } = useMutation(
  orpc.companies.revokeGrant.mutationOptions(),
);

async function onRevoke(userId: string) {
  revokeError.value = null;
  try {
    await revokeGrant({ companyId: companyId.value, userId });
    await refetch();
  } catch (cause) {
    revokeError.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <UContainer class="max-w-4xl py-8">
    <div class="grid gap-6">
      <div class="flex items-center gap-2">
        <UButton
          :to="`/companies/${companyId}`"
          color="neutral"
          variant="ghost"
          icon="i-tabler-arrow-left"
          size="sm"
          :label="t('companies.detail.back')"
        />
      </div>

      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
            {{ t("companies.access.title") }}
          </h1>
          <p class="text-sm text-muted">{{ t("companies.access.subtitle") }}</p>
        </div>

        <UButton
          icon="i-tabler-user-plus"
          :label="t('companies.access.invite')"
          @click="inviteOpen = true"
        />
      </div>

      <UAlert v-if="revokeError" color="error" variant="subtle" :title="revokeError" />

      <UCard>
        <template #header>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ t("companies.access.members") }}
          </h2>
        </template>

        <div v-if="loading" class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
          <span>{{ t("companies.loading") }}</span>
        </div>

        <AccessMemberList
          v-else
          :members="members ?? []"
          :current-user-id="currentUserId"
          :busy="revoking"
          @revoke="onRevoke"
        />
      </UCard>
    </div>

    <AccessInviteModal v-model:open="inviteOpen" :company-id="companyId" @invited="refetch()" />
  </UContainer>
</template>
