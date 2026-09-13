<script setup lang="ts">
import DocumentViewer from "~/components/officer/DocumentViewer.vue";
import SubmissionReviewPanel from "~/components/officer/SubmissionReviewPanel.vue";
import DecisionModal from "~/components/officer/DecisionModal.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const api = useApi();

const submissionId = computed(() => String(route.params.submissionId ?? ""));
const agencyId = computed(() =>
  typeof route.query.agencyId === "string" ? route.query.agencyId : "",
);

const data = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const decideOpen = ref(false);

async function load() {
  if (!agencyId.value || !submissionId.value) {
    error.value = t("officer.review.notFound");
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    data.value = await api.officer.get({
      agencyId: agencyId.value,
      submissionId: submissionId.value,
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const documents = computed(() => data.value?.documents ?? []);
const reviewPayload = computed(() => data.value ?? {});

const backLink = computed(() => ({
  path: "/officer",
  query: agencyId.value ? { agencyId: agencyId.value } : undefined,
}));
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2">
      <UButton
        :to="backLink"
        color="neutral"
        variant="ghost"
        icon="i-tabler-arrow-left"
        size="lg"
        :label="t('officer.review.back')"
      />
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-base text-muted">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      <span>{{ t("officer.common.loading") }}</span>
    </div>

    <UAlert
      v-else-if="error || !data"
      color="error"
      variant="subtle"
      :title="t('officer.review.notFound')"
      :description="error ?? undefined"
    />

    <div v-else class="grid min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div class="min-w-0">
        <DocumentViewer :documents="documents" :agency-id="agencyId" />
      </div>

      <aside class="min-w-0">
        <SubmissionReviewPanel :payload="reviewPayload" @decide="decideOpen = true" />
      </aside>
    </div>

    <DecisionModal
      v-if="data"
      v-model:open="decideOpen"
      :submission-id="submissionId"
      :agency-id="agencyId"
      @decided="load"
    />
  </div>
</template>
