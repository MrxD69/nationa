<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { COMPANY_FIELD_KEYS, type CompanyFieldKey } from "@nationa/api/domain/fields";
import ProvenanceBadge from "~/components/company/ProvenanceBadge.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const orpc = useApiUtils();
const route = useRoute();
const { t } = useI18n();

const companyId = computed(() => String(route.params.companyId ?? ""));

const { data, isPending, isError } = useQuery(
  computed(() => orpc.companies.get.queryOptions({ input: { companyId: companyId.value } })),
);

const company = computed(() => (data.value?.company ?? null) as Record<string, unknown> | null);
const role = computed(() => (data.value?.role ?? null) as string | null);
const scopes = computed(() => (data.value?.scopes ?? []) as string[]);

type ProvenanceRow = {
  fieldKey?: unknown;
  sourceKind?: unknown;
  confidence?: number | string | null;
};

const provenanceByField = computed<Record<string, ProvenanceRow>>(() => {
  const map: Record<string, ProvenanceRow> = {};
  for (const row of (data.value?.provenance ?? []) as ProvenanceRow[]) {
    const fieldKey = String(row.fieldKey ?? "");
    if (fieldKey && !map[fieldKey]) {
      map[fieldKey] = row;
    }
  }
  return map;
});

type DetailGroup = { id: string; titleKey: string; fields: CompanyFieldKey[] };

const DETAIL_GROUPS: DetailGroup[] = [
  {
    id: "identity",
    titleKey: "companies.form.groups.identity",
    fields: [
      "legalName",
      "legalNameAr",
      "tradeName",
      "brandName",
      "legalForm",
      "capitalAmount",
      "currency",
      "durationYears",
      "publicationDate",
    ],
  },
  {
    id: "registry",
    titleKey: "companies.form.groups.registry",
    fields: [
      "uniqueIdentifier",
      "internalManagementNumber",
      "registryType",
      "registryState",
      "taxId",
      "mentionDate",
    ],
  },
  {
    id: "activity",
    titleKey: "companies.form.groups.activity",
    fields: [
      "mainActivityLabel",
      "mainActivityLabelAr",
      "mainActivityCode",
      "activityStartDate",
      "secondaryEstablishmentsCount",
    ],
  },
  {
    id: "address",
    titleKey: "companies.form.groups.address",
    fields: ["headquartersAddress", "activityAddress"],
  },
  {
    id: "flags",
    titleKey: "companies.form.groups.flags",
    fields: ["leasing", "hasPledge", "fiscalDefault"],
  },
];

const groupedFields = new Set(DETAIL_GROUPS.flatMap((group) => group.fields));
for (const key of COMPANY_FIELD_KEYS) {
  if (!groupedFields.has(key)) {
    DETAIL_GROUPS[DETAIL_GROUPS.length - 1]?.fields.push(key);
  }
}

function formatAddress(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return typeof value === "string" && value.length > 0 ? value : null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.raw === "string" && record.raw.length > 0) {
    return record.raw;
  }
  const parts = record.fr as Record<string, unknown> | undefined;
  if (parts) {
    const text = [parts.street, parts.city, parts.governorate, parts.postalCode, parts.country]
      .filter((part) => typeof part === "string" && part.length > 0)
      .join(", ");
    return text.length > 0 ? text : null;
  }
  return null;
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return t("companies.detail.noValue");
  }
  if (typeof value === "boolean") {
    return value ? t("companies.boolean.yes") : t("companies.boolean.no");
  }
  if (key === "headquartersAddress" || key === "activityAddress") {
    return formatAddress(value) ?? t("companies.detail.noValue");
  }
  if (key === "registryType") {
    return t(`companies.registryType.${value}`);
  }
  if (key === "registryState") {
    return t(`companies.registryState.${value}`);
  }
  if (key === "fiscalDefault") {
    return t(`companies.fiscalDefault.${value}`);
  }
  return String(value);
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl">
    <div class="grid gap-6">
      <div class="flex items-center gap-2">
        <UButton
          to="/companies"
          color="neutral"
          variant="ghost"
          icon="i-tabler-arrow-left"
          size="sm"
          class="rtl:rotate-180"
          :label="t('companies.detail.back')"
        />
      </div>

      <div v-if="isPending" class="flex items-center gap-2 text-sm text-muted">
        <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
        <span>{{ t("companies.loading") }}</span>
      </div>

      <UAlert
        v-else-if="isError || !company"
        color="error"
        variant="subtle"
        :title="t('companies.detail.notFound')"
      />

      <template v-else>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
              {{ company.tradeName || company.legalName || t("companies.detail.title") }}
            </h1>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                v-if="company.status"
                color="neutral"
                variant="subtle"
                size="sm"
                :label="t(`companies.status.${company.status}`)"
              />
              <UBadge
                v-if="role"
                color="neutral"
                variant="outline"
                size="sm"
                :label="t(`companies.roles.${role}`)"
              />
              <span v-if="company.uniqueIdentifier" class="text-xs text-muted">
                {{ company.uniqueIdentifier }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UButton
              :to="`/companies/${companyId}/edit`"
              color="neutral"
              variant="soft"
              icon="i-tabler-pencil"
              :label="t('companies.detail.edit')"
            />
            <UButton
              :to="`/companies/${companyId}/access`"
              color="neutral"
              variant="soft"
              icon="i-tabler-users"
              :label="t('companies.detail.access')"
            />
          </div>
        </div>

        <UCard v-for="group in DETAIL_GROUPS" :key="group.id">
          <template #header>
            <h2 class="text-sm font-semibold text-highlighted">{{ t(group.titleKey) }}</h2>
          </template>

          <dl class="grid gap-4 sm:grid-cols-2">
            <div v-for="key in group.fields" :key="key" class="space-y-1">
              <dt class="flex items-center gap-2 text-xs font-medium text-muted">
                <span>{{ t(`companies.form.${key}`) }}</span>
                <ProvenanceBadge
                  v-if="provenanceByField[key]"
                  :source="String(provenanceByField[key].sourceKind ?? 'user')"
                  :confidence="provenanceByField[key].confidence ?? null"
                />
              </dt>
              <dd class="text-sm text-highlighted">{{ formatValue(key, company[key]) }}</dd>
            </div>
          </dl>
        </UCard>
      </template>
    </div>
  </div>
</template>
