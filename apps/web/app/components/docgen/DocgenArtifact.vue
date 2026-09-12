<script setup lang="ts">
import type { DocgenDraftPayload } from "~/composables/useDocgen";
import type { DocLang } from "@nationa/api/documents/templates/types";

const props = defineProps<{
  payload: DocgenDraftPayload;
  status: string;
  documentId?: string | null;
  storageKey?: string | null;
}>();

const { t } = useI18n();

const dir = computed(() => (props.payload.language === "ar" ? "rtl" : "ltr"));
const resolvedDocumentId = computed(
  () => props.documentId ?? props.payload.approvedDocumentId ?? null,
);
const resolvedStorageKey = computed(
  () => props.storageKey ?? props.payload.approvedStorageKey ?? null,
);

function print(): void {
  if (typeof window !== "undefined") {
    window.print();
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <UBadge
          color="primary"
          variant="subtle"
          icon="i-tabler-file-check"
          :label="t('docgen.artifact.generated')"
        />
        <UBadge
          color="neutral"
          variant="subtle"
          :label="t(`docgen.status.${props.status}`, props.status)"
        />
      </div>
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        icon="i-tabler-printer"
        :label="t('docgen.artifact.print')"
        @click="print"
      />
    </div>

    <div
      class="docgen-artifact rounded-lg border border-default bg-white p-8 text-slate-900"
      :dir="dir"
      :lang="props.payload.language as DocLang"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="props.payload.render.html" />
    </div>

    <dl class="grid gap-1 text-xs text-muted">
      <div v-if="resolvedDocumentId" class="flex flex-wrap gap-2">
        <dt class="font-medium">{{ t("docgen.artifact.documentId") }}</dt>
        <dd class="break-all">{{ resolvedDocumentId }}</dd>
      </div>
      <div v-if="resolvedStorageKey" class="flex flex-wrap gap-2">
        <dt class="font-medium">{{ t("docgen.artifact.storageKey") }}</dt>
        <dd class="break-all">{{ resolvedStorageKey }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.docgen-artifact {
  font-family:
    "Inter", "Noto Naskh Arabic", "Noto Sans Arabic", "Segoe UI", Tahoma, system-ui, sans-serif;
}

.docgen-artifact :deep(.docgen-value[data-source="ai"]) {
  background-color: color-mix(in srgb, var(--ui-color-secondary-500) 14%, transparent);
  border-bottom: 1px solid var(--ui-color-secondary-500);
}

.docgen-artifact :deep(.docgen-blank) {
  color: #64748b;
  letter-spacing: 0.08em;
}

@media print {
  .docgen-artifact {
    border: none;
    padding: 0;
  }
}
</style>
