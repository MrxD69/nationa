<script setup lang="ts">
import type { DocgenMode, DocgenTemplateSummary } from "~/composables/useDocgen";
import type { DocLang } from "@nationa/api/documents/templates/types";

type PickerModel = {
  templateCode: string | null;
  language: DocLang;
  mode: DocgenMode;
};

const props = defineProps<{
  templates: DocgenTemplateSummary[];
  loading?: boolean;
  modelValue: PickerModel;
}>();

const emit = defineEmits<{ (event: "update:modelValue", value: PickerModel): void }>();

const { t, locale } = useI18n();

function localized(text: { fr: string; ar: string }): string {
  return locale.value === "ar" ? text.ar : text.fr;
}

const languageItems = computed(() => [
  { label: t("common.language.fr"), value: "fr" },
  { label: t("common.language.ar"), value: "ar" },
]);

const mode = computed({
  get: () => props.modelValue.mode,
  set: (value: DocgenMode) => emit("update:modelValue", { ...props.modelValue, mode: value }),
});

const language = computed({
  get: () => props.modelValue.language,
  set: (value: string) =>
    emit("update:modelValue", { ...props.modelValue, language: value as DocLang }),
});

function select(code: string): void {
  emit("update:modelValue", { ...props.modelValue, templateCode: code });
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-highlighted">{{ t("docgen.picker.title") }}</h2>
        <p class="text-sm text-muted">{{ t("docgen.picker.subtitle") }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <USelect
          v-model="language"
          :items="languageItems"
          class="min-w-32"
          :aria-label="t('docgen.picker.language')"
        />
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-highlighted">
        {{ t("docgen.picker.chooseTemplate") }}
      </h3>

      <div v-if="props.loading" class="flex items-center gap-2 py-6 text-base text-muted">
        <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
        {{ t("docgen.loading") }}
      </div>

      <div v-else-if="props.templates.length === 0" class="py-6 text-base text-muted">
        {{ t("docgen.picker.empty") }}
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="template in props.templates"
          :key="template.code"
          type="button"
          class="press rounded-lg border p-4 text-start transition-control"
          :class="
            props.modelValue.templateCode === template.code
              ? 'border-primary ring-2 ring-primary'
              : 'border-default hover-surface'
          "
          :aria-pressed="props.modelValue.templateCode === template.code"
          @click="select(template.code)"
        >
          <span class="text-base font-semibold text-highlighted">{{
            localized(template.title)
          }}</span>
          <p class="mt-1 text-sm text-muted">{{ localized(template.description) }}</p>
          <p class="mt-2 text-sm text-dimmed">
            {{ t("docgen.picker.fields", { count: template.fieldKeys.length }) }}
          </p>
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-semibold text-highlighted">{{ t("docgen.picker.chooseMode") }}</h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="press rounded-lg border p-3 text-start transition-control"
          :class="
            mode === 'template'
              ? 'border-primary ring-2 ring-primary'
              : 'border-default hover-surface'
          "
          :aria-pressed="mode === 'template'"
          @click="mode = 'template'"
        >
          <span class="flex items-center gap-2 text-base font-medium text-highlighted">
            <UIcon name="i-tabler-file-text" class="size-4" />
            {{ t("docgen.picker.modeTemplate") }}
          </span>
          <span class="mt-1 block text-sm text-muted">
            {{ t("docgen.picker.modeTemplateDescription") }}
          </span>
        </button>
        <button
          type="button"
          class="press rounded-lg border p-3 text-start transition-control"
          :class="
            mode === 'ai' ? 'border-primary ring-2 ring-primary' : 'border-default hover-surface'
          "
          :aria-pressed="mode === 'ai'"
          @click="mode = 'ai'"
        >
          <span class="flex items-center gap-2 text-base font-medium text-highlighted">
            <UIcon name="i-tabler-sparkles" class="size-4" />
            {{ t("docgen.picker.modeAi") }}
          </span>
          <span class="mt-1 block text-sm text-muted">
            {{ t("docgen.picker.modeAiDescription") }}
          </span>
        </button>
      </div>
    </div>

    <UAlert
      color="info"
      variant="soft"
      icon="i-tabler-info-square-rounded"
      :description="t('docgen.picker.provenanceNotice')"
    />
  </div>
</template>
