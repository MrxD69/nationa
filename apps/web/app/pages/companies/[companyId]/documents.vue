<script setup lang="ts">
import type {
  DocumentBundleItem,
  DocumentTypeItem,
  ExtractedFieldItem,
  UploadResult,
} from "~/composables/useUpload";
import DocumentUploader from "~/components/document/DocumentUploader.vue";
import DocumentList from "~/components/document/DocumentList.vue";
import ExtractedFieldsTable from "~/components/document/ExtractedFieldsTable.vue";
import ExtractionStatus from "~/components/document/ExtractionStatus.vue";

definePageMeta({ layout: "app", middleware: "auth" });

type DocumentDetailShape = DocumentBundleItem & {
  fields: ExtractedFieldItem[];
  provenance: unknown[];
};

const route = useRoute();
const client = useApi();
const { t } = useI18n();

const companyId = computed(() => String(route.params.companyId ?? ""));

const {
  data: bundles,
  pending,
  refresh,
} = await useAsyncData(
  "company-documents",
  async () =>
    (await client.documents.list({
      companyId: companyId.value,
    })) as unknown as DocumentBundleItem[],
  { watch: [companyId], default: () => [] as DocumentBundleItem[] },
);

const { data: documentTypes } = await useAsyncData(
  "document-types",
  async () => (await client.documents.listTypes()) as unknown as DocumentTypeItem[],
  { default: () => [] as DocumentTypeItem[] },
);

const items = computed<DocumentBundleItem[]>(() => (bundles.value ?? []) as DocumentBundleItem[]);
const types = computed<DocumentTypeItem[]>(() => (documentTypes.value ?? []) as DocumentTypeItem[]);

const selectedId = ref<string | null>(null);
const detail = ref<DocumentDetailShape | null>(null);
const detailLoading = ref(false);
const reprocessingId = ref<string | null>(null);

const selectedBundle = computed(
  () => items.value.find((item) => item.document.id === selectedId.value) ?? null,
);

const overallConfidence = computed(() => {
  const raw = detail.value?.extraction?.confidenceOverall ?? null;
  if (raw === null || raw === "") {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : null;
});

async function selectDocument(id: string) {
  selectedId.value = id;
  detailLoading.value = true;
  try {
    detail.value = (await client.documents.get({
      companyId: companyId.value,
      documentId: id,
    })) as unknown as DocumentDetailShape;
  } catch {
    detail.value = null;
  } finally {
    detailLoading.value = false;
  }
}

async function onUploaded(result: UploadResult) {
  await refresh();
  await selectDocument(result.documentId);
}

async function reprocess(id: string) {
  reprocessingId.value = id;
  try {
    await client.documents.reprocess({ companyId: companyId.value, documentId: id });
    await refresh();
    if (selectedId.value === id) {
      await selectDocument(id);
    }
  } finally {
    reprocessingId.value = null;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-highlighted">
          {{ t("documents.title") }}
        </h1>
        <p class="text-sm text-muted">{{ t("documents.subtitle") }}</p>
      </div>
      <UBadge
        color="neutral"
        variant="subtle"
        :label="t('documents.list.count', { count: items.length })"
      />
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <DocumentUploader :company-id="companyId" @uploaded="onUploaded" />

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-highlighted">{{ t("documents.list.title") }}</h2>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-tabler-reload"
            :label="t('documents.list.refresh')"
            @click="refresh()"
          />
        </div>

        <DocumentList
          :items="items"
          :types="types"
          :selected-id="selectedId"
          :reprocessing-id="reprocessingId"
          :loading="pending"
          @select="selectDocument"
          @reprocess="reprocess"
        />
      </section>
    </div>

    <UCard v-if="selectedId">
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <p class="truncate text-sm font-semibold text-highlighted">
              {{ selectedBundle?.document.title ?? t("documents.detail.title") }}
            </p>
            <p class="text-xs text-muted">{{ t("documents.detail.subtitle") }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="overallConfidence"
              color="neutral"
              variant="subtle"
              :label="t('documents.extraction.overallConfidence') + ': ' + overallConfidence"
            />
            <ExtractionStatus :status="selectedBundle?.document.status" />
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-tabler-reload"
              :loading="reprocessingId === selectedId"
              :label="t('documents.extraction.reprocess')"
              @click="selectedId && reprocess(selectedId)"
            />
          </div>
        </div>
      </template>

      <div
        v-if="detailLoading"
        class="flex items-center justify-center gap-2 py-8 text-sm text-muted"
      >
        <UIcon name="i-tabler-loader-2" class="size-5 animate-spin" />
        {{ t("documents.detail.loading") }}
      </div>

      <template v-else>
        <UAlert
          v-if="detail?.extraction?.status === 'failed'"
          class="mb-4"
          color="error"
          variant="soft"
          icon="i-tabler-alert-triangle"
          :title="t('documents.extraction.error')"
          :description="detail?.extraction?.error ?? undefined"
        />

        <ExtractedFieldsTable :fields="detail?.fields ?? []" />
      </template>
    </UCard>
  </div>
</template>
