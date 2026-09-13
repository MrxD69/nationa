<script setup lang="ts">
import IntegrityPanel from "~/components/officer/trust/IntegrityPanel.vue";

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
  agencyId?: string | null;
  companyId?: string;
}>();

const { t } = useI18n();
const toast = useToast();
const api = useApi();

const selectedId = ref<string | null>(null);
const url = ref<string | null>(null);
const loading = ref(false);
const loadError = ref(false);

const integrityOpen = ref(false);
const integrityLoading = ref(false);
const integrityError = ref(false);
const integrityData = ref<any>(null);
const integrityByVersion = ref<Record<string, { hasHash: boolean }>>({});

function formatBytes(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "—";
  }
  const units = ["o", "Ko", "Mo", "Go"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? String(size) : size.toFixed(size >= 10 ? 0 : 1);
  return `${rounded} ${units[unit]}`;
}

function fileTypeLabel(mimeType?: string | null): string {
  if (!mimeType) {
    return t("officerTrust.dossier.document.typeOther");
  }
  if (mimeType === "application/pdf") {
    return t("officerTrust.dossier.document.typePdf");
  }
  if (mimeType.startsWith("image/")) {
    return t("officerTrust.dossier.document.typeImage");
  }
  return t("officerTrust.dossier.document.typeOther");
}

function isVerified(entry: DocumentEntry): boolean {
  const versionId = entry.version?.id;
  if (!versionId) {
    return false;
  }
  return integrityByVersion.value[versionId]?.hasHash === true;
}

async function verify(entry: DocumentEntry) {
  const versionId = entry.version?.id;
  if (!versionId || !props.agencyId) {
    return;
  }
  integrityOpen.value = true;
  integrityLoading.value = true;
  integrityError.value = false;
  integrityData.value = null;
  try {
    const result = await api.officer.documentIntegrity({
      agencyId: props.agencyId,
      documentVersionId: versionId,
    });
    integrityData.value = result;
    integrityByVersion.value = {
      ...integrityByVersion.value,
      [versionId]: { hasHash: result?.hasHash === true },
    };
  } catch {
    integrityError.value = true;
    toast.add({ title: t("officerTrust.integrity.error"), color: "error" });
  } finally {
    integrityLoading.value = false;
  }
}

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
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex items-center justify-between gap-2 pb-2">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
        {{ t("officer.review.documents") }}
      </h2>
      <UBadge color="neutral" variant="soft" size="sm">{{ documents.length }}</UBadge>
    </div>

    <div v-if="documents.length === 0" class="pt-3 text-sm text-muted">
      {{ t("officer.review.noDocuments") }}
    </div>

    <div v-else class="grid min-h-0 flex-1 gap-4 pt-3 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <ul
        class="min-h-0 w-full divide-y divide-default overflow-y-auto lg:max-h-none"
        :aria-label="t('officer.review.documents')"
      >
        <li v-for="(entry, index) in documents" :key="entry.version?.id ?? index">
          <button
            type="button"
            class="flex w-full items-start gap-2 px-3 py-2 text-start text-sm transition-control"
            :class="
              entry.version?.id === selectedId
                ? 'bg-accented/40 text-highlighted'
                : 'text-muted hover-surface'
            "
            @click="select(entry)"
          >
            <UIcon name="i-tabler-file-text" class="mt-0.5 size-4 shrink-0" />
            <span class="min-w-0 flex-1">
              <span class="block min-w-0 truncate">
                {{ entry.document?.title || entry.version?.fileName || "—" }}
              </span>
              <span class="mt-1 flex flex-wrap items-center gap-2">
                <span class="text-xs text-muted">
                  {{ fileTypeLabel(entry.version?.mimeType) }} ·
                  {{ formatBytes(entry.version?.size) }}
                </span>
                <UBadge
                  :color="isVerified(entry) ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                  :icon="isVerified(entry) ? 'i-tabler-shield-check' : 'i-tabler-shield-question'"
                  :label="
                    isVerified(entry)
                      ? t('officerTrust.integrity.verified')
                      : t('officerTrust.integrity.notVerified')
                  "
                />
              </span>
            </span>
          </button>

          <div v-if="agencyId" class="px-3 pb-2 ps-9">
            <UButton
              size="md"
              color="neutral"
              variant="soft"
              icon="i-tabler-shield-search"
              :label="t('officerTrust.dossier.document.verify')"
              @click="verify(entry)"
            />
          </div>
        </li>
      </ul>

      <!-- The preview is a viewer surface: it keeps a single frame border. -->
      <div class="flex min-h-80 flex-1 flex-col overflow-hidden rounded-md border border-default">
        <div v-if="loading" class="flex flex-1 items-center justify-center text-muted">
          <UIcon name="i-tabler-loader-2" class="size-5 animate-spin" />
        </div>

        <div
          v-else-if="!url"
          class="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-muted"
        >
          <UIcon name="i-tabler-file-off" class="size-6" />
          <p class="text-sm">{{ t("officer.review.previewUnavailable") }}</p>
        </div>

        <img v-else-if="isImage" :src="url" alt="" class="min-h-0 flex-1 object-contain" />

        <iframe v-else-if="isPdf" :src="url" class="min-h-0 flex-1" title="document" />

        <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p class="text-sm text-muted">{{ t("officer.review.previewUnavailable") }}</p>
        </div>

        <div v-if="url" class="flex justify-end border-t border-default p-2">
          <UButton
            :to="url"
            target="_blank"
            rel="noopener"
            size="md"
            color="neutral"
            variant="ghost"
            icon="i-tabler-external-link"
            :label="t('officer.review.openDocument')"
          />
        </div>
      </div>
    </div>

    <USlideover
      v-model:open="integrityOpen"
      :title="t('officerTrust.integrity.title')"
      :description="t('officerTrust.integrity.description')"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <UAlert
          v-if="integrityError && !integrityLoading"
          color="error"
          variant="subtle"
          :title="t('officerTrust.integrity.error')"
        />
        <IntegrityPanel v-else :integrity="integrityData" :loading="integrityLoading" />
      </template>
    </USlideover>
  </div>
</template>
