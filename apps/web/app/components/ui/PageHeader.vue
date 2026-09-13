<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    icon?: string;
    backTo?: string | RouteLocationRaw;
    backLabel?: string;
    breadcrumbs?: Array<{ label: string; to?: string | RouteLocationRaw }>;
    maxWidth?: string;
  }>(),
  { maxWidth: "max-w-5xl" },
);

const { t } = useI18n();

const resolvedBackLabel = computed(() => props.backLabel ?? t("common.actions.back"));
</script>

<template>
  <div class="mx-auto w-full space-y-4" :class="maxWidth">
    <UButton
      v-if="backTo"
      :to="backTo"
      :label="resolvedBackLabel"
      icon="i-tabler-arrow-left"
      color="neutral"
      variant="ghost"
      :ui="{ leadingIcon: 'rtl:rotate-180' }"
    />

    <div v-if="$slots.breadcrumbs" class="min-w-0">
      <slot name="breadcrumbs" />
    </div>
    <nav v-else-if="breadcrumbs?.length" aria-label="Breadcrumb" class="min-w-0">
      <ol class="flex flex-wrap items-center gap-1 text-sm text-muted">
        <li
          v-for="(crumb, index) in breadcrumbs"
          :key="`${index}-${crumb.label}`"
          class="flex items-center gap-1"
        >
          <NuxtLink
            v-if="crumb.to"
            :to="crumb.to"
            class="hover-surface rounded-md px-1.5 py-0.5 transition-control"
          >
            {{ crumb.label }}
          </NuxtLink>
          <span v-else class="px-1.5 py-0.5 text-highlighted">{{ crumb.label }}</span>
          <UIcon
            v-if="index < breadcrumbs.length - 1"
            name="i-tabler-chevron-right"
            class="size-4 shrink-0 rtl:rotate-180"
          />
        </li>
      </ol>
    </nav>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex min-w-0 items-start gap-3">
        <div
          v-if="icon"
          class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
        >
          <UIcon :name="icon" class="size-5" />
        </div>
        <div class="min-w-0 space-y-1">
          <h1 class="page-title">{{ title }}</h1>
          <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
        </div>
      </div>

      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="$slots.meta" class="min-w-0">
      <slot name="meta" />
    </div>
  </div>
</template>
