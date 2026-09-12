<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import { COMPANY_TABS, dirForLocale, resolveCompanyPath } from "~/constants/navigation";

const { t, locale } = useI18n();
const route = useRoute();
const { selectedCompanyId } = useSelectedCompany();

const dir = computed(() => dirForLocale(locale.value));

const tabs = computed(() =>
  [...COMPANY_TABS]
    .sort((a, b) => a.priority - b.priority)
    .map((tab) => ({
      key: tab.key,
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

const moreItems = computed<DropdownMenuItem[]>(() =>
  tabs.value.map((tab) => ({
    label: tab.label,
    to: tab.to,
    active: tab.key === activeKey.value,
    color: tab.key === activeKey.value ? "primary" : undefined,
  })),
);
</script>

<template>
  <nav class="flex min-w-0 items-center gap-1">
    <div
      class="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        :aria-current="tab.key === activeKey ? 'page' : undefined"
        class="inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors"
        :class="
          tab.key === activeKey
            ? 'bg-elevated text-highlighted'
            : 'text-muted hover:bg-elevated hover:text-highlighted'
        "
      >
        {{ tab.label }}
      </NuxtLink>
    </div>

    <UDropdownMenu :items="moreItems" :content="{ align: dir === 'rtl' ? 'start' : 'end' }">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        trailing-icon="i-tabler-chevron-down"
        :label="t('shell.company.more')"
      />
    </UDropdownMenu>
  </nav>
</template>
