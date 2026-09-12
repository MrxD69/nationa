<script setup lang="ts">
type CompanyCardData = {
  id: string;
  legalName: string;
  legalNameAr?: string | null;
  tradeName?: string | null;
  status?: string | null;
  uniqueIdentifier?: string | null;
  taxId?: string | null;
  role?: string | null;
};

const props = defineProps<{ company: CompanyCardData }>();

const { t } = useI18n();

const displayName = computed(
  () => props.company.tradeName || props.company.legalNameAr || props.company.legalName,
);
</script>

<template>
  <UCard class="flex h-full flex-col">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <NuxtLink
          :to="`/companies/${company.id}`"
          class="block truncate font-medium text-highlighted hover:underline"
        >
          {{ displayName }}
        </NuxtLink>
        <p v-if="company.uniqueIdentifier" class="mt-0.5 truncate text-xs text-muted">
          {{ company.uniqueIdentifier }}
        </p>
      </div>

      <UBadge
        v-if="company.status"
        color="neutral"
        variant="subtle"
        size="sm"
        :label="t(`companies.status.${company.status}`)"
      />
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
      <UBadge
        v-if="company.role"
        color="neutral"
        variant="outline"
        size="sm"
        :label="t(`companies.roles.${company.role}`)"
      />
      <span v-if="company.taxId">{{ company.taxId }}</span>
    </div>

    <template #footer>
      <UButton
        :to="`/companies/${company.id}`"
        color="neutral"
        variant="ghost"
        icon="i-tabler-arrow-right"
        block
        :label="t('companies.card.open')"
      />
    </template>
  </UCard>
</template>
