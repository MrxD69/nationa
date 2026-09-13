<script setup lang="ts">
import AgencyMark from "~/components/agency/AgencyMark.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import type { ProcedureListItem } from "@nationa/api/services/procedures";

definePageMeta({ layout: "app", middleware: "auth" });

const { locale, t } = useI18n();
const { accessibleCompanyId } = useSelectedCompany();
const api = useCase();

const companyId = computed(() => accessibleCompanyId.value ?? undefined);

const { data, isLoading } = api.proceduresQuery();
const start = api.startMutation();
const starting = ref<string | null>(null);

const templates = computed<ProcedureListItem[]>(() => data.value ?? []);

function templateName(template: ProcedureListItem): string {
  return locale.value === "ar" ? (template.nameAr ?? template.nameFr) : template.nameFr;
}

function agencyName(template: ProcedureListItem): string {
  return locale.value === "ar"
    ? (template.agencyNameAr ?? template.agencyNameFr ?? template.agencyId)
    : (template.agencyNameFr ?? template.agencyId);
}

function agencyNameFr(template: ProcedureListItem): string {
  return template.agencyNameFr ?? template.agencyId;
}

const groups = computed(() => {
  const map = new Map<
    string,
    {
      agencyId: string;
      agencyNameFr: string;
      agencyNameAr: string | null;
      templates: ProcedureListItem[];
    }
  >();
  for (const template of templates.value) {
    const existing = map.get(template.agencyId);
    if (existing) {
      existing.templates.push(template);
      continue;
    }
    map.set(template.agencyId, {
      agencyId: template.agencyId,
      agencyNameFr: agencyNameFr(template),
      agencyNameAr: template.agencyNameAr ?? null,
      templates: [template],
    });
  }
  return [...map.values()].sort((a, b) => {
    if (a.agencyId === "RNE") return -1;
    if (b.agencyId === "RNE") return 1;
    return a.agencyId.localeCompare(b.agencyId);
  });
});

const error = ref<string | null>(null);

async function startCase(template: ProcedureListItem): Promise<void> {
  starting.value = template.id;
  error.value = null;
  try {
    const result = await start.mutateAsync({
      templateId: template.id,
      ...(companyId.value ? { companyId: companyId.value } : {}),
    });
    await navigateTo(`/cases/${result.case.id}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    starting.value = null;
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6">
    <PageHeader
      :title="t('cases.new.title')"
      :subtitle="t('cases.new.subtitle')"
      back-to="/cases"
      max-width="max-w-6xl"
    />

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />

    <LoadingState
      v-if="isLoading"
      variant="skeleton-grid"
      :count="6"
      :label="t('cases.new.loading')"
    />

    <template v-else-if="groups.length">
      <section v-for="group in groups" :key="group.agencyId" class="space-y-3">
        <div class="flex items-center gap-3">
          <AgencyMark :agency-id="group.agencyId" size="md" />
          <h2 class="text-lg font-semibold tracking-tight text-highlighted">
            {{ locale === "ar" ? (group.agencyNameAr ?? group.agencyNameFr) : group.agencyNameFr }}
          </h2>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="template in group.templates"
            :key="template.id"
            class="hover-lift flex h-full flex-col gap-3 rounded-lg border border-default p-4 hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 space-y-1">
                <h3 class="text-base font-medium text-highlighted">
                  {{ templateName(template) }}
                </h3>
                <p class="text-sm text-muted">{{ agencyName(template) }} · {{ template.code }}</p>
              </div>
              <UBadge color="neutral" variant="subtle" size="lg">
                {{ template.category ?? "—" }}
              </UBadge>
            </div>

            <p v-if="template.description" class="text-base leading-6 text-muted">
              {{ template.description }}
            </p>

            <div class="mt-auto flex items-center justify-between gap-2 pt-2">
              <span class="text-sm text-muted">
                {{ t("cases.new.steps", { count: template.stepCount }) }}
                <template v-if="template.estimatedDays">
                  · {{ t("cases.new.days", { count: template.estimatedDays }) }}
                </template>
              </span>
              <UButton
                icon="i-tabler-player-play"
                :loading="starting === template.id"
                :label="t('cases.new.start')"
                @click="startCase(template)"
              />
            </div>
          </div>
        </div>
      </section>
    </template>

    <EmptyState v-else icon="i-tabler-file-search" :title="t('cases.new.empty')">
      <UButton to="/cases" color="neutral" variant="outline" :label="t('cases.runner.back')" />
    </EmptyState>
  </div>
</template>
