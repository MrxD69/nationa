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

const singleCompany = computed(() => (companies.value.length === 1 ? companies.value[0] : null));
</script>

<template>
  <UButton
    v-if="!loading && companies.length === 0"
    to="/companies/new"
    icon="i-tabler-plus"
    :label="t('shell.company.create')"
    class="w-full min-w-0 justify-center sm:w-64"
  />

  <div
    v-else-if="!loading && singleCompany"
    class="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-muted bg-elevated px-3"
    :title="t('shell.company.switchLabel')"
  >
    <UIcon name="i-tabler-building-skyscraper" class="size-6 shrink-0 text-dimmed" />
    <span class="min-w-0 flex-1 truncate">{{ displayName(singleCompany) }}</span>
    <UBadge
      v-if="singleCompany.role"
      color="neutral"
      variant="subtle"
      size="lg"
      class="shrink-0"
      :label="t(`companies.roles.${singleCompany.role}`)"
    />
  </div>

  <USelectMenu
    v-else
    v-model="selected"
    :items="items"
    value-key="id"
    label-key="label"
    search-input
    leading-icon="i-tabler-building-skyscraper"
    :loading="loading"
    :aria-label="t('shell.company.switchLabel')"
    :placeholder="companies.length ? t('shell.company.select') : t('shell.company.noCompany')"
    class="w-full min-w-0 sm:w-64"
  >
    <template #default>
      <span class="min-w-0 truncate">
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
