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
  <NuxtLink
    :to="`/companies/${company.id}`"
    class="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-elevated focus:outline-none focus-visible:bg-elevated"
  >
    <UIcon name="i-tabler-building-skyscraper" class="size-8 shrink-0 text-muted" />

    <div class="min-w-0 flex-1 space-y-1">
      <p class="truncate text-lg font-semibold text-highlighted">{{ displayName }}</p>

      <div class="flex flex-wrap items-center gap-2 text-base text-muted">
        <span v-if="company.uniqueIdentifier" class="truncate">
          {{ company.uniqueIdentifier }}
        </span>
        <span v-if="company.taxId" class="truncate">{{ company.taxId }}</span>
      </div>
    </div>

    <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <UBadge
        v-if="company.role"
        color="neutral"
        variant="outline"
        size="lg"
        :label="t(`companies.roles.${company.role}`)"
      />
      <UBadge
        v-if="company.status"
        color="neutral"
        variant="subtle"
        size="lg"
        :label="t(`companies.status.${company.status}`)"
      />
      <UIcon name="i-tabler-chevron-right" class="size-6 text-muted rtl:rotate-180" />
    </div>
  </NuxtLink>
</template>
