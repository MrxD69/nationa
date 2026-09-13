<script setup lang="ts">
import DocumentViewer from "~/components/officer/DocumentViewer.vue";
import SubmissionReviewPanel from "~/components/officer/SubmissionReviewPanel.vue";
import DecisionModal from "~/components/officer/DecisionModal.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

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
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <div class="flex items-center gap-2">
      <UButton
        :to="backLink"
        color="neutral"
        variant="ghost"
        icon="i-tabler-arrow-left"
        :ui="{ leadingIcon: 'rtl:rotate-180' }"
        :label="t('officer.review.back')"
      />
    </div>

    <LoadingState v-if="loading" :label="t('officer.common.loading')" />

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
