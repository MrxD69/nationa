<script setup lang="ts">
import CompanyCard from "./CompanyCard.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

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
  <LoadingState v-if="loading" variant="skeleton-list" :count="4" />

  <EmptyState
    v-else-if="companies.length === 0"
    icon="i-tabler-building-skyscraper"
    :title="t('companies.empty.title')"
    :description="t('companies.empty.description')"
  />

  <div v-else class="divide-y divide-default overflow-hidden rounded-lg border border-default">
    <CompanyCard v-for="company in companies" :key="company.id" :company="company" />
  </div>
</template>
