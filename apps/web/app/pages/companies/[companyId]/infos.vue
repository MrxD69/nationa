<script setup lang="ts">
import type { DocumentBundleItem, DocumentTypeItem, UploadResult } from "~/composables/useUpload";
import PageHeader from "~/components/ui/PageHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import CriticalDocumentCard from "~/components/document/CriticalDocumentCard.vue";
import CriticalDocumentUploader from "~/components/document/CriticalDocumentUploader.vue";
import { CRITICAL_DOCUMENTS } from "~/constants/documents";

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const client = useApi();
const { t, locale } = useI18n();
const toast = useToast();

const companyId = computed(() => String(route.params.companyId ?? ""));

const {
  data: typesData,
  pending: typesPending,
  error: typesError,
  refresh: refreshTypes,
} = await useAsyncData(
  "company-critical-document-types",
  async () => (await client.documents.listTypes()) as unknown as DocumentTypeItem[],
  { default: () => [] as DocumentTypeItem[] },
);

const {
  data: bundlesData,
  pending: bundlesPending,
  error: bundlesError,
  refresh,
} = await useAsyncData(
  "company-critical-documents",
  async () =>
    (await client.documents.list({
      companyId: companyId.value,
    })) as unknown as DocumentBundleItem[],
  { watch: [companyId], default: () => [] as DocumentBundleItem[] },
);

const { data: companyData } = await useAsyncData(
  "company-critical-company",
  async () => await client.companies.get({ companyId: companyId.value }),
  { watch: [companyId] },
);

const types = computed<DocumentTypeItem[]>(() => (typesData.value ?? []) as DocumentTypeItem[]);
const bundles = computed<DocumentBundleItem[]>(
  () => (bundlesData.value ?? []) as DocumentBundleItem[],
);

function latestForType(typeId: string): DocumentBundleItem | null {
  const matches = bundles.value.filter((item) => item.document.documentTypeId === typeId);
  if (matches.length === 0) {
    return null;
  }
  const first = matches[0];
  if (!first) {
    return null;
  }
  return matches.reduce((latest, item) => {
    const itemTime = item.document.createdAt ? new Date(item.document.createdAt).getTime() : 0;
    const latestTime = latest.document.createdAt
      ? new Date(latest.document.createdAt).getTime()
      : 0;
    return itemTime > latestTime ? item : latest;
  }, first);
}

const criticalEntries = computed(() =>
  CRITICAL_DOCUMENTS.map((entry) => {
    const type = types.value.find((candidate) => candidate.code === entry.code) ?? null;
    const bundle = type ? latestForType(type.id) : null;
    return {
      code: entry.code,
      icon: entry.icon,
      label: t(entry.labelKey),
      typeId: type?.id ?? null,
      document: bundle
        ? {
            id: bundle.document.id,
            title: bundle.document.title,
            status: bundle.document.status,
            fileName: bundle.version?.fileName ?? null,
            mimeType: bundle.version?.mimeType ?? null,
            createdAt: bundle.document.createdAt ?? null,
          }
        : null,
    };
  }),
);

const doneCount = computed(
  () => criticalEntries.value.filter((entry) => entry.document !== null).length,
);
const totalCount = computed(() => CRITICAL_DOCUMENTS.length);
const progressLabel = computed(() =>
  t("documents.critical.progress", { done: doneCount.value, total: totalCount.value }),
);

const company = computed(
  () => (companyData.value?.company ?? null) as Record<string, unknown> | null,
);
const companyName = computed(() => {
  const record = company.value;
  if (!record) {
    return "";
  }
  if (locale.value.startsWith("ar")) {
    return (
      (record.legalNameAr as string) ||
      (record.tradeName as string) ||
      (record.legalName as string) ||
      ""
    );
  }
  return (record.tradeName as string) || (record.legalName as string) || "";
});

const uploaderOpen = ref(false);
const uploaderTypeId = ref<string | null>(null);
const detailSide = computed(() => (locale.value === "ar" ? "left" : "right"));

function openUploader(typeId: string | null) {
  uploaderTypeId.value = typeId;
  uploaderOpen.value = true;
}

async function reloadAll() {
  await Promise.all([refresh(), refreshTypes()]);
}

async function onUploaded(_result: UploadResult) {
  uploaderOpen.value = false;
  await Promise.all([refresh(), refreshTypes()]);
  toast.add({ title: t("documents.critical.success"), color: "success" });
}

async function viewDocument(documentId: string) {
  try {
    const result = await client.documents.url({ companyId: companyId.value, documentId });
    window.open(result.url, "_blank", "noopener");
  } catch {
    toast.add({ title: t("documents.critical.error"), color: "error" });
  }
}

watch(companyId, () => {
  uploaderOpen.value = false;
  uploaderTypeId.value = null;
});
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('documents.critical.title')"
      :subtitle="t('documents.critical.subtitle')"
      icon="i-tabler-info-circle"
      max-width="max-w-6xl"
    >
      <template #actions>
        <UBadge
          v-if="companyName"
          color="neutral"
          variant="subtle"
          size="lg"
          :label="companyName"
        />
        <UBadge color="primary" variant="subtle" size="lg" :label="progressLabel" />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-tabler-reload"
          :label="t('documents.list.refresh')"
          @click="reloadAll"
        />
      </template>
    </PageHeader>

    <div class="mx-auto w-full max-w-6xl space-y-6">
      <UAlert
        v-if="typesError || bundlesError"
        color="error"
        variant="soft"
        icon="i-tabler-alert-triangle"
        :title="t('documents.errors.generic')"
      >
        <template #actions>
          <UButton
            color="error"
            variant="soft"
            :label="t('documents.list.refresh')"
            @click="reloadAll"
          />
        </template>
      </UAlert>

      <LoadingState
        v-if="typesPending || bundlesPending"
        variant="skeleton-grid"
        :count="totalCount"
        :label="t('documents.list.loading')"
      />

      <EmptyState
        v-else-if="types.length === 0"
        icon="i-tabler-files-off"
        :title="t('documents.critical.missingType')"
        :description="t('documents.critical.subtitle')"
      />

      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CriticalDocumentCard
          v-for="entry in criticalEntries"
          :key="entry.code"
          :label="entry.label"
          :icon="entry.icon"
          :document="entry.document"
          @upload="openUploader(entry.typeId)"
          @view="entry.document && viewDocument(entry.document.id)"
        />
      </div>
    </div>

    <USlideover
      v-model:open="uploaderOpen"
      :title="t('documents.critical.uploadTitle')"
      :description="t('documents.critical.subtitle')"
      :side="detailSide"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <CriticalDocumentUploader
          v-model="uploaderTypeId"
          :company-id="companyId"
          :types="types"
          @uploaded="onUploaded"
        />
      </template>
    </USlideover>
  </div>
</template>
