<script setup lang="ts">
const props = defineProps<{
  code: string;
  description?: string | null;
}>();

const { t } = useI18n();

const whenToUse = computed(() => {
  const key = `actions.whenToUse.${props.code}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return props.description || t("actions.whenToUseFallback");
});
</script>

<template>
  <UTooltip :ui="{ content: 'h-auto' }" :content="{ side: 'top' }">
    <button
      type="button"
      class="inline-flex size-5 items-center justify-center rounded-md text-dimmed transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :aria-label="t('actions.whenToUseAria')"
    >
      <UIcon name="i-tabler-info-circle" class="size-4" />
    </button>

    <template #content>
      <p class="max-w-64 text-xs leading-relaxed">{{ whenToUse }}</p>
    </template>
  </UTooltip>
</template>
