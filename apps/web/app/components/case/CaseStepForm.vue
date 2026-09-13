<script setup lang="ts">
import { FIELD_LABELS } from "@nationa/api/domain/fields";
import type { FormFieldLabel } from "@nationa/api/domain/procedure-forms";

import CaseFieldProvenance from "~/components/case/CaseFieldProvenance.vue";
import CaseFieldRenderer from "~/components/case/CaseFieldRenderer.vue";

type FormField = {
  key: string;
  type: string;
  required: boolean;
  options?: string[];
  label?: FormFieldLabel;
};

type FormStep = {
  formSchema?: { version: number; fields: FormField[] };
};

const props = defineProps<{
  step: FormStep;
  modelValue: Record<string, unknown>;
  provenance?: Record<string, Array<Record<string, unknown>>>;
}>();

const emit = defineEmits<{ (event: "update:modelValue", value: Record<string, unknown>): void }>();

const { locale, t } = useI18n();

const fields = computed<FormField[]>(() => props.step.formSchema?.fields ?? []);
const regularFields = computed(() => fields.value.filter((field) => field.type !== "address"));
const addressFields = computed(() => fields.value.filter((field) => field.type === "address"));

function fieldLabel(field: FormField): string {
  const override = locale.value === "ar" ? field.label?.ar : field.label?.fr;
  if (override) {
    return override;
  }
  const labels = FIELD_LABELS[field.key as keyof typeof FIELD_LABELS];
  if (!labels) {
    return field.key;
  }
  return locale.value === "ar" ? (labels.ar ?? labels.fr) : labels.fr;
}

function setField(key: string, value: unknown): void {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}

function fieldValue(key: string): unknown {
  return props.modelValue[key] ?? null;
}
</script>

<template>
  <UForm :state="modelValue" class="grid gap-4">
    <UFormField
      v-for="field in regularFields"
      :key="field.key"
      :label="fieldLabel(field)"
      :required="field.required"
    >
      <CaseFieldRenderer
        :field="field"
        :model-value="fieldValue(field.key)"
        @update:model-value="setField(field.key, $event)"
      />
      <CaseFieldProvenance
        v-if="props.provenance?.[field.key]"
        :provenance="props.provenance[field.key]"
        class="mt-1"
      />
    </UFormField>

    <div v-if="addressFields.length" class="grid gap-4 rounded-lg border border-default p-4">
      <h3 class="text-base font-medium text-highlighted">{{ t("cases.sections.addresses") }}</h3>
      <UFormField
        v-for="field in addressFields"
        :key="field.key"
        :label="fieldLabel(field)"
        :required="field.required"
      >
        <CaseFieldRenderer
          :field="field"
          :model-value="fieldValue(field.key)"
          @update:model-value="setField(field.key, $event)"
        />
        <CaseFieldProvenance
          v-if="props.provenance?.[field.key]"
          :provenance="props.provenance[field.key]"
          class="mt-1"
        />
      </UFormField>
    </div>
  </UForm>
</template>
