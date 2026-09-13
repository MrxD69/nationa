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
  <div class="min-w-0">
    <nav
      class="flex min-w-0 scroll-px-4 items-center gap-2 overflow-x-auto pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      :aria-label="t('shell.company.portfolio')"
    >
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to"
        :aria-current="tab.key === activeKey ? 'page' : undefined"
        class="inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-4 pt-2.5 pb-3 text-base font-medium whitespace-nowrap transition-[color,border-color] duration-150 ease-out"
        :class="
          tab.key === activeKey
            ? 'border-b-primary text-primary'
            : 'border-b-transparent text-toned hover:text-highlighted'
        "
      >
        <UIcon v-if="tab.key === activeKey" :name="tab.icon" class="size-6 shrink-0" />
        {{ tab.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
