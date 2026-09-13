<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import InvoiceStatusBadge from "~/components/invoice/InvoiceStatusBadge.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

type InvoiceRow = {
  id: string;
  supplierName?: string | null;
  supplierTaxId?: string | null;
  invoiceNumber?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  total?: string | null;
  status?: string | null;
  direction?: string | null;
};

const props = defineProps<{
  items: InvoiceRow[];
  loading?: boolean;
  selectedId?: string | null;
}>();

const emit = defineEmits<{ select: [id: string]; remove: [id: string] }>();

const { t, locale } = useI18n();

const PURCHASE = "purchase";
const SALE = "sale";
const OTHER = "__other__";

function groupKey(invoice: InvoiceRow): string {
  if (invoice.direction === PURCHASE) {
    return PURCHASE;
  }
  if (invoice.direction === SALE) {
    return SALE;
  }
  return OTHER;
}

function groupName(key: string): string {
  if (key === PURCHASE) {
    return t("invoices.groups.purchase");
  }
  if (key === SALE) {
    return t("invoices.groups.sale");
  }
  return t("invoices.groups.other");
}

const groups = computed(() => {
  const order: string[] = [];
  const buckets = new Map<string, InvoiceRow[]>();
  for (const invoice of props.items) {
    const key = groupKey(invoice);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)?.push(invoice);
  }
  return order.map((key) => ({ key, name: groupName(key), items: buckets.get(key) ?? [] }));
});

function directionLabel(direction?: string | null) {
  if (!direction) {
    return "";
  }
  const key = `invoices.direction.${direction}`;
  const translated = t(key);
  return translated === key ? direction : translated;
}

function formatAmount(total?: string | null, currency?: string | null) {
  if (total === null || total === undefined || total === "") {
    return "—";
  }
  const amount = Number(total);
  if (!Number.isFinite(amount)) {
    return total;
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

function rowTitle(invoice: InvoiceRow) {
  return invoice.invoiceNumber || invoice.supplierName || "—";
}

function rowMeta(invoice: InvoiceRow) {
  const parts: string[] = [];
  if (invoice.invoiceNumber && invoice.supplierName) {
    parts.push(invoice.supplierName);
  }
  const direction = directionLabel(invoice.direction);
  if (direction) {
    parts.push(direction);
  }
  if (invoice.issueDate) {
    parts.push(invoice.issueDate);
  }
  parts.push(formatAmount(invoice.total, invoice.currency));
  return parts.join(" · ");
}

function menuItems(invoice: InvoiceRow): DropdownMenuItem[] {
  return [
    {
      label: t("invoices.actions.view"),
      icon: "i-tabler-eye",
      onSelect: () => emit("select", invoice.id),
    },
    {
      label: t("invoices.actions.remove"),
      icon: "i-tabler-trash",
      color: "error",
      onSelect: () => emit("remove", invoice.id),
    },
  ];
}
</script>

<template>
  <div class="w-full">
    <LoadingState v-if="loading" variant="skeleton-list" :label="t('invoices.loading')" />

    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center gap-2 px-2 py-12 text-center"
    >
      <div class="flex size-12 items-center justify-center rounded-full bg-accented text-muted">
        <UIcon name="i-tabler-receipt-off" class="size-6" />
      </div>
      <p class="text-base font-semibold text-highlighted">{{ t("invoices.empty") }}</p>
      <p class="text-base text-muted">{{ t("invoices.emptyHint") }}</p>
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
            v-for="invoice in group.items"
            :key="invoice.id"
            class="group flex min-h-11 w-full cursor-pointer items-start gap-3 border-s-2 px-3 py-2.5 transition-[background-color,color,border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
            :class="
              invoice.id === selectedId
                ? 'border-s-primary bg-primary/10 text-primary'
                : 'border-s-transparent hover:bg-accented focus-visible:bg-accented'
            "
            role="button"
            tabindex="0"
            :aria-selected="invoice.id === selectedId"
            @click="emit('select', invoice.id)"
            @keydown.enter="emit('select', invoice.id)"
            @keydown.space.prevent="emit('select', invoice.id)"
          >
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-md"
              :class="
                invoice.id === selectedId ? 'bg-primary/15 text-primary' : 'bg-accented text-muted'
              "
            >
              <UIcon name="i-tabler-receipt" class="size-5" />
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-base font-medium text-highlighted">
                {{ rowTitle(invoice) }}
              </p>
              <p class="truncate text-sm text-muted" dir="ltr">{{ rowMeta(invoice) }}</p>
            </div>

            <div class="flex shrink-0 items-center gap-1">
              <InvoiceStatusBadge :status="invoice.status" class="hidden sm:inline-flex" />

              <UDropdownMenu :items="menuItems(invoice)" :content="{ align: 'end' }">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-tabler-dots-vertical"
                  size="sm"
                  square
                  class="min-h-11 min-w-11"
                  :aria-label="t('invoices.table.actions')"
                  :title="t('invoices.table.actions')"
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
