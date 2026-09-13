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
    dense?: boolean;
  }>(),
  { maxWidth: "max-w-5xl", dense: false },
);

const { t } = useI18n();

const resolvedBackLabel = computed(() => props.backLabel ?? t("common.actions.back"));
</script>

<template>
  <div class="mx-auto w-full" :class="[maxWidth, dense ? 'space-y-2' : 'space-y-4']">
    <div
      v-if="backTo || $slots.topActions"
      class="flex flex-wrap items-center justify-between gap-2"
    >
      <UButton
        v-if="backTo"
        :to="backTo"
        :label="resolvedBackLabel"
        icon="i-tabler-arrow-left"
        color="neutral"
        variant="ghost"
        :ui="{ leadingIcon: 'rtl:rotate-180' }"
      />
      <div v-if="$slots.topActions" class="ms-auto flex shrink-0 flex-wrap items-center gap-2">
        <slot name="topActions" />
      </div>
    </div>

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

    <div
      class="flex flex-col sm:flex-row sm:items-start sm:justify-between"
      :class="dense ? 'gap-2' : 'gap-4'"
    >
      <div class="flex min-w-0 flex-1 items-start" :class="dense ? 'gap-2' : 'gap-3'">
        <div
          v-if="icon"
          class="flex shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
          :class="dense ? 'size-8' : 'size-10'"
        >
          <UIcon :name="icon" :class="dense ? 'size-4' : 'size-5'" />
        </div>
        <div class="min-w-0 space-y-1">
          <h1
            :class="dense ? 'text-2xl font-semibold tracking-tight text-highlighted' : 'page-title'"
          >
            {{ title }}
          </h1>
          <slot name="subtitle">
            <p v-if="subtitle" :class="dense ? 'text-sm text-muted max-w-[90ch]' : 'page-subtitle'">
              {{ subtitle }}
            </p>
          </slot>
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
