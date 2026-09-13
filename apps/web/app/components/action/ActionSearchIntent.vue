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

function clear(): void {
  if (timer) {
    clearTimeout(timer);
  }
  emit("update:modelValue", "");
  emit("search", "");
}

onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer);
  }
});
</script>

<template>
  <search class="block" v-reveal="{ y: 10, duration: 0.4 }">
    <UInput
      :model-value="props.modelValue"
      type="search"
      size="xl"
      autocomplete="off"
      :placeholder="props.placeholder ?? t('actions.search.placeholder')"
      :aria-label="t('actions.filters.searchLabel')"
      icon="i-tabler-search"
      class="w-full"
      :ui="{ base: 'w-full' }"
      @update:model-value="onInput"
    >
      <template v-if="props.modelValue" #trailing>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-tabler-x"
          :aria-label="t('actions.search.clear')"
          @click="clear"
        />
      </template>
    </UInput>
  </search>
</template>
