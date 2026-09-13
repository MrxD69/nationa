<script setup lang="ts">
import TeamWorkloadTable from "~/components/officer/ops/TeamWorkloadTable.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

const { t } = useI18n();
const api = useApi();

const { agencyId, ready, error: agencyError, ensureLoaded } = useOfficerAgency();

type Member = {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  role?: string | null;
  openCount: number;
  decidedCount: number;
  avgDecisionHours?: number | null;
};

const members = ref<Member[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const forbidden = ref(false);

async function load() {
  if (!agencyId.value) {
    return;
  }
  loading.value = true;
  error.value = null;
  forbidden.value = false;
  try {
    const result = await api.officer.team({ agencyId: agencyId.value });
    members.value = result.members ?? [];
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (/forbidden|permission|acc[eè]s/i.test(message)) {
      forbidden.value = true;
    } else {
      error.value = message;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await ensureLoaded();
  await load();
});

watch(agencyId, () => {
  if (ready.value && agencyId.value) {
    void load();
  }
});
</script>

<template>
  <div class="w-full">
    <LoadingState
      v-if="!ready || (loading && members.length === 0 && !forbidden && !error)"
      variant="skeleton-grid"
      :count="3"
      :label="t('officerOps.common.loading')"
    />

    <UAlert
      v-else-if="forbidden"
      color="warning"
      variant="subtle"
      icon="i-tabler-lock"
      :description="t('officerOps.team.forbidden')"
    />

    <UAlert
      v-else-if="agencyError || error"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('officerOps.team.error')"
      :description="error ?? t('officerOps.queue.error')"
    >
      <template #actions>
        <UButton
          size="md"
          color="error"
          variant="soft"
          icon="i-tabler-refresh"
          :label="t('officerOps.common.retry')"
          @click="load()"
        />
      </template>
    </UAlert>

    <TeamWorkloadTable v-else :members="members" :loading="loading" />
  </div>
</template>
