<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";
import AccessInviteModal from "~/components/company/AccessInviteModal.vue";
import AccessMemberList from "~/components/company/AccessMemberList.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import SectionHeader from "~/components/ui/SectionHeader.vue";

definePageMeta({ layout: "app", middleware: "auth" });

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
const revokeTarget = ref<string | null>(null);

const confirmOpen = computed({
  get: () => revokeTarget.value !== null,
  set: (open: boolean) => {
    if (!open) {
      revokeTarget.value = null;
    }
  },
});

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

async function confirmRevoke() {
  const userId = revokeTarget.value;
  if (!userId) {
    return;
  }
  await onRevoke(userId);
  revokeTarget.value = null;
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6">
    <PageHeader
      :title="t('companies.access.title')"
      :subtitle="t('companies.access.subtitle')"
      icon="i-tabler-users"
      :back-to="`/companies/${companyId}`"
      :back-label="t('companies.detail.back')"
    >
      <template #actions>
        <UButton
          icon="i-tabler-user-plus"
          :label="t('companies.access.invite')"
          @click="inviteOpen = true"
        />
      </template>
    </PageHeader>

    <UAlert v-if="revokeError" color="error" variant="subtle" :title="revokeError" />

    <div class="space-y-4">
      <SectionHeader :title="t('companies.access.members')" :count="members?.length" />

      <LoadingState v-if="loading" variant="skeleton-list" :count="3" />

      <AccessMemberList
        v-else
        :members="members ?? []"
        :current-user-id="currentUserId"
        :busy="revoking"
        @revoke="revokeTarget = $event"
      />
    </div>

    <AccessInviteModal v-model:open="inviteOpen" :company-id="companyId" @invited="refetch()" />

    <UModal v-model:open="confirmOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-md bg-error/10 text-error"
              >
                <UIcon name="i-tabler-user-minus" class="size-5" />
              </div>
              <h2 class="text-lg font-semibold text-highlighted">
                {{ t("companies.access.revokeTitle") }}
              </h2>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-tabler-x"
                square
                class="ms-auto"
                @click="revokeTarget = null"
              />
            </div>
          </template>

          <p class="text-base text-muted">{{ t("companies.access.revokeBody") }}</p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                :label="t('companies.access.revokeCancel')"
                @click="revokeTarget = null"
              />
              <UButton
                color="error"
                :loading="revoking"
                :label="t('companies.access.revokeConfirm')"
                @click="confirmRevoke"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
