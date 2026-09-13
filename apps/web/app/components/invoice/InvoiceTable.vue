<script setup lang="ts">
import InvoiceStatusBadge from "~/components/invoice/InvoiceStatusBadge.vue";

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

defineProps<{
  items: InvoiceRow[];
  loading?: boolean;
  selectedId?: string | null;
}>();

const emit = defineEmits<{ select: [id: string] }>();

const { t } = useI18n();

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
  return `${amount.toFixed(3)} ${currency || "TND"}`;
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex items-center gap-2 py-8 text-base text-muted">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      {{ t("invoices.loading") }}
    </div>

    <div
      v-else-if="items.length === 0"
      class="rounded-xl border border-dashed border-default py-10 text-center"
    >
      <p class="text-base font-medium text-toned">{{ t("invoices.empty") }}</p>
      <p class="text-sm text-muted">{{ t("invoices.emptyHint") }}</p>
    </div>

    <div v-else class="overflow-x-auto rounded-xl border border-default">
      <table class="w-full text-base">
        <thead class="bg-elevated text-sm text-muted">
          <tr>
            <th class="px-3 py-2 text-start font-medium">{{ t("invoices.table.number") }}</th>
            <th class="px-3 py-2 text-start font-medium">{{ t("invoices.table.supplier") }}</th>
            <th class="px-3 py-2 text-start font-medium">{{ t("invoices.table.issueDate") }}</th>
            <th class="px-3 py-2 text-start font-medium">{{ t("invoices.table.direction") }}</th>
            <th class="px-3 py-2 text-end font-medium">{{ t("invoices.table.total") }}</th>
            <th class="px-3 py-2 text-start font-medium">{{ t("invoices.table.status") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="invoice in items"
            :key="invoice.id"
            class="cursor-pointer border-t border-default hover:bg-elevated/60"
            :class="invoice.id === selectedId ? 'bg-primary/5' : ''"
            @click="emit('select', invoice.id)"
          >
            <td class="px-3 py-2 text-toned">{{ invoice.invoiceNumber || "—" }}</td>
            <td class="px-3 py-2 text-highlighted">{{ invoice.supplierName || "—" }}</td>
            <td class="px-3 py-2 text-muted">{{ invoice.issueDate || "—" }}</td>
            <td class="px-3 py-2 text-muted">{{ directionLabel(invoice.direction) }}</td>
            <td class="px-3 py-2 text-end text-toned">
              {{ formatAmount(invoice.total, invoice.currency) }}
            </td>
            <td class="px-3 py-2"><InvoiceStatusBadge :status="invoice.status" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
