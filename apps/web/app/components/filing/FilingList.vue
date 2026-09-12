<script setup lang="ts">
import FilingStatusBadge from "~/components/filing/FilingStatusBadge.vue";

type FilingRow = {
  id: string;
  taxType?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalTaxDue?: string | null;
  status?: string | null;
};

defineProps<{
  items: FilingRow[];
  loading?: boolean;
  selectedId?: string | null;
}>();

const emit = defineEmits<{ select: [id: string] }>();

const { t } = useI18n();

function formatAmount(value?: string | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(3) : value;
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex items-center gap-2 py-8 text-sm text-muted">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      {{ t("filings.loading") }}
    </div>

    <div
      v-else-if="items.length === 0"
      class="rounded-xl border border-dashed border-default py-10 text-center"
    >
      <p class="text-sm font-medium text-toned">{{ t("filings.empty") }}</p>
      <p class="text-xs text-muted">{{ t("filings.emptyHint") }}</p>
    </div>

    <div v-else class="overflow-x-auto rounded-xl border border-default">
      <table class="w-full text-sm">
        <thead class="bg-elevated text-xs text-muted">
          <tr>
            <th class="px-3 py-2 text-start font-medium">{{ t("filings.list.period") }}</th>
            <th class="px-3 py-2 text-start font-medium">{{ t("filings.list.taxType") }}</th>
            <th class="px-3 py-2 text-end font-medium">{{ t("filings.list.totalTaxDue") }}</th>
            <th class="px-3 py-2 text-start font-medium">{{ t("filings.list.status") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="filing in items"
            :key="filing.id"
            class="cursor-pointer border-t border-default hover:bg-elevated/60"
            :class="filing.id === selectedId ? 'bg-primary/5' : ''"
            @click="emit('select', filing.id)"
          >
            <td class="px-3 py-2 text-toned" dir="ltr">
              {{ filing.periodStart }} → {{ filing.periodEnd }}
            </td>
            <td class="px-3 py-2 text-muted">{{ filing.taxType || "—" }}</td>
            <td class="px-3 py-2 text-end text-toned" dir="ltr">
              {{ formatAmount(filing.totalTaxDue) }}
            </td>
            <td class="px-3 py-2"><FilingStatusBadge :status="filing.status" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
