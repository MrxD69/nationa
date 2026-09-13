<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";
definePageMeta({ layout: "app", middleware: "auth" });

const { locale, t } = useI18n();
const { selectedCompanyId } = useSelectedCompany();
const api = useCase();

const companyId = computed(() => selectedCompanyId.value ?? undefined);

const { data, isLoading, isError, error, refetch } = api.casesQuery({
  companyId: companyId.value,
});

watch(selectedCompanyId, () => {
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
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold text-highlighted">{{ t("cases.list.title") }}</h1>
        <p class="text-base text-muted">{{ t("cases.list.subtitle") }}</p>
      </div>
      <UButton to="/cases/new" icon="i-tabler-plus" :label="t('cases.list.new')" />
    </div>

    <div v-if="isLoading" class="flex items-center gap-2 text-base text-muted">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>{{ t("cases.list.loading") }}</span>
    </div>

    <UAlert
      v-else-if="isError"
      color="error"
      variant="subtle"
      :title="t('cases.list.error')"
      :description="error?.message"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="lg"
          :label="t('cases.list.retry')"
          @click="refetch()"
        />
      </template>
    </UAlert>

    <div v-else-if="cases.length === 0" class="space-y-3">
      <UAlert color="neutral" variant="subtle" :title="t('cases.list.empty')" />
    </div>

    <div v-else class="divide-y divide-default overflow-hidden rounded-lg border border-default">
      <NuxtLink
        v-for="item in cases"
        :key="item.id"
        :to="`/cases/${item.id}`"
        class="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-elevated"
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
