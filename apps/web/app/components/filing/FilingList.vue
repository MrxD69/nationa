<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import FilingStatusBadge from "~/components/filing/FilingStatusBadge.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type FilingRow = {
  id: string;
  taxType?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalTaxDue?: string | null;
  currency?: string | null;
  status?: string | null;
};

const props = defineProps<{
  items: FilingRow[];
  loading?: boolean;
  selectedId?: string | null;
  filtered?: boolean;
}>();

const emit = defineEmits<{ select: [id: string]; recompute: [id: string]; remove: [id: string] }>();

const { t, locale } = useI18n();

const DRAFT = "draft";
const SUBMITTED = "submitted";
const VERIFIED = "verified";
const OTHER = "__other__";

function groupKey(filing: FilingRow): string {
  const status = (filing.status ?? "").toLowerCase();
  if (status === "draft" || status === "ready") {
    return DRAFT;
  }
  if (status === "submitted" || status === "under_review") {
    return SUBMITTED;
  }
  if (status === "approved" || status === "verified") {
    return VERIFIED;
  }
  return OTHER;
}

function groupName(key: string): string {
  if (key === DRAFT) {
    return t("filings.groups.draft");
  }
  if (key === SUBMITTED) {
    return t("filings.groups.submitted");
  }
  if (key === VERIFIED) {
    return t("filings.groups.verified");
  }
  return t("filings.groups.other");
}

const groups = computed(() => {
  const order: string[] = [];
  const buckets = new Map<string, FilingRow[]>();
  for (const filing of props.items) {
    const key = groupKey(filing);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)?.push(filing);
  }
  return order.map((key) => ({ key, name: groupName(key), items: buckets.get(key) ?? [] }));
});

function formatAmount(value?: string | null, currency?: string | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return value;
  }
  const code = (currency || "TND").trim().toUpperCase() || "TND";
  try {
    return new Intl.NumberFormat(locale.value, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 3,
    }).format(amount);
  } catch {
    return `${amount.toFixed(3)} ${code}`;
  }
}

function rowTitle(filing: FilingRow) {
  if (filing.periodStart && filing.periodEnd) {
    return `${filing.periodStart} → ${filing.periodEnd}`;
  }
  return filing.taxType || "—";
}

function rowMeta(filing: FilingRow) {
  return [filing.taxType || "—", formatAmount(filing.totalTaxDue, filing.currency)].join(" · ");
}

function menuItems(filing: FilingRow): DropdownMenuItem[] {
  return [
    {
      label: t("filings.actions.view"),
      icon: "i-tabler-eye",
      onSelect: () => emit("select", filing.id),
    },
    {
      label: t("filings.actions.recompute"),
      icon: "i-tabler-reload",
      onSelect: () => emit("recompute", filing.id),
    },
    {
      label: t("filings.actions.remove"),
      icon: "i-tabler-trash",
      color: "error",
      onSelect: () => emit("remove", filing.id),
    },
  ];
}
</script>

<template>
  <div class="w-full">
    <LoadingState v-if="loading" variant="skeleton-list" :label="t('filings.loading')" />

    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center gap-2 px-2 py-12 text-center"
    >
      <div class="flex size-12 items-center justify-center rounded-full bg-accented text-muted">
        <UIcon name="i-tabler-file-off" class="size-6" />
      </div>
      <p class="text-base font-semibold text-highlighted">
        {{ filtered ? t("filings.list.emptyFiltered") : t("filings.empty") }}
      </p>
      <p v-if="!filtered" class="text-base text-muted">{{ t("filings.emptyHint") }}</p>
    </div>

    <div v-else class="divide-y divide-default">
      <details v-for="group in groups" :key="group.key" open>
        <summary
          class="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 transition-[background-color,color] duration-150 ease-out hover:bg-accented focus-visible:bg-accented focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
        >
          <UIcon
            name="i-tabler-chevron-down"
            class="size-4 shrink-0 text-muted transition-[transform] duration-200 ease-out [[details:not([open])_&]:-rotate-90]"
          />
          <span class="min-w-0 flex-1 truncate text-sm font-semibold text-toned">
            {{ group.name }}
          </span>
          <UBadge color="neutral" variant="soft" size="sm" :label="String(group.items.length)" />
        </summary>
        <div class="divide-y divide-default border-t border-default">
          <div
            v-for="filing in group.items"
            :key="filing.id"
            class="group flex min-h-11 w-full cursor-pointer items-start gap-3 border-s-2 px-3 py-2.5 transition-[background-color,color,border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
            :class="
              filing.id === selectedId
                ? 'border-s-primary bg-primary/10 text-primary'
                : 'border-s-transparent hover:bg-accented focus-visible:bg-accented'
            "
            role="button"
            tabindex="0"
            :aria-selected="filing.id === selectedId"
            @click="emit('select', filing.id)"
            @keydown.enter="emit('select', filing.id)"
            @keydown.space.prevent="emit('select', filing.id)"
          >
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-md"
              :class="
                filing.id === selectedId ? 'bg-primary/15 text-primary' : 'bg-accented text-muted'
              "
            >
              <UIcon name="i-tabler-file-invoice" class="size-5" />
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-base font-medium text-highlighted" dir="ltr">
                {{ rowTitle(filing) }}
              </p>
              <p class="truncate text-sm text-muted">{{ rowMeta(filing) }}</p>
            </div>

            <div class="flex shrink-0 items-center gap-1">
              <FilingStatusBadge :status="filing.status" class="hidden sm:inline-flex" />

              <UDropdownMenu :items="menuItems(filing)" :content="{ align: 'end' }">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-tabler-dots-vertical"
                  size="sm"
                  square
                  class="min-h-11 min-w-11"
                  :aria-label="t('filings.list.actions')"
                  :title="t('filings.list.actions')"
                  @click.stop
                  @keydown.stop
                />
              </UDropdownMenu>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>
