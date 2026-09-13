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
  <div class="space-y-3">
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
        icon="i-tabler-printer"
        :label="t('docgen.artifact.print')"
        @click="print"
      />
    </div>

    <div
      class="docgen-doc border-t border-default pt-4"
      :dir="dir"
      :lang="props.payload.language as DocLang"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="props.payload.render.html" />
    </div>

    <details v-if="resolvedDocumentId || resolvedStorageKey" class="border-t border-default pt-3">
      <summary class="cursor-pointer text-sm font-medium text-toned">
        {{ t("docgen.artifact.technical") }}
      </summary>
      <p class="mt-1 text-sm text-muted">{{ t("docgen.artifact.technicalHint") }}</p>
      <dl class="mt-2 grid gap-1 text-sm text-muted">
        <div v-if="resolvedDocumentId" class="flex flex-wrap gap-2">
          <dt class="font-medium">{{ t("docgen.artifact.documentId") }}</dt>
          <dd class="break-all" dir="ltr">{{ resolvedDocumentId }}</dd>
        </div>
        <div v-if="resolvedStorageKey" class="flex flex-wrap gap-2">
          <dt class="font-medium">{{ t("docgen.artifact.storageKey") }}</dt>
          <dd class="break-all" dir="ltr">{{ resolvedStorageKey }}</dd>
        </div>
      </dl>
    </details>
  </div>
</template>
