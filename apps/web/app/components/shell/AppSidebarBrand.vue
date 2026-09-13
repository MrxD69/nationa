<script setup lang="ts">
/**
 * Sidebar header brand: Tunisian coat of arms over the two-line state /
 * ministry label. Rendered white via a filter so it stays legible on the
 * solid navy sidebar.
 */
withDefaults(defineProps<{ to: string }>(), {});

const { t } = useI18n();
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex min-h-11 min-w-0 items-center gap-2.5 rounded-md px-1.5"
    :aria-label="t('shell.brand.aria')"
  >
    <img
      src="/brand/coat-of-arms-tunisia.svg"
      alt=""
      aria-hidden="true"
      class="h-9 w-auto shrink-0 brightness-0 invert"
    />
    <span class="min-w-0">
      <span class="sidebar-brand-title block truncate text-sm font-semibold leading-tight">
        {{ t("shell.brand.republic") }}
      </span>
      <span class="sidebar-brand-subtitle block truncate text-xs leading-tight">
        {{ t("shell.brand.ministry") }}
      </span>
    </span>
  </NuxtLink>
</template>
