<script setup lang="ts">
import SubmissionCard from "~/components/submission/SubmissionCard.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import EmptyState from "~/components/ui/EmptyState.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const { t } = useI18n();
const api = useApi();

const submissions = ref<
  Array<{
    id: string;
    companyId: string;
    status: string;
    cleanlinessTier: string;
    cleanlinessScore?: string | number | null;
    submittedAt?: string | Date | null;
    company?: {
      legalName?: string | null;
      legalNameAr?: string | null;
      tradeName?: string | null;
    } | null;
    agency?: { nameFr?: string | null; nameAr?: string | null } | null;
  }>
>([]);
const loading = ref(true);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    submissions.value = await api.submissions.mine();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6">
    <PageHeader
      :title="t('submissions.title')"
      :subtitle="t('submissions.subtitle')"
      icon="i-tabler-send"
      max-width="max-w-none"
    />

    <LoadingState v-if="loading" variant="skeleton-list" :count="4" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('submissions.error.title')"
      :description="error"
    >
      <template #actions>
        <UButton color="error" variant="soft" :label="t('submissions.error.retry')" @click="load" />
      </template>
    </UAlert>

    <EmptyState
      v-else-if="submissions.length === 0"
      icon="i-tabler-inbox"
      :title="t('submissions.empty')"
      :description="t('submissions.emptyDescription')"
    />

    <div v-else class="grid gap-3">
      <SubmissionCard
        v-for="submission in submissions"
        :key="submission.id"
        :submission="submission"
      />
    </div>
  </div>
</template>
