<script setup lang="ts">
const props = defineProps<{ modelValue: string; placeholder?: string }>();

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "search", value: string): void;
}>();

const { t } = useI18n();

let timer: ReturnType<typeof setTimeout> | undefined;

function onInput(value: string | number): void {
  const next = String(value ?? "");
  emit("update:modelValue", next);
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => emit("search", next), 300);
}

onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer);
  }
});
</script>

<template>
  <UInput
    :model-value="props.modelValue"
    :placeholder="props.placeholder ?? t('actions.search.placeholder')"
    icon="i-tabler-search"
    size="lg"
    class="w-full"
    :ui="{ base: 'w-full' }"
    @update:model-value="onInput"
  />
</template>
