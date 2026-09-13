<script setup lang="ts">
type DocumentVersion = {
  id: string;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

type DocumentEntry = {
  document?: { id?: string; title?: string | null; documentTypeId?: string | null } | null;
  version?: DocumentVersion | null;
  addedAt?: string | Date | null;
};

const props = defineProps<{
  documents: DocumentEntry[];
  agencyId?: string;
  companyId?: string;
}>();

const { t } = useI18n();
const api = useApi();

const selectedId = ref<string | null>(null);
const url = ref<string | null>(null);
const loading = ref(false);
const loadError = ref(false);

const selected = computed(() => {
  if (!selectedId.value) {
    return null;
  }
  return props.documents.find((entry) => entry.version?.id === selectedId.value) ?? null;
});

const isImage = computed(() => selected.value?.version?.mimeType?.startsWith("image/") ?? false);
const isPdf = computed(() => selected.value?.version?.mimeType === "application/pdf");

async function select(entry: DocumentEntry) {
  const versionId = entry.version?.id;
  if (!versionId) {
    return;
  }
  selectedId.value = versionId;
  url.value = null;
  loadError.value = false;
  loading.value = true;
  try {
    const result = props.agencyId
      ? await api.officer.documentUrl({ agencyId: props.agencyId, documentVersionId: versionId })
      : props.companyId
        ? await api.submissions.documentUrl({
            companyId: props.companyId,
            documentVersionId: versionId,
          })
        : null;
    url.value = result?.url ?? null;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.documents,
  (entries) => {
    if (entries.length > 0 && !selectedId.value) {
      void select(entries[0]!);
    }
  },
  { immediate: true },
);
</script>

<template>
  <UCard class="flex h-full flex-col" :ui="{ root: 'rounded-lg' }">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold text-highlighted">
          {{ t("officer.review.documents") }}
        </h2>
        <UBadge color="neutral" variant="soft" size="lg">{{ documents.length }}</UBadge>
      </div>
    </template>

    <div v-if="documents.length === 0" class="text-base text-muted">
      {{ t("officer.review.noDocuments") }}
    </div>

    <div v-else class="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <ul class="max-h-80 space-y-1 overflow-y-auto lg:max-h-none">
        <li v-for="(entry, index) in documents" :key="entry.version?.id ?? index">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-base transition-control"
            :class="
              entry.version?.id === selectedId
                ? 'bg-elevated text-highlighted'
                : 'text-muted hover-surface'
            "
            @click="select(entry)"
          >
            <UIcon name="i-tabler-file-text" class="size-4 shrink-0" />
            <span class="min-w-0 flex-1 truncate">
              {{ entry.document?.title || entry.version?.fileName || "—" }}
            </span>
          </button>
        </li>
      </ul>

      <div class="min-h-80 overflow-hidden rounded-md border border-default bg-elevated/40">
        <div v-if="loading" class="flex h-80 items-center justify-center text-muted">
          <UIcon name="i-tabler-loader-2" class="size-5 animate-spin" />
        </div>

        <div
          v-else-if="!url"
          class="flex h-80 flex-col items-center justify-center gap-2 p-4 text-center text-muted"
        >
          <UIcon name="i-tabler-file-off" class="size-6" />
          <p class="text-base">{{ t("officer.review.previewUnavailable") }}</p>
        </div>

        <img v-else-if="isImage" :src="url" alt="" class="max-h-[32rem] w-full object-contain" />

        <iframe v-else-if="isPdf" :src="url" class="h-96 w-full lg:h-[32rem]" title="document" />

        <div v-else class="flex h-80 flex-col items-center justify-center gap-3 p-4 text-center">
          <p class="text-base text-muted">{{ t("officer.review.previewUnavailable") }}</p>
        </div>

        <div v-if="url" class="flex justify-end border-t border-default p-2">
          <UButton
            :to="url"
            target="_blank"
            rel="noopener"
            color="neutral"
            variant="ghost"
            icon="i-tabler-external-link"
            :label="t('officer.review.openDocument')"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>
