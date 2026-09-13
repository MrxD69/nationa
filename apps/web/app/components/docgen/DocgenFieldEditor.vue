<script setup lang="ts">
import SectionHeader from "~/components/ui/SectionHeader.vue";
import type { DocgenField } from "@nationa/api/rpc/services/docgen.service";

const props = defineProps<{
  fields: DocgenField[];
  modelValue: Record<string, string>;
}>();

const emit = defineEmits<{ (event: "update:modelValue", value: Record<string, string>): void }>();

const { t, locale } = useI18n();

const colors: Record<string, "primary" | "info" | "secondary" | "neutral" | "warning"> = {
  user: "primary",
  document: "info",
  ai: "secondary",
  import: "neutral",
  system: "warning",
  blank: "neutral",
};

function label(field: DocgenField): string {
  return locale.value === "ar" ? field.labelAr : field.labelFr;
}

function valueFor(field: DocgenField): string {
  if (field.key in props.modelValue) {
    return props.modelValue[field.key] ?? "";
  }
  return field.valueText ?? "";
}

function isLong(field: DocgenField): boolean {
  return field.format === "longtext" || field.format === "address";
}

function setValue(field: DocgenField, value: string): void {
  emit("update:modelValue", { ...props.modelValue, [field.key]: value });
}

function sourceLabel(kind: string): string {
  return t(`docgen.source.${kind}`, kind);
}
</script>

<template>
  <section class="space-y-4">
    <SectionHeader :title="t('docgen.editor.title')" :description="t('docgen.editor.subtitle')" />

    <div class="grid gap-4 border-t border-default pt-4 sm:grid-cols-2">
      <UFormField v-for="field in props.fields" :key="field.key" :label="label(field)">
        <UTextarea
          v-if="isLong(field)"
          :model-value="valueFor(field)"
          :rows="2"
          class="w-full"
          :placeholder="t('docgen.editor.placeholder')"
          @update:model-value="setValue(field, String($event))"
        />
        <UInput
          v-else
          :model-value="valueFor(field)"
          :type="field.format === 'date' ? 'date' : 'text'"
          class="w-full"
          :placeholder="t('docgen.editor.placeholder')"
          @update:model-value="setValue(field, String($event))"
        />
        <div class="mt-1 flex flex-wrap items-center gap-1">
          <UBadge
            :color="colors[field.sourceKind] ?? 'neutral'"
            variant="subtle"
            size="lg"
            :label="sourceLabel(field.sourceKind)"
          />
          <UBadge
            v-if="field.citingKeys.length > 0"
            color="info"
            variant="subtle"
            size="lg"
            :label="t('docgen.editor.citations', { count: field.citingKeys.length })"
          />
        </div>
      </UFormField>
    </div>
  </section>
</template>
