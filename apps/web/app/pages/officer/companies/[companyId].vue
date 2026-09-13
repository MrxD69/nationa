<script setup lang="ts">
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import OfficerSection from "~/components/officer/ui/OfficerSection.vue";
import OfficerDataRow from "~/components/officer/ui/OfficerDataRow.vue";
import DossierSection from "~/components/officer/trust/DossierSection.vue";
import IntegrityPanel from "~/components/officer/trust/IntegrityPanel.vue";
import { officerQuery } from "~/composables/useOfficerAgency";

definePageMeta({ layout: "officer", middleware: "auth" });

type DossierCompany = {
  id: string;
  legalName: string;
  legalNameAr?: string | null;
  tradeName?: string | null;
  uniqueIdentifier?: string | null;
  registryType?: string | null;
  legalForm?: string | null;
  capitalAmount?: string | number | null;
  currency?: string | null;
  registryState?: string | null;
  status?: string | null;
  fiscalDefault?: string | null;
  headquartersAddress?: unknown;
  mainActivityLabel?: string | null;
  activityStartDate?: string | null;
  lastFinancialStatementsDate?: string | null;
  lastBeneficialDeclarationDate?: string | null;
  taxId?: string | null;
};

type AccessibleAgency = { id: string; nameFr: string; nameAr?: string | null };

type AgencySection = {
  agencyId: string;
  nameFr: string;
  nameAr?: string | null;
  submissions: number;
  pending: number;
  findings: number;
  filings: number;
  documents: number;
  lastActivityAt?: string | null;
};

type TimelineEvent = {
  id: string;
  action: string;
  summary?: string | null;
  actorType?: string | null;
  createdAt?: string | null;
  agencyId?: string | null;
};

type DossierDocument = {
  documentId: string;
  title?: string | null;
  documentVersionId: string;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  hash?: string | null;
  hasHash?: boolean;
  source?: string | null;
  uploadedAt?: string | null;
  version?: number | string | null;
  isCurrent?: boolean;
  agencyIds?: string[];
  documentStatus?: string | null;
};

type Dossier = {
  company: DossierCompany;
  accessibleAgencies: AccessibleAgency[];
  sections: AgencySection[];
  timeline: TimelineEvent[];
  documents: DossierDocument[];
};

const { t, te, locale } = useI18n();
const api = useApi();
const route = useRoute();
const toast = useToast();
const { agencyId, ready, ensureLoaded } = useOfficerAgency();

const companyId = computed(() => String(route.params.companyId ?? ""));
const dossier = ref<Dossier | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const integrityOpen = ref(false);
const integrityLoading = ref(false);
const integrityData = ref<any>(null);
let initialised = false;

const company = computed(() => dossier.value?.company ?? null);

const companyName = computed(() => {
  const value = company.value;
  if (!value) {
    return t("officerTrust.dossier.title");
  }
  return locale.value === "ar"
    ? value.legalNameAr || value.legalName || value.tradeName || t("officerTrust.dossier.title")
    : value.tradeName || value.legalName || value.legalNameAr || t("officerTrust.dossier.title");
});

function formatDate(value?: string | null): string {
  if (!value) {
    return t("officerTrust.common.none");
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? t("officerTrust.common.none")
    : date.toLocaleDateString(locale.value);
}

function documentType(mime?: string | null): string {
  if (!mime) {
    return t("officerTrust.common.none");
  }
  if (mime.startsWith("image/")) {
    return t("officerTrust.dossier.document.typeImage");
  }
  if (mime.includes("pdf")) {
    return t("officerTrust.dossier.document.typePdf");
  }
  return t("officerTrust.dossier.document.typeOther");
}

function translate(map: string, value?: string | null): string {
  if (!value) {
    return t("officerTrust.common.none");
  }
  const key = `officerTrust.dossier.${map}.${value}`;
  return te(key) ? t(key) : t("officerTrust.common.unknown");
}

function formatCapital(): string {
  const value = company.value?.capitalAmount;
  if (value === null || value === undefined || value === "") {
    return t("officerTrust.common.none");
  }
  const amount = typeof value === "number" ? value : Number(String(value).replace(/\s/g, ""));
  const currency = company.value?.currency || "";
  if (Number.isNaN(amount)) {
    return `${value} ${currency}`.trim();
  }
  return `${new Intl.NumberFormat(locale.value).format(amount)} ${currency}`.trim();
}

function formatAddress(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim().length > 0 ? value.trim() : null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.raw === "string" && record.raw.trim().length > 0) {
    return record.raw.trim();
  }
  const preferred = locale.value === "ar" ? record.ar : record.fr;
  const fallback = locale.value === "ar" ? record.fr : record.ar;
  const parts = (preferred ?? fallback) as Record<string, unknown> | undefined;
  if (!parts || typeof parts !== "object") {
    return null;
  }
  const text = [
    parts.building,
    parts.street,
    parts.office,
    parts.locality,
    parts.city,
    parts.governorate,
    parts.postalCode,
    parts.country,
  ]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(", ");
  return text.length > 0 ? text : null;
}

const address = computed(() => formatAddress(company.value?.headquartersAddress));

const identityRows = computed(() => {
  const value = company.value;
  if (!value) {
    return [];
  }
  return [
    {
      key: "legalName",
      label: t("officerTrust.dossier.fields.legalName"),
      value: companyName.value,
    },
    { key: "tradeName", label: t("officerTrust.dossier.fields.tradeName"), value: value.tradeName },
    {
      key: "uniqueIdentifier",
      label: t("officerTrust.dossier.fields.uniqueIdentifier"),
      value: value.uniqueIdentifier,
      mono: true,
    },
    { key: "taxId", label: t("officerTrust.dossier.fields.taxId"), value: value.taxId, mono: true },
    { key: "legalForm", label: t("officerTrust.dossier.fields.legalForm"), value: value.legalForm },
    {
      key: "capital",
      label: t("officerTrust.dossier.fields.capital"),
      value: formatCapital(),
      mono: true,
    },
    {
      key: "registryType",
      label: t("officerTrust.dossier.fields.entityType"),
      value: translate("registryTypes", value.registryType),
    },
    {
      key: "registryState",
      label: t("officerTrust.dossier.fields.registryState"),
      value: translate("registryStates", value.registryState),
    },
    {
      key: "status",
      label: t("officerTrust.dossier.fields.dossierState"),
      value: translate("companyStatuses", value.status),
    },
    {
      key: "mainActivity",
      label: t("officerTrust.dossier.fields.mainActivity"),
      value: value.mainActivityLabel,
    },
    {
      key: "activityStart",
      label: t("officerTrust.dossier.fields.activityStart"),
      value: formatDate(value.activityStartDate),
    },
    {
      key: "lastFinancialStatements",
      label: t("officerTrust.dossier.fields.lastFinancialStatements"),
      value: formatDate(value.lastFinancialStatementsDate),
    },
    {
      key: "lastBeneficialDeclaration",
      label: t("officerTrust.dossier.fields.lastBeneficialDeclaration"),
      value: formatDate(value.lastBeneficialDeclarationDate),
    },
  ];
});

function agencyName(agency: AccessibleAgency): string {
  return locale.value === "ar"
    ? agency.nameAr || agency.nameFr
    : agency.nameFr || agency.nameAr || "—";
}

const accessibleIds = computed(() =>
  (dossier.value?.accessibleAgencies ?? []).map((agency) => agency.id),
);

function sectionName(agencyIdValue?: string | null): string | null {
  if (!agencyIdValue) {
    return null;
  }
  const section = dossier.value?.sections.find((item) => item.agencyId === agencyIdValue);
  if (!section) {
    return null;
  }
  return locale.value === "ar"
    ? section.nameAr || section.nameFr
    : section.nameFr || section.nameAr || null;
}

function timelineLabel(event: TimelineEvent): string {
  if (event.summary && event.summary.trim().length > 0) {
    return event.summary;
  }
  const code = String(event.action ?? "")
    .toLowerCase()
    .replace(/[.\s-]+/g, "_");
  const key = `officerTrust.dossier.timelineFallbacks.${code}`;
  if (te(key)) {
    return t(key);
  }
  return t("officerTrust.dossier.timelineEvent");
}

async function load() {
  if (!companyId.value) {
    error.value = t("officerTrust.dossier.notFound");
    loading.value = false;
    return;
  }
  if (!agencyId.value) {
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    dossier.value = (await api.officer.dossier({
      agencyId: agencyId.value,
      companyId: companyId.value,
    })) as Dossier;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

async function verifyDocument(document: DossierDocument) {
  if (!agencyId.value) {
    return;
  }
  integrityOpen.value = true;
  integrityLoading.value = true;
  integrityData.value = null;
  try {
    integrityData.value = await api.officer.documentIntegrity({
      agencyId: agencyId.value,
      documentVersionId: document.documentVersionId,
    });
  } catch {
    toast.add({ title: t("officerTrust.integrity.error"), color: "error" });
  } finally {
    integrityLoading.value = false;
  }
}

async function bootstrap() {
  await ensureLoaded();
  if (ready.value && agencyId.value) {
    await load();
  } else {
    loading.value = false;
  }
  initialised = true;
}

onMounted(() => {
  void bootstrap();
});

watch(agencyId, (value) => {
  if (initialised && value && ready.value) {
    void load();
  }
});
</script>

<template>
  <div class="w-full space-y-6">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <UButton
        :to="{ path: '/officer/companies', query: officerQuery(agencyId) }"
        color="neutral"
        variant="ghost"
        size="md"
        icon="i-tabler-arrow-left"
        :label="t('officerTrust.dossier.backToSearch')"
        :ui="{ leadingIcon: 'rtl:rotate-180' }"
      />
      <h1 class="min-w-0 truncate text-lg font-semibold text-highlighted">{{ companyName }}</h1>
      <span v-if="company?.uniqueIdentifier" dir="ltr" class="tabular text-sm text-muted">
        {{ company.uniqueIdentifier }}
      </span>
      <UBadge
        v-if="company?.registryState"
        color="neutral"
        variant="subtle"
        :label="translate('registryStates', company.registryState)"
      />
    </div>

    <LoadingState
      v-if="loading"
      variant="skeleton-rows"
      :count="6"
      :label="t('officerTrust.dossier.loading')"
    />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('officerTrust.dossier.error')"
      :description="error"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="md"
          icon="i-tabler-reload"
          :label="t('officerTrust.dossier.retry')"
          @click="load()"
        />
      </template>
    </UAlert>

    <EmptyState
      v-else-if="!dossier"
      icon="i-tabler-building-off"
      :title="t('officerTrust.dossier.notFound')"
      :description="t('officerTrust.dossier.notFoundDescription')"
    />

    <template v-else>
      <OfficerSection :title="t('officerTrust.dossier.identity')" icon="i-tabler-id-badge-2">
        <div class="grid gap-x-8 sm:grid-cols-2">
          <OfficerDataRow
            v-for="row in identityRows"
            :key="row.key"
            :label="row.label"
            :value="row.value"
            :mono="row.mono ?? false"
          />
          <OfficerDataRow :label="t('officerTrust.dossier.fields.headquarters')">
            <span v-if="address">{{ address }}</span>
            <span v-else class="text-muted">{{
              t("officerTrust.dossier.addressUnavailable")
            }}</span>
          </OfficerDataRow>
        </div>
      </OfficerSection>

      <OfficerSection
        :title="t('officerTrust.dossier.access')"
        icon="i-tabler-building-bank"
        :count="dossier.accessibleAgencies.length"
      >
        <div v-if="dossier.accessibleAgencies.length > 0" class="flex flex-wrap gap-2">
          <UBadge
            v-for="agency in dossier.accessibleAgencies"
            :key="agency.id"
            color="neutral"
            variant="soft"
            icon="i-tabler-building-bank"
            :label="agencyName(agency)"
          />
        </div>
        <p v-else class="text-sm text-muted">{{ t("officerTrust.dossier.noAccess") }}</p>
      </OfficerSection>

      <OfficerSection
        :title="t('officerTrust.dossier.perAgency')"
        icon="i-tabler-building-store"
        :count="dossier.sections.length"
      >
        <div v-if="dossier.sections.length > 0" class="overflow-x-auto">
          <table class="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr class="border-b border-default text-xs font-medium text-muted">
                <th class="px-4 py-2 text-start">{{ t("officerTrust.common.agency") }}</th>
                <th class="px-4 py-2 text-end">
                  {{ t("officerTrust.dossier.counts.submissions") }}
                </th>
                <th class="px-4 py-2 text-end">{{ t("officerTrust.dossier.counts.pending") }}</th>
                <th class="px-4 py-2 text-end">{{ t("officerTrust.dossier.counts.findings") }}</th>
                <th class="px-4 py-2 text-end">{{ t("officerTrust.dossier.counts.filings") }}</th>
                <th class="px-4 py-2 text-end">{{ t("officerTrust.dossier.counts.documents") }}</th>
                <th class="px-4 py-2 text-end">{{ t("officerTrust.dossier.lastActivity") }}</th>
                <th class="px-4 py-2 text-end">{{ t("officerTrust.search.columns.actions") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <DossierSection
                v-for="section in dossier.sections"
                :key="section.agencyId"
                :section="section"
                :agency-id-for-link="
                  accessibleIds.includes(section.agencyId) ? section.agencyId : null
                "
              />
            </tbody>
          </table>
        </div>
        <p v-else class="text-sm text-muted">{{ t("officerTrust.dossier.noSections") }}</p>
      </OfficerSection>

      <OfficerSection
        :title="t('officerTrust.dossier.documents')"
        icon="i-tabler-files"
        :count="dossier.documents.length"
      >
        <div v-if="dossier.documents.length > 0" class="overflow-x-auto">
          <table class="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr class="border-b border-default text-xs font-medium text-muted">
                <th class="px-4 py-2 text-start">
                  {{ t("officerTrust.integrity.fields.fileName") }}
                </th>
                <th class="px-4 py-2 text-start">{{ t("officerTrust.dossier.document.type") }}</th>
                <th class="px-4 py-2 text-end">{{ t("officerTrust.dossier.document.version") }}</th>
                <th class="px-4 py-2 text-end">{{ t("officerTrust.dossier.document.date") }}</th>
                <th class="px-4 py-2 text-start">{{ t("officerTrust.agency.columns.status") }}</th>
                <th class="px-4 py-2 text-end">{{ t("officerTrust.search.columns.actions") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="document in dossier.documents" :key="document.documentVersionId">
                <td class="px-4 py-2 align-middle">
                  <div class="flex min-w-0 items-start gap-2">
                    <UIcon name="i-tabler-file-text" class="mt-0.5 size-4 shrink-0 text-muted" />
                    <div class="min-w-0">
                      <p class="min-w-0 truncate font-medium text-highlighted">
                        {{ document.title || document.fileName || "—" }}
                      </p>
                      <p class="min-w-0 truncate text-xs text-muted" dir="ltr">
                        {{ document.fileName || "—" }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-2 align-middle text-muted">
                  {{ documentType(document.mimeType) }}
                </td>
                <td class="px-4 py-2 align-middle text-end tabular text-highlighted">
                  {{ document.version ?? "—" }}
                </td>
                <td class="px-4 py-2 align-middle text-end whitespace-nowrap text-muted">
                  {{ formatDate(document.uploadedAt) }}
                </td>
                <td class="px-4 py-2 align-middle">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge
                      :color="document.isCurrent ? 'success' : 'neutral'"
                      variant="subtle"
                      :label="
                        document.isCurrent
                          ? t('officerTrust.dossier.document.current')
                          : t('officerTrust.dossier.document.old')
                      "
                    />
                    <UBadge
                      v-if="!document.hasHash"
                      color="warning"
                      variant="subtle"
                      icon="i-tabler-alert-triangle"
                      :label="t('officerTrust.dossier.document.noHash')"
                    />
                  </div>
                </td>
                <td class="px-4 py-2 text-end align-middle">
                  <UButton
                    color="neutral"
                    variant="soft"
                    size="md"
                    icon="i-tabler-shield-search"
                    :label="t('officerTrust.dossier.document.verify')"
                    @click="verifyDocument(document)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-sm text-muted">{{ t("officerTrust.dossier.noDocuments") }}</p>
      </OfficerSection>

      <OfficerSection
        :title="t('officerTrust.dossier.timeline')"
        icon="i-tabler-history"
        :count="dossier.timeline.length"
      >
        <ol v-if="dossier.timeline.length > 0" class="divide-y divide-default">
          <li
            v-for="event in dossier.timeline"
            :key="event.id"
            class="flex flex-col gap-0.5 py-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4"
          >
            <span class="shrink-0 text-xs text-dimmed">{{ formatDate(event.createdAt) }}</span>
            <span class="min-w-0 text-sm text-highlighted">{{ timelineLabel(event) }}</span>
            <span
              v-if="sectionName(event.agencyId)"
              class="inline-flex shrink-0 items-center gap-1 text-xs text-muted"
            >
              <UIcon name="i-tabler-building-bank" class="size-3.5" />
              {{ sectionName(event.agencyId) }}
            </span>
          </li>
        </ol>
        <p v-else class="text-sm text-muted">{{ t("officerTrust.dossier.noTimeline") }}</p>
      </OfficerSection>
    </template>

    <USlideover
      v-model:open="integrityOpen"
      :title="t('officerTrust.integrity.title')"
      :description="t('officerTrust.integrity.description')"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <IntegrityPanel :integrity="integrityData" :loading="integrityLoading" />
      </template>
    </USlideover>
  </div>
</template>
