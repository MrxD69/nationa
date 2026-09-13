<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from "@nuxt/ui";

import { COMPANY_TABS, resolveCompanyPath } from "~/constants/navigation";
import type { ActionCatalogItem } from "~/composables/useActions";
import type { CompanySummary } from "~/composables/useSelectedCompany";

const { t, locale } = useI18n();
const { open, setOpen } = useCommandPalette();
const { companies, selectedCompanyId, accessibleCompanyId, selectCompany, hasCompany } =
  useSelectedCompany();
const { catalogQuery } = useActions();
const visibleRailItems = useVisibleRailItems();

const companyId = computed(() => accessibleCompanyId.value ?? undefined);

const catalog = catalogQuery({ companyId });

function close() {
  setOpen(false);
}

function navigate(to: string | { path: string; query?: Record<string, string> }) {
  close();
  void navigateTo(to);
}

function companyLabel(company: CompanySummary): string {
  if (locale.value === "ar") {
    return company.legalNameAr || company.legalName || company.tradeName || "";
  }
  return company.tradeName || company.legalName;
}

function actionLabel(action: ActionCatalogItem): string {
  return locale.value === "ar" ? (action.nameAr ?? action.nameFr) : action.nameFr;
}

const companyItems = computed<CommandPaletteItem[]>(() =>
  companies.value.map((company) => ({
    id: `company:${company.id}`,
    label: companyLabel(company),
    icon: "i-tabler-building-skyscraper",
    onSelect: () => {
      selectCompany(company.id);
      navigate(`/companies/${company.id}`);
    },
  })),
);

const navigationItems = computed<CommandPaletteItem[]>(() => {
  const items: CommandPaletteItem[] = [];

  for (const railItem of visibleRailItems.value) {
    if (!railItem.to) {
      continue;
    }
    const to = railItem.to;
    items.push({
      id: `nav:${railItem.key}`,
      label: railItem.label ?? t(railItem.labelKey),
      icon: railItem.icon,
      onSelect: () => navigate(to),
    });
  }

  for (const tab of COMPANY_TABS) {
    const to = resolveCompanyPath(tab.to, selectedCompanyId.value);
    items.push({
      id: `tab:${tab.key}`,
      label: t(tab.labelKey),
      icon: tab.icon,
      onSelect: () => navigate(to),
    });
  }

  return items;
});

const actionItems = computed<CommandPaletteItem[]>(() =>
  (catalog.data.value ?? []).map((action) => ({
    id: `action:${action.id}`,
    label: actionLabel(action),
    description:
      locale.value === "ar"
        ? (action.agencyNameAr ?? action.agencyNameFr ?? undefined)
        : (action.agencyNameFr ?? undefined),
    icon: "i-tabler-list-check",
    onSelect: () => {
      const query: Record<string, string> = {};
      if (accessibleCompanyId.value) {
        query.companyId = accessibleCompanyId.value;
      }
      navigate({ path: `/actions/${action.id}`, query });
    },
  })),
);

const groups = computed<CommandPaletteGroup[]>(() => {
  const result: CommandPaletteGroup[] = [];

  if (companyItems.value.length > 0) {
    result.push({
      id: "companies",
      label: t("shell.command.groups.companies"),
      items: companyItems.value,
    });
  }

  if (navigationItems.value.length > 0) {
    result.push({
      id: "navigation",
      label: t("shell.command.groups.navigation"),
      items: navigationItems.value,
    });
  }

  if (hasCompany.value && actionItems.value.length > 0) {
    result.push({
      id: "actions",
      label: t("shell.command.groups.actions"),
      items: actionItems.value,
    });
  }

  return result;
});
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-3xl' }">
    <template #content>
      <UCommandPalette
        :groups="groups"
        :placeholder="$t('shell.command.placeholder')"
        close
        class="h-80 sm:h-[26rem]"
        @update:open="setOpen"
        @update:model-value="close"
      >
        <template #empty>
          {{ $t("shell.command.empty") }}
        </template>
      </UCommandPalette>
    </template>
  </UModal>
</template>
