<script setup lang="ts">
import type {
  DocumentBundleItem,
  DocumentTypeItem,
  ExtractedFieldItem,
  UploadResult,
} from "~/composables/useUpload";
import SectionHeader from "~/components/ui/SectionHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
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
const { t, locale } = useI18n();

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

const uploaderOpen = ref(false);
const mobileDetailOpen = ref(false);
const detailSide = computed(() => (locale.value === "ar" ? "left" : "right"));

const selectedBundle = computed(
  () => items.value.find((item) => item.document.id === selectedId.value) ?? null,
);

const selectedDocumentType = computed(() => {
  const typeId = selectedBundle.value?.document.documentTypeId ?? null;
  return typeId ? (types.value.find((type) => type.id === typeId) ?? null) : null;
});

const importantFields = computed<string[]>(
  () => selectedDocumentType.value?.requiredFields ?? [],
);

const overallConfidence = computed(() => {
  const raw = detail.value?.extraction?.confidenceOverall ?? null;
  if (raw === null || raw === "") {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : null;
});

function isDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

async function selectDocument(id: string) {
  selectedId.value = id;
  detailLoading.value = true;
  if (!isDesktopViewport()) {
    mobileDetailOpen.value = true;
  }
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
  uploaderOpen.value = false;
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

watch(companyId, () => {
  selectedId.value = null;
  detail.value = null;
  mobileDetailOpen.value = false;
});
</script>

<template>
  <div>
    <div class="-mx-4 -mt-4 w-auto border-b border-default sm:-mx-6 sm:-mt-6">
      <div class="grid w-auto items-stretch lg:grid-cols-[minmax(0,20rem)_1px_minmax(0,1fr)]">
        <section class="min-w-0">
          <SectionHeader
            :title="t('documents.list.title')"
            :level="2"
            class="border-b border-default px-4 py-3 [&_h2]:min-w-0 [&_h2]:truncate [&_h2]:text-base"
          >
            <template #actions>
              <UButton
                color="primary"
                variant="ghost"
                icon="i-tabler-plus"
                square
                class="min-h-11 min-w-11 shrink-0 rounded-full transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]"
                :aria-label="t('documents.upload.open')"
                :title="t('documents.upload.open')"
                @click="uploaderOpen = true"
              />
            </template>
          </SectionHeader>
          <DocumentList
            :items="items"
            :types="types"
            :selected-id="selectedId"
            :reprocessing-id="reprocessingId"
            :loading="pending"
            @select="selectDocument"
            @reprocess="reprocess"
            @upload="uploaderOpen = true"
          />
        </section>

        <div aria-hidden="true" class="hidden w-px self-stretch bg-[var(--ui-border)] lg:block" />

        <aside class="hidden min-w-0 lg:block">
          <div class="space-y-4 px-4 py-3 lg:sticky lg:top-20">
            <div
              v-if="!selectedId"
              class="flex flex-col items-center justify-center gap-2 px-2 py-12 text-center"
            >
              <div
                class="flex size-12 items-center justify-center rounded-full bg-accented text-muted"
              >
                <UIcon name="i-tabler-file-search" class="size-6" />
              </div>
              <p class="text-base font-semibold text-highlighted">
                {{ t("documents.detail.select") }}
              </p>
              <p class="text-base text-muted">{{ t("documents.detail.selectHint") }}</p>
            </div>

            <LoadingState v-else-if="detailLoading" :label="t('documents.detail.loading')" />

            <div v-else class="space-y-4">
              <div class="space-y-2">
                <h2 class="truncate text-base font-semibold text-highlighted">
                  {{ selectedBundle?.document.title || t("documents.detail.title") }}
                </h2>
                <div class="flex flex-wrap items-center gap-2">
                  <ExtractionStatus :status="selectedBundle?.document.status" />
                  <UBadge
                    v-if="overallConfidence"
                    color="neutral"
                    variant="subtle"
                    :label="t('documents.extraction.overallConfidence') + ': ' + overallConfidence"
                  />
                  <UButton
                    class="ms-auto min-h-11"
                    color="neutral"
                    variant="soft"
                    icon="i-tabler-reload"
                    size="sm"
                    :loading="reprocessingId === selectedId"
                    :label="t('documents.extraction.reprocess')"
                    @click="selectedId && reprocess(selectedId)"
                  />
                </div>
              </div>

              <UAlert
                v-if="detail?.extraction?.status === 'failed'"
                color="error"
                variant="soft"
                icon="i-tabler-alert-triangle"
                :title="t('documents.extraction.error')"
                :description="detail?.extraction?.error ?? undefined"
              />

              <div class="-mx-4 divide-y divide-default border-y border-default px-4">
                <div class="py-3">
                  <ExtractedFieldsTable :fields="detail?.fields ?? []" :important-fields="importantFields" />
                </div>

                <details class="py-3">
                  <summary class="cursor-pointer text-sm font-medium text-toned">
                    {{ t("documents.detail.technical") }}
                  </summary>
                  <p class="mt-2 text-sm text-muted">{{ t("documents.detail.technicalHint") }}</p>
                  <dl class="mt-2 space-y-1 text-sm">
                    <div class="flex items-center justify-between gap-2">
                      <dt class="text-muted">{{ t("documents.detail.documentId") }}</dt>
                      <dd class="min-w-0 truncate text-toned" dir="ltr">
                        {{ selectedBundle?.document.id }}
                      </dd>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                      <dt class="text-muted">{{ t("documents.detail.versionId") }}</dt>
                      <dd class="min-w-0 truncate text-toned" dir="ltr">
                        {{ selectedBundle?.version?.id ?? "—" }}
                      </dd>
                    </div>
                  </dl>
                </details>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <USlideover
      v-model:open="uploaderOpen"
      :title="t('documents.upload.title')"
      :description="t('documents.upload.subtitle')"
      :side="detailSide"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <DocumentUploader :company-id="companyId" @uploaded="onUploaded" />
      </template>
    </USlideover>

    <USlideover
      v-model:open="mobileDetailOpen"
      :title="selectedBundle?.document.title || t('documents.detail.title')"
      :side="detailSide"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <div class="space-y-4">
          <div
            v-if="detailLoading"
            class="flex flex-col items-center justify-center gap-3 py-10"
            role="status"
          >
            <UIcon name="i-tabler-loader-2" class="size-6 animate-spin text-muted" />
            <p class="text-base text-muted">{{ t("documents.detail.loading") }}</p>
          </div>

          <template v-else>
            <div class="flex flex-wrap items-center gap-2">
              <ExtractionStatus :status="selectedBundle?.document.status" />
              <UBadge
                v-if="overallConfidence"
                color="neutral"
                variant="subtle"
                :label="t('documents.extraction.overallConfidence') + ': ' + overallConfidence"
              />
              <UButton
                class="ms-auto min-h-11"
                color="neutral"
                variant="soft"
                icon="i-tabler-reload"
                :loading="reprocessingId === selectedId"
                :label="t('documents.extraction.reprocess')"
                @click="selectedId && reprocess(selectedId)"
              />
            </div>

            <UAlert
              v-if="detail?.extraction?.status === 'failed'"
              color="error"
              variant="soft"
              icon="i-tabler-alert-triangle"
              :title="t('documents.extraction.error')"
              :description="detail?.extraction?.error ?? undefined"
            />

            <div class="divide-y divide-default border-y border-default">
              <div class="py-3">
                <ExtractedFieldsTable :fields="detail?.fields ?? []" :important-fields="importantFields" />
              </div>

              <details class="py-3">
                <summary class="cursor-pointer text-sm font-medium text-toned">
                  {{ t("documents.detail.technical") }}
                </summary>
                <p class="mt-2 text-sm text-muted">{{ t("documents.detail.technicalHint") }}</p>
                <dl class="mt-2 space-y-1 text-sm">
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-muted">{{ t("documents.detail.documentId") }}</dt>
                    <dd class="min-w-0 truncate text-toned" dir="ltr">
                      {{ selectedBundle?.document.id }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-muted">{{ t("documents.detail.versionId") }}</dt>
                    <dd class="min-w-0 truncate text-toned" dir="ltr">
                      {{ selectedBundle?.version?.id ?? "—" }}
                    </dd>
                  </div>
                </dl>
              </details>
            </div>
          </template>
        </div>
      </template>
    </USlideover>
  </div>
</template>
