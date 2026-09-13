<script setup lang="ts">
const props = defineProps<{
  to: string;
  title?: string;
}>();

const { t } = useI18n();
</script>

<template>
  <UTooltip :content="{ side: 'top' }" :ui="{ content: 'h-auto' }">
    <NuxtLink
      :to="props.to"
      class="inline-flex size-5 items-center justify-center rounded-md text-dimmed transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :aria-label="t('companies.detail.demarche.aria')"
    >
      <UIcon name="i-tabler-info-circle" class="size-4" />
    </NuxtLink>

    <template #content>
      <div class="max-w-64 space-y-1.5">
        <p v-if="props.title" class="text-sm font-medium">{{ props.title }}</p>
        <p class="text-xs text-muted">{{ t("companies.detail.demarche.hint") }}</p>
        <p class="text-xs font-medium text-primary">{{ t("companies.detail.demarche.cta") }}</p>
      </div>
    </template>
  </UTooltip>
</template>
