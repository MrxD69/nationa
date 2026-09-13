<script setup lang="ts">
type FilingTotals = {
  outputBase?: number;
  outputTax?: number;
  inputBase?: number;
  inputTax?: number;
  netTaxDue?: number;
  byRate?: Array<{ rate: number | null; base: number; tax: number }>;
  invoiceCount?: number;
  currency?: string;
};

const props = defineProps<{ totals?: FilingTotals | null }>();

const { t, locale } = useI18n();

function amount(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "—";
  }
  const code = (props.totals?.currency || "TND").trim().toUpperCase() || "TND";
  try {
    return new Intl.NumberFormat(locale.value, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 3,
    }).format(number);
  } catch {
    return `${number.toFixed(3)} ${code}`;
  }
}

const net = computed(() => props.totals?.netTaxDue ?? 0);
</script>

<template>
  <div class="space-y-4">
    <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-md border border-default p-3">
        <dt class="text-sm text-muted">{{ t("filings.preview.outputBase") }}</dt>
        <dd class="text-base font-medium text-highlighted tabular-nums" dir="ltr">
          {{ amount(totals?.outputBase) }}
        </dd>
      </div>
      <div class="rounded-md border border-default p-3">
        <dt class="text-sm text-muted">{{ t("filings.preview.outputTax") }}</dt>
        <dd class="text-base font-medium text-highlighted tabular-nums" dir="ltr">
          {{ amount(totals?.outputTax) }}
        </dd>
      </div>
      <div class="rounded-md border border-default p-3">
        <dt class="text-sm text-muted">{{ t("filings.preview.inputBase") }}</dt>
        <dd class="text-base font-medium text-highlighted tabular-nums" dir="ltr">
          {{ amount(totals?.inputBase) }}
        </dd>
      </div>
      <div class="rounded-md border border-default p-3">
        <dt class="text-sm text-muted">{{ t("filings.preview.inputTax") }}</dt>
        <dd class="text-base font-medium text-highlighted tabular-nums" dir="ltr">
          {{ amount(totals?.inputTax) }}
        </dd>
      </div>
      <div class="rounded-md border border-primary/40 bg-primary/5 p-3">
        <dt class="text-sm text-muted">{{ t("filings.preview.netTaxDue") }}</dt>
        <dd
          class="text-base font-semibold tabular-nums"
          :class="net >= 0 ? 'text-highlighted' : 'text-success'"
          dir="ltr"
        >
          {{ amount(totals?.netTaxDue) }}
        </dd>
      </div>
    </dl>

    <div v-if="totals?.byRate?.length" class="space-y-2">
      <h3 class="text-base font-medium text-highlighted">{{ t("filings.preview.byRate") }}</h3>
      <div class="overflow-x-auto rounded-md border border-default">
        <table class="w-full text-base">
          <thead class="bg-elevated text-sm text-muted">
            <tr>
              <th class="px-3 py-2 text-start font-medium">{{ t("filings.preview.rate") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("filings.preview.base") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("filings.preview.tax") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(bucket, index) in totals.byRate"
              :key="index"
              class="border-t border-default"
            >
              <td class="px-3 py-2 text-toned" dir="ltr">
                {{ bucket.rate === null ? "—" : `${bucket.rate}%` }}
              </td>
              <td class="px-3 py-2 text-end text-muted tabular-nums" dir="ltr">
                {{ amount(bucket.base) }}
              </td>
              <td class="px-3 py-2 text-end text-muted tabular-nums" dir="ltr">
                {{ amount(bucket.tax) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-sm text-muted">
      {{ t("filings.preview.invoiceCount", { count: totals?.invoiceCount ?? 0 }) }}
    </p>
    <UAlert
      color="warning"
      variant="soft"
      icon="i-tabler-info-circle"
      :description="t('filings.disclaimer')"
    />
  </div>
</template>
