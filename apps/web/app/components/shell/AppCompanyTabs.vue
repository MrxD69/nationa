<script setup lang="ts">
import { COMPANY_TABS, resolveCompanyPath } from "~/constants/navigation";

const { t } = useI18n();
const route = useRoute();
const { selectedCompanyId } = useSelectedCompany();

const tabs = computed(() =>
  [...COMPANY_TABS]
    .sort((a, b) => a.priority - b.priority)
    .map((tab) => ({
      key: tab.key,
      icon: tab.icon,
      label: t(tab.labelKey),
      to: resolveCompanyPath(tab.to, selectedCompanyId.value),
    })),
);

const activeKey = computed(() => {
  const path = route.path;
  let best: { key: string; length: number } | null = null;

  for (const tab of COMPANY_TABS) {
    for (const prefix of tab.matchPrefixes) {
      const resolved = resolveCompanyPath(prefix, selectedCompanyId.value);
      if (!resolved) {
        continue;
      }
      const matches = path === resolved || path.startsWith(`${resolved}/`);
      if (matches && (!best || resolved.length > best.length)) {
        best = { key: tab.key, length: resolved.length };
      }
    }
  }

  return best?.key ?? null;
});
</script>

<template>
  <div class="relative min-w-0">
    <nav
      class="flex min-w-0 scroll-px-4 items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      :aria-label="t('shell.company.portfolio')"
    >
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        :aria-current="tab.key === activeKey ? 'page' : undefined"
        class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-4 py-2.5 text-base font-medium whitespace-nowrap transition-control"
        :class="
          tab.key === activeKey
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-transparent text-toned hover-surface hover:text-highlighted'
        "
      >
        <UIcon :name="tab.icon" class="size-6 shrink-0" />
        {{ tab.label }}
      </NuxtLink>
    </nav>

    <!-- Edge fades hint that the tab strip scrolls. Side flips in RTL. -->
    <div
      class="pointer-events-none absolute inset-y-0 start-0 w-8 bg-linear-to-r from-[var(--ui-bg)] to-transparent rtl:bg-linear-to-l"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-y-0 end-0 w-8 bg-linear-to-l from-[var(--ui-bg)] to-transparent rtl:bg-linear-to-r"
      aria-hidden="true"
    />
  </div>
</template>
