<script setup lang="ts">
type QuoteItem = {
  feeId: string;
  label: string;
  amount: number;
  currency: string;
};

type Quote = {
  currency: string;
  total: number;
  items: QuoteItem[];
  payable: boolean;
};

const props = defineProps<{
  quote?: Quote | null;
  loading?: boolean;
}>();

const { t } = useI18n();

function format(amount: number, currency: string): string {
  return `${amount.toFixed(3)} ${currency}`;
}
</script>

<template>
  <div class="grid gap-4">
    <div v-if="props.loading" class="flex items-center gap-2 text-base text-muted">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>{{ t("cases.payment.loading") }}</span>
    </div>

    <template v-else-if="props.quote">
      <div
        v-for="item in props.quote.items"
        :key="item.feeId"
        class="flex items-center justify-between gap-4 border-b border-default py-2 last:border-0"
      >
        <span class="text-base text-default">{{ item.label }}</span>
        <span class="text-base font-medium text-highlighted">
          {{ format(item.amount, item.currency) }}
        </span>
      </div>

      <div class="flex items-center justify-between gap-4 pt-2">
        <span class="text-base font-medium text-highlighted">{{ t("cases.payment.total") }}</span>
        <span class="text-base font-semibold text-highlighted">
          {{ format(props.quote.total, props.quote.currency) }}
        </span>
      </div>

      <UAlert
        v-if="!props.quote.payable"
        color="info"
        variant="subtle"
        icon="i-tabler-info-square-rounded"
        :title="t('cases.payment.companylessTitle')"
        :description="t('cases.payment.companyless')"
      />
      <UAlert
        v-else
        color="neutral"
        variant="subtle"
        icon="i-tabler-credit-card"
        :title="t('cases.payment.stubTitle')"
        :description="t('cases.payment.stub')"
      />
    </template>

    <UAlert
      v-else
      color="neutral"
      variant="subtle"
      icon="i-tabler-receipt"
      :title="t('cases.payment.empty')"
    />
  </div>
</template>
