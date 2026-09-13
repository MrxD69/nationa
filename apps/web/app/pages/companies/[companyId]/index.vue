<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { COMPANY_FIELD_KEYS, type CompanyFieldKey } from "@nationa/api/domain/fields";
import FieldDemarcheHint from "~/components/company/FieldDemarcheHint.vue";
import ProvenanceBadge from "~/components/company/ProvenanceBadge.vue";
import { demarcheCodeForField } from "~/constants/demarches";
import EmptyState from "~/components/ui/EmptyState.vue";
import PageHeader from "~/components/ui/PageHeader.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const orpc = useApiUtils();
const route = useRoute();
const { t, locale } = useI18n();

const companyId = computed(() => String(route.params.companyId ?? ""));

const { data, isPending, isError } = useQuery(
  computed(() => orpc.companies.get.queryOptions({ input: { companyId: companyId.value } })),
);

const company = computed(() => (data.value?.company ?? null) as Record<string, unknown> | null);
const role = computed(() => (data.value?.role ?? null) as string | null);

const showAll = ref(false);

const actions = useActions();
const { data: catalogData } = actions.catalogQuery({ companyId: computed(() => companyId.value) });

const catalogByCode = computed(() => {
  const map = new Map<string, { id: string; name: string }>();
  for (const item of catalogData.value ?? []) {
    map.set(item.code, {
      id: item.id,
      name: locale.value.startsWith("ar") ? item.nameAr || item.nameFr : item.nameFr,
    });
  }
  return map;
});

function demarcheForField(key: string): { to: string; title: string } {
  const code = demarcheCodeForField(key);
  const item = catalogByCode.value.get(code);
  if (item) {
    return { to: `/actions/${item.id}`, title: item.name };
  }
  return {
    to: `/actions?q=${encodeURIComponent(t("companies.detail.demarche.fallback"))}`,
    title: t("companies.detail.demarche.title"),
  };
}

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

const displayName = computed(() => {
  const record = company.value;
  if (!record) {
    return t("companies.detail.title");
  }
  if (locale.value.startsWith("ar")) {
    return (
      (record.legalNameAr as string) ||
      (record.tradeName as string) ||
      (record.legalName as string) ||
      t("companies.detail.title")
    );
  }
  return (
    (record.tradeName as string) || (record.legalName as string) || t("companies.detail.title")
  );
});

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

function hasValue(key: string): boolean {
  const value = company.value?.[key];
  if (value === null || value === undefined || value === "") {
    return false;
  }
  if (key === "headquartersAddress" || key === "activityAddress") {
    return formatAddress(value) !== null;
  }
  return true;
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

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function factValue(key: CompanyFieldKey): string {
  const record = company.value;
  if (key === "capitalAmount") {
    const raw = record?.capitalAmount;
    const amount = raw == null || raw === "" ? null : String(raw);
    const currency = stringValue(record?.currency);
    if (!amount) {
      return t("companies.detail.noValue");
    }
    return currency ? `${amount} ${currency}` : amount;
  }
  if (key === "mainActivityLabel") {
    const ar = stringValue(record?.mainActivityLabelAr);
    const fr = stringValue(record?.mainActivityLabel);
    const value = locale.value.startsWith("ar") ? ar || fr : fr;
    return value ?? t("companies.detail.noValue");
  }
  return formatValue(key, record?.[key]);
}

type FactTile = { key: CompanyFieldKey; labelKey: string; ltr?: boolean };

const FACT_TILES: FactTile[] = [
  { key: "capitalAmount", labelKey: "companies.form.capitalAmount", ltr: true },
  { key: "legalForm", labelKey: "companies.form.legalForm" },
  { key: "registryState", labelKey: "companies.form.registryState" },
  { key: "mainActivityLabel", labelKey: "companies.form.mainActivityLabel" },
];

const factTiles = computed(() =>
  FACT_TILES.map((tile) => {
    const populated =
      tile.key === "mainActivityLabel"
        ? hasValue("mainActivityLabel") || hasValue("mainActivityLabelAr")
        : hasValue(tile.key);
    return { ...tile, value: factValue(tile.key), populated };
  }).filter((tile) => showAll.value || tile.populated),
);

const renderedGroups = computed(() =>
  DETAIL_GROUPS.map((group) => ({
    ...group,
    fields: showAll.value ? group.fields : group.fields.filter((key) => hasValue(key)),
  })).filter((group) => group.fields.length > 0),
);
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6">
    <div v-if="isPending" class="flex flex-col items-center justify-center gap-3 py-10">
      <UIcon name="i-tabler-loader-2" class="size-6 animate-spin text-muted" />
      <p class="text-base text-muted">{{ t("companies.loading") }}</p>
    </div>

    <UAlert
      v-else-if="isError || !company"
      color="error"
      variant="subtle"
      :title="t('companies.detail.notFound')"
    />

    <template v-else>
      <PageHeader
        :title="displayName"
        icon="i-tabler-building-skyscraper"
        back-to="/companies"
        :back-label="t('companies.detail.back')"
      >
        <template #actions>
          <UButton
            :to="`/companies/${companyId}/access`"
            color="neutral"
            variant="soft"
            icon="i-tabler-users"
            :label="t('companies.detail.access')"
          />
        </template>

        <template #meta>
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                v-if="company.status"
                color="neutral"
                variant="subtle"
                size="lg"
                :label="t(`companies.status.${company.status}`)"
              />
              <UBadge
                v-if="role"
                color="neutral"
                variant="outline"
                size="lg"
                :label="t(`companies.roles.${role}`)"
              />
              <span
                v-if="company.uniqueIdentifier"
                class="text-sm text-muted tabular-nums"
                dir="ltr"
              >
                {{ company.uniqueIdentifier }}
              </span>
            </div>

            <div v-if="factTiles.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div
                v-for="tile in factTiles"
                :key="tile.key"
                class="rounded-lg border border-default p-4"
              >
                <p class="text-sm text-dimmed">{{ t(tile.labelKey) }}</p>
                <p
                  class="mt-1 text-base"
                  :class="[
                    tile.populated ? 'font-semibold text-highlighted' : 'font-normal text-dimmed',
                    { 'tabular-nums': tile.ltr },
                  ]"
                  :dir="tile.ltr ? 'ltr' : undefined"
                >
                  {{ tile.value }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </PageHeader>

      <div class="flex justify-end">
        <UButton
          :icon="showAll ? 'i-tabler-eye-off' : 'i-tabler-eye'"
          color="neutral"
          variant="ghost"
          :label="showAll ? t('companies.detail.showLess') : t('companies.detail.showAll')"
          @click="showAll = !showAll"
        />
      </div>

      <EmptyState
        v-if="renderedGroups.length === 0"
        size="sm"
        icon="i-tabler-file-off"
        :title="t('companies.detail.emptySection')"
      />

      <section
        v-for="group in renderedGroups"
        :key="group.id"
        class="space-y-4 border-t border-default pt-6"
      >
        <h2 class="text-lg font-semibold text-highlighted">{{ t(group.titleKey) }}</h2>

        <dl class="grid gap-4 sm:grid-cols-2">
          <div v-for="key in group.fields" :key="key" class="space-y-1">
            <dt class="flex items-center gap-2 text-sm font-medium text-dimmed">
              <span>{{ t(`companies.form.${key}`) }}</span>
              <ProvenanceBadge
                v-if="provenanceByField[key] && hasValue(key)"
                :source="String(provenanceByField[key].sourceKind ?? 'user')"
                :confidence="provenanceByField[key].confidence ?? null"
              />
              <FieldDemarcheHint
                v-if="hasValue(key) || showAll"
                :to="demarcheForField(key).to"
                :title="demarcheForField(key).title"
              />
            </dt>
            <dd
              class="text-base"
              :class="hasValue(key) ? 'font-semibold text-highlighted' : 'font-normal text-dimmed'"
            >
              {{ formatValue(key, company[key]) }}
            </dd>
          </div>
        </dl>
      </section>
    </template>
  </div>
</template>
