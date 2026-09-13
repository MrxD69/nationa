<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
definePageMeta({ layout: "app", middleware: "auth" });

const { locale, t } = useI18n();
const { accessibleCompanyId } = useSelectedCompany();
const api = useCase();

const companyId = computed(() => accessibleCompanyId.value ?? undefined);

const { data, isLoading, isError, error, refetch } = api.casesQuery({
  companyId: companyId.value,
});

watch(accessibleCompanyId, () => {
  void refetch();
});

const cases = computed(() => data.value ?? []);

const statusColor: Record<
  string,
  "primary" | "info" | "success" | "warning" | "error" | "neutral"
> = {
  draft: "neutral",
  in_progress: "info",
  awaiting_user: "warning",
  awaiting_review: "warning",
  submitted: "success",
  approved: "success",
  rejected: "error",
  cancelled: "neutral",
};

function caseTitle(item: {
  title: string;
  procedure?: { nameFr: string | null; nameAr: string | null } | null;
}): string {
  return item.title || item.procedure?.nameFr || "";
}

function procedureName(item: {
  procedure?: { nameFr: string | null; nameAr: string | null } | null;
}): string {
  if (!item.procedure) {
    return "";
  }
  return locale.value === "ar"
    ? (item.procedure.nameAr ?? item.procedure.nameFr ?? "")
    : (item.procedure.nameFr ?? "");
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale.value);
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6">
    <PageHeader
      :title="t('cases.list.title')"
      :subtitle="t('cases.list.subtitle')"
      max-width="max-w-6xl"
    >
      <template #actions>
        <UButton to="/cases/new" icon="i-tabler-plus" :label="t('cases.list.new')" />
      </template>
    </PageHeader>

    <LoadingState
      v-if="isLoading"
      variant="skeleton-rows"
      :count="4"
      :label="t('cases.list.loading')"
    />

    <UAlert
      v-else-if="isError"
      color="error"
      variant="subtle"
      :title="t('cases.list.error')"
      :description="error?.message"
    >
      <template #actions>
        <UButton color="error" variant="soft" :label="t('cases.list.retry')" @click="refetch()" />
      </template>
    </UAlert>

    <EmptyState
      v-else-if="cases.length === 0"
      icon="i-tabler-folder"
      :title="t('cases.list.empty')"
    >
      <UButton to="/cases/new" icon="i-tabler-plus" :label="t('cases.list.new')" />
    </EmptyState>

    <div v-else class="divide-y divide-default overflow-hidden rounded-lg border border-default">
      <NuxtLink
        v-for="item in cases"
        :key="item.id"
        :to="`/cases/${item.id}`"
        class="hover-surface flex flex-wrap items-center justify-between gap-4 px-5 py-4"
      >
        <div class="min-w-0 space-y-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="truncate text-lg font-semibold text-highlighted">
              {{ caseTitle(item) }}
            </span>
            <UBadge :color="statusColor[item.status] ?? 'neutral'" variant="subtle" size="lg">
              {{ t(`cases.status.${item.status}`, item.status) }}
            </UBadge>
          </div>
          <p class="flex flex-wrap items-center gap-2 text-base text-muted">
            {{ procedureName(item) }}
            <span v-if="item.procedure?.agencyId" class="inline-flex items-center gap-1.5">
              ·
              <AgencyMark :agency-id="item.procedure.agencyId" size="sm" />
            </span>
            <span v-if="formatDate(item.updatedAt)">· {{ formatDate(item.updatedAt) }}</span>
          </p>
        </div>

        <UIcon name="i-tabler-chevron-right" class="size-6 shrink-0 text-muted rtl:rotate-180" />
      </NuxtLink>
    </div>
  </div>
</template>
