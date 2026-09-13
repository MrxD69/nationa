<script setup lang="ts">
import SubmissionCard from "~/components/submission/SubmissionCard.vue";

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
  <div class="mx-auto w-full max-w-5xl space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
        {{ t("submissions.title") }}
      </h1>
      <p class="text-base text-muted">{{ t("submissions.subtitle") }}</p>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-base text-muted">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      <span>{{ t("submissions.loading") }}</span>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="t('submissions.error.title')"
      :description="error"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="lg"
          :label="t('submissions.error.retry')"
          @click="load"
        />
      </template>
    </UAlert>

    <UAlert
      v-else-if="submissions.length === 0"
      color="neutral"
      variant="soft"
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
