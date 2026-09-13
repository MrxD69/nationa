<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";
import OfficerDataRow from "~/components/officer/ui/OfficerDataRow.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import { officerQuery } from "~/composables/useOfficerAgency";

type Severity = "warning" | "error" | "info";

type RegistryFlag = {
  id: string;
  kind: string;
  severity: Severity;
  companyId: string;
  companyName: string;
  companyNameAr: string | null;
  uniqueIdentifier: string | null;
  title: string;
  detail: string;
  evidence: Array<{ label: string; value: string }>;
};

const props = withDefaults(defineProps<{ items: RegistryFlag[]; loading?: boolean }>(), {
  loading: false,
});

const { t, te, locale } = useI18n();
const { agencyId } = useOfficerAgency();

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UIcon = resolveComponent("UIcon");

const expanded = ref<Record<string, boolean>>({});
const mobileOpen = ref<Record<string, boolean>>({});

const tableUi = {
  base: "w-full min-w-[52rem]",
  tbody: "divide-y-0",
  th: "border-0 px-4 py-2 whitespace-nowrap",
  td: "border-0 px-4 py-2 whitespace-normal",
  tr: "border-b border-default",
};

const MONO_HINT =
  /ident|capital|montant|num[eé]ro|n°|code|ice|rc|if|matric|معرّف|رأس مال|مبلغ|رمز/i;

function companyLink(companyId: string) {
  return { path: `/officer/companies/${companyId}`, query: officerQuery(agencyId.value) };
}

function companyName(item: RegistryFlag): string {
  return locale.value === "ar"
    ? item.companyNameAr || item.companyName || "—"
    : item.companyName || item.companyNameAr || "—";
}

function severityLabel(value: string): string {
  const key = `officerMonitoring.registry.severities.${value}`;
  return te(key) ? t(key) : value;
}

function kindLabel(value: string): string {
  const key = `officerMonitoring.registry.kindLabels.${value}`;
  return te(key) ? t(key) : value;
}

function severityColor(value: Severity): "error" | "warning" | "info" {
  return value;
}

function isMono(label: string, value: string): boolean {
  return MONO_HINT.test(label) || /^[\d\s.,:/()-]+$/.test(value);
}

const problemHeader = computed(() => (locale.value === "ar" ? "المشكلة" : "Problème"));
const actionHeader = computed(() => (locale.value === "ar" ? "إجراء" : "Action"));

function toggleMobile(id: string): void {
  mobileOpen.value = { ...mobileOpen.value, [id]: !mobileOpen.value[id] };
}

const columns = computed<TableColumn<RegistryFlag>[]>(() => [
  {
    id: "severity",
    header: t("officerMonitoring.registry.severityFilter"),
    cell: ({ row }) =>
      h(UBadge, { color: severityColor(row.original.severity), variant: "subtle" }, () =>
        severityLabel(row.original.severity),
      ),
  },
  {
    accessorKey: "kind",
    header: t("officerMonitoring.registry.kind"),
    cell: ({ row }) =>
      h(UBadge, { color: "neutral", variant: "soft" }, () => kindLabel(row.original.kind)),
  },
  {
    accessorKey: "companyName",
    header: t("officerMonitoring.registry.company"),
    cell: ({ row }) =>
      h("div", { class: "max-w-[14rem] min-w-0" }, [
        h(
          "p",
          {
            class: "truncate text-sm font-medium text-highlighted",
            title: companyName(row.original),
          },
          companyName(row.original),
        ),
        row.original.uniqueIdentifier
          ? h(
              "p",
              { class: "text-xs text-muted tabular", dir: "ltr" },
              row.original.uniqueIdentifier,
            )
          : null,
      ]),
  },
  {
    accessorKey: "title",
    header: problemHeader.value,
    cell: ({ row }) =>
      h(
        "button",
        {
          type: "button",
          class: "flex max-w-[20rem] items-center gap-2 text-start",
          title: row.original.title,
          "aria-expanded": row.getIsExpanded(),
          onClick: () => row.toggleExpanded(),
        },
        [
          h("span", { class: "truncate text-sm font-medium text-highlighted" }, row.original.title),
          h(UIcon, {
            name: row.getIsExpanded() ? "i-tabler-chevron-up" : "i-tabler-chevron-down",
            class: "size-4 shrink-0 text-muted",
          }),
        ],
      ),
  },
  {
    id: "action",
    header: actionHeader.value,
    cell: ({ row }) =>
      h(UButton, {
        to: companyLink(row.original.companyId),
        color: "primary",
        variant: "soft",
        size: "md",
        icon: "i-tabler-building-bank",
        label: t("officerMonitoring.registry.openCompany"),
      }),
  },
]);
</script>

<template>
  <div>
    <LoadingState
      v-if="loading && items.length === 0"
      variant="skeleton-list"
      :count="4"
      :label="t('officerMonitoring.common.loading')"
    />

    <EmptyState
      v-else-if="items.length === 0"
      icon="i-tabler-shield-check"
      :title="t('officerMonitoring.registry.empty')"
      :description="t('officerMonitoring.registry.emptyDescription')"
    />

    <template v-else>
      <div class="hidden overflow-x-auto md:block">
        <UTable
          v-model:expanded="expanded"
          :data="items"
          :columns="columns"
          :loading="loading"
          :ui="tableUi"
          :expanded-options="{ getRowCanExpand: () => true }"
          :empty="t('officerMonitoring.registry.empty')"
        >
          <template #expanded="{ row }">
            <div class="space-y-3 px-4 py-4">
              <p class="text-sm text-muted">{{ row.original.detail }}</p>

              <div v-if="row.original.evidence.length > 0" class="space-y-1">
                <p class="text-sm font-medium text-muted">
                  {{ t("officerMonitoring.registry.evidence") }}
                </p>
                <OfficerDataRow
                  v-for="(entry, index) in row.original.evidence"
                  :key="`${row.original.id}-${index}`"
                  :label="entry.label"
                  :value="entry.value"
                  :mono="isMono(entry.label, entry.value)"
                />
              </div>
            </div>
          </template>
        </UTable>
      </div>

      <section
        class="divide-y divide-default md:hidden"
        :aria-label="t('officerMonitoring.registry.title')"
      >
        <article v-for="item in items" :key="item.id" class="space-y-2 py-4">
          <div class="flex flex-wrap items-center gap-1.5">
            <UBadge :color="severityColor(item.severity)" variant="subtle">
              {{ severityLabel(item.severity) }}
            </UBadge>
            <UBadge color="neutral" variant="soft">{{ kindLabel(item.kind) }}</UBadge>
          </div>

          <button
            type="button"
            class="flex w-full items-center gap-2 text-start"
            :aria-expanded="!!mobileOpen[item.id]"
            @click="toggleMobile(item.id)"
          >
            <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
              {{ item.title }}
            </span>
            <UIcon
              :name="mobileOpen[item.id] ? 'i-tabler-chevron-up' : 'i-tabler-chevron-down'"
              class="size-4 shrink-0 text-muted"
            />
          </button>

          <div class="min-w-0">
            <p class="truncate text-sm text-highlighted">{{ companyName(item) }}</p>
            <p v-if="item.uniqueIdentifier" class="text-xs text-muted tabular" dir="ltr">
              {{ item.uniqueIdentifier }}
            </p>
          </div>

          <template v-if="mobileOpen[item.id]">
            <p class="text-sm text-muted">{{ item.detail }}</p>

            <div v-if="item.evidence.length > 0" class="space-y-1">
              <p class="text-sm font-medium text-muted">
                {{ t("officerMonitoring.registry.evidence") }}
              </p>
              <OfficerDataRow
                v-for="(entry, index) in item.evidence"
                :key="`${item.id}-${index}`"
                :label="entry.label"
                :value="entry.value"
                :mono="isMono(entry.label, entry.value)"
              />
            </div>
          </template>

          <UButton
            :to="companyLink(item.companyId)"
            color="primary"
            variant="soft"
            size="md"
            icon="i-tabler-building-bank"
            :label="t('officerMonitoring.registry.openCompany')"
          />
        </article>
      </section>
    </template>
  </div>
</template>
