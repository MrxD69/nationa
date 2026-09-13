<script setup lang="ts">
import type { CompanySummary } from "~/composables/useSelectedCompany";

const { t, locale } = useI18n();
const { companies, selectedCompanyId, selectedCompany, loading, selectCompany } =
  useSelectedCompany();

const arabic = computed(() => locale.value.startsWith("ar"));

function displayName(company: CompanySummary): string {
  const localized = arabic.value ? company.legalNameAr : null;
  return localized || company.tradeName || company.legalName;
}

const items = computed(() =>
  companies.value.map((company) => ({
    id: company.id,
    label: displayName(company),
    role: company.role ?? null,
  })),
);

const selected = computed<string | undefined>({
  get: () => selectedCompanyId.value ?? undefined,
  set: (value) => selectCompany(value ?? null),
});

const currentName = computed(() =>
  selectedCompany.value ? displayName(selectedCompany.value) : null,
);
</script>

<template>
  <USelectMenu
    v-model="selected"
    :items="items"
    value-key="id"
    label-key="label"
    search-input
    leading-icon="i-tabler-building-skyscraper"
    :loading="loading"
    :disabled="companies.length === 0"
    :placeholder="companies.length ? t('shell.company.select') : t('shell.company.noCompany')"
    class="w-52 sm:w-64"
  >
    <template #default>
      <span class="truncate">
        {{
          currentName ??
          (companies.length ? t("shell.company.select") : t("shell.company.noCompany"))
        }}
      </span>
      <UBadge
        v-if="selectedCompany?.role"
        color="neutral"
        variant="subtle"
        size="lg"
        class="ms-2 shrink-0"
        :label="t(`companies.roles.${selectedCompany.role}`)"
      />
    </template>

    <template #item-trailing="{ item }">
      <UBadge
        v-if="item.role"
        color="neutral"
        variant="outline"
        size="lg"
        :label="t(`companies.roles.${item.role}`)"
      />
    </template>
  </USelectMenu>
</template>
