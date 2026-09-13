<script setup lang="ts">
import type { DocgenDraftPayload } from "~/composables/useDocgen";
import type { DocLang } from "@nationa/api/documents/templates/types";

const props = defineProps<{
  payload: DocgenDraftPayload;
}>();

const { t, locale } = useI18n();

const dir = computed(() => (props.payload.language === "ar" ? "rtl" : "ltr"));
const citations = computed(() => props.payload.citations ?? []);

function citationTitle(citation: DocgenDraftPayload["citations"][number]): string {
  const title = locale.value === "ar" ? citation.titleAr : citation.titleFr;
  const article = citation.article ? `art. ${citation.article}` : null;
  return [citation.source, article, title].filter(Boolean).join(" — ");
}

const severityColor: Record<string, "info" | "warning" | "error"> = {
  info: "info",
  warning: "warning",
  critical: "error",
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-base font-semibold text-highlighted">{{ t("docgen.preview.title") }}</h2>
        <p class="text-sm text-muted">{{ t("docgen.preview.subtitle") }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <UBadge color="secondary" variant="subtle" size="lg" :label="t('docgen.source.ai')" />
        <UBadge color="neutral" variant="subtle" size="lg" :label="t('docgen.source.blank')" />
        <UBadge color="info" variant="subtle" size="lg" :label="t('docgen.source.document')" />
      </div>
    </div>

    <UAlert
      v-for="(flag, index) in props.payload.delicateFlags ?? []"
      :key="`flag-${index}`"
      :color="severityColor[flag.severity] ?? 'warning'"
      variant="soft"
      icon="i-tabler-alert-triangle"
      :title="t('docgen.preview.delicateTitle')"
      :description="`${flag.summary}${flag.reasons.length ? ` — ${flag.reasons.join(', ')}` : ''}`"
    />

    <UAlert
      v-if="props.payload.rationale"
      color="neutral"
      variant="soft"
      icon="i-tabler-sparkles"
      :title="t('docgen.preview.rationale')"
      :description="props.payload.rationale"
    />

    <div
      class="docgen-preview rounded-lg border border-default bg-elevated p-6"
      :dir="dir"
      :lang="props.payload.language as DocLang"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="props.payload.render.html" />
    </div>

    <div v-if="citations.length > 0" class="space-y-2">
      <h3 class="text-sm font-semibold text-highlighted">{{ t("docgen.preview.citations") }}</h3>
      <ul class="divide-y divide-default border-t border-default">
        <li v-for="citation in citations" :key="citation.id" class="py-2 text-sm text-toned">
          <UIcon name="i-tabler-file-text" class="me-1 inline size-3.5 align-[-2px]" />
          <a
            v-if="citation.url"
            :href="citation.url"
            target="_blank"
            rel="noopener noreferrer"
            class="underline"
          >
            {{ citationTitle(citation) }}
          </a>
          <span v-else>{{ citationTitle(citation) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.docgen-preview :deep(.docgen-blank) {
  color: var(--ui-text-muted);
  letter-spacing: 0.08em;
}

.docgen-preview :deep(.docgen-value[data-source="ai"]) {
  background-color: color-mix(in srgb, var(--ui-color-secondary-500) 14%, transparent);
  border-bottom: 1px solid var(--ui-color-secondary-500);
  border-radius: 2px;
  padding: 0 0.15rem;
}

.docgen-preview :deep(.docgen-field) {
  margin: 0.35rem 0;
}

.docgen-preview :deep(.docgen-label) {
  font-weight: 600;
}

.docgen-preview :deep(.docgen-citations) {
  list-style: none;
  margin: 0.15rem 0 0;
  padding: 0;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.docgen-preview :deep(.docgen-signature) {
  margin-top: 2rem;
}
</style>
