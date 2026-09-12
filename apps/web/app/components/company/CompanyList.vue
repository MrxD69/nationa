<script setup lang="ts">
import CompanyCard from "./CompanyCard.vue";

type CompanyListItem = {
  id: string;
  legalName: string;
  legalNameAr?: string | null;
  tradeName?: string | null;
  status?: string | null;
  uniqueIdentifier?: string | null;
  taxId?: string | null;
  role?: string | null;
};

defineProps<{ companies: CompanyListItem[]; loading?: boolean }>();

const { t } = useI18n();
</script>

<template>
  <div v-if="loading" class="flex items-center gap-2 text-sm text-muted">
    <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
    <span>{{ t("companies.loading") }}</span>
  </div>

  <div
    v-else-if="companies.length === 0"
    class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-default px-6 py-16 text-center"
  >
    <div class="flex size-12 items-center justify-center rounded-full bg-elevated">
      <UIcon name="i-tabler-building-skyscraper" class="size-6 text-muted" />
    </div>
    <div class="space-y-1">
      <p class="font-medium text-highlighted">{{ t("companies.empty.title") }}</p>
      <p class="text-sm text-muted">{{ t("companies.empty.description") }}</p>
    </div>
  </div>

  <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <CompanyCard v-for="company in companies" :key="company.id" :company="company" />
  </div>
</template>
