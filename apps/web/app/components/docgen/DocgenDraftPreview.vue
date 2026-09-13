<script setup lang="ts">
import type { DocgenDraftPayload } from "~/composables/useDocgen";
import type { DocLang } from "@nationa/api/documents/templates/types";

const props = defineProps<{
  payload: DocgenDraftPayload;
}>();

const { t, locale } = useI18n();

const dir = computed(() => (props.payload.language === "ar" ? "rtl" : "ltr"));
const citations = computed(() => props.payload.citations ?? []);
const delicateFlags = computed(() => props.payload.delicateFlags ?? []);

function citationTitle(citation: DocgenDraftPayload["citations"][number]): string {
  const title = locale.value === "ar" ? citation.titleAr : citation.titleFr;
  const article = citation.article ? `art. ${citation.article}` : null;
  return [citation.source, article, title].filter(Boolean).join(" — ");
}

const severityText: Record<string, string> = {
  info: "text-info",
  warning: "text-warning",
  critical: "text-error",
};
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="text-base font-semibold text-highlighted">{{ t("docgen.preview.title") }}</h2>
        <p class="text-sm text-muted">{{ t("docgen.preview.subtitle") }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <UBadge color="secondary" variant="subtle" size="md" :label="t('docgen.source.ai')" />
        <UBadge color="neutral" variant="subtle" size="md" :label="t('docgen.source.blank')" />
        <UBadge color="info" variant="subtle" size="md" :label="t('docgen.source.document')" />
      </div>
    </div>

    <ul v-if="delicateFlags.length > 0" class="divide-y divide-default border-y border-default">
      <li
        v-for="(flag, index) in delicateFlags"
        :key="`flag-${index}`"
        class="flex items-start gap-2 py-2 text-sm"
      >
        <UIcon
          name="i-tabler-alert-triangle"
          class="mt-0.5 size-4 shrink-0"
          :class="severityText[flag.severity] ?? 'text-warning'"
        />
        <p class="min-w-0">
          <span class="font-medium text-highlighted">{{ t("docgen.preview.delicateTitle") }}</span>
          <span class="text-muted">
            — {{ flag.summary }}{{ flag.reasons.length ? ` — ${flag.reasons.join(", ")}` : "" }}
          </span>
        </p>
      </li>
    </ul>

    <p v-if="props.payload.rationale" class="flex items-start gap-2 text-sm">
      <UIcon name="i-tabler-sparkles" class="mt-0.5 size-4 shrink-0 text-muted" />
      <span class="min-w-0">
        <span class="font-medium text-highlighted">{{ t("docgen.preview.rationale") }}</span>
        <span class="text-muted"> — {{ props.payload.rationale }}</span>
      </span>
    </p>

    <div
      class="docgen-doc border-t border-default pt-4"
      :dir="dir"
      :lang="props.payload.language as DocLang"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="props.payload.render.html" />
    </div>

    <div v-if="citations.length > 0" class="space-y-1 border-t border-default pt-3">
      <h3 class="text-sm font-semibold text-highlighted">{{ t("docgen.preview.citations") }}</h3>
      <ul class="divide-y divide-default">
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
