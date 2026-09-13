<script setup lang="ts">
const props = defineProps<{
  obligations: Array<{ id: string; code: string; nameFr: string; nameAr?: string | null }>;
  loading?: boolean;
}>();

const emit = defineEmits<{ preview: [] }>();

const { t, locale } = useI18n();

const obligationId = defineModel<string | null>("obligationId", { default: null });
const periodStart = defineModel<string>("periodStart", { default: "" });
const periodEnd = defineModel<string>("periodEnd", { default: "" });

const selectedObligationId = computed<string | undefined>({
  get: () => obligationId.value ?? undefined,
  set: (value) => {
    obligationId.value = value ?? null;
  },
});

const obligationOptions = computed(() =>
  props.obligations.map((obligation) => ({
    label: locale.value === "ar" && obligation.nameAr ? obligation.nameAr : obligation.nameFr,
    value: obligation.id,
  })),
);
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-3">
      <UFormField :label="t('filings.period.start')">
        <UInput v-model="periodStart" type="date" class="w-full" />
      </UFormField>
      <UFormField :label="t('filings.period.end')">
        <UInput v-model="periodEnd" type="date" class="w-full" />
      </UFormField>
      <UFormField :label="t('filings.period.obligation')">
        <USelect
          v-model="selectedObligationId"
          :items="obligationOptions"
          :placeholder="t('filings.period.selectObligation')"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="flex items-center justify-between gap-2">
      <p class="text-sm text-muted">{{ t("filings.period.previewHint") }}</p>
      <UButton
        color="neutral"
        variant="soft"
        icon="i-tabler-calculator"
        :loading="loading"
        :label="t('filings.period.preview')"
        @click="emit('preview')"
      />
    </div>
  </div>
</template>
