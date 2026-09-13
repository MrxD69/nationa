<script setup lang="ts">
type LineRow = {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal?: number;
};

type InvoiceLike = {
  id?: string;
  direction?: string | null;
  supplierName?: string | null;
  supplierTaxId?: string | null;
  invoiceNumber?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  subtotal?: string | number | null;
  taxAmount?: string | number | null;
  total?: string | number | null;
};

const props = defineProps<{
  invoice?: InvoiceLike | null;
  lines?: LineRow[];
  saving?: boolean;
}>();

const emit = defineEmits<{ save: [payload: Record<string, unknown>]; cancel: [] }>();

const { t } = useI18n();

const directionOptions = computed(() => [
  { label: t("invoices.direction.purchase"), value: "purchase" },
  { label: t("invoices.direction.sale"), value: "sale" },
]);

const form = reactive({
  direction: "purchase",
  supplierName: "",
  supplierTaxId: "",
  invoiceNumber: "",
  issueDate: "",
  dueDate: "",
  currency: "TND",
});

const lineItems = ref<LineRow[]>([]);

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function reset() {
  const invoice = props.invoice;
  form.direction = invoice?.direction ?? "purchase";
  form.supplierName = invoice?.supplierName ?? "";
  form.supplierTaxId = invoice?.supplierTaxId ?? "";
  form.invoiceNumber = invoice?.invoiceNumber ?? "";
  form.issueDate = invoice?.issueDate ? String(invoice.issueDate).slice(0, 10) : "";
  form.dueDate = invoice?.dueDate ? String(invoice.dueDate).slice(0, 10) : "";
  form.currency = invoice?.currency ?? "TND";
  lineItems.value = (props.lines ?? []).map((line) => ({
    description: line.description ?? "",
    quantity: toNumberOrNull(line.quantity) ?? undefined,
    unitPrice: toNumberOrNull(line.unitPrice) ?? undefined,
    taxRate: toNumberOrNull(line.taxRate) ?? undefined,
    taxAmount: toNumberOrNull(line.taxAmount) ?? undefined,
    lineTotal: toNumberOrNull(line.lineTotal) ?? undefined,
  }));
  if (lineItems.value.length === 0) {
    addLine();
  }
}

watch(() => props.invoice, reset, { immediate: true });
watch(() => props.lines, reset);

function addLine() {
  lineItems.value.push({
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 19,
  });
}

function removeLine(index: number) {
  lineItems.value.splice(index, 1);
}

function lineValues(line: LineRow) {
  const quantity = toNumberOrNull(line.quantity) ?? 0;
  const unitPrice = toNumberOrNull(line.unitPrice) ?? 0;
  const lineTotal = toNumberOrNull(line.lineTotal) ?? quantity * unitPrice;
  const taxRate = toNumberOrNull(line.taxRate);
  const taxAmount =
    toNumberOrNull(line.taxAmount) ?? (taxRate !== null ? (lineTotal * taxRate) / 100 : 0);
  return { lineTotal, taxAmount };
}

const totals = computed(() => {
  let subtotal = 0;
  let taxAmount = 0;
  for (const line of lineItems.value) {
    const values = lineValues(line);
    subtotal += values.lineTotal;
    taxAmount += values.taxAmount;
  }
  return {
    subtotal: subtotal.toFixed(3),
    taxAmount: taxAmount.toFixed(3),
    total: (subtotal + taxAmount).toFixed(3),
  };
});

function submit() {
  emit("save", {
    direction: form.direction,
    supplierName: form.supplierName || null,
    supplierTaxId: form.supplierTaxId || null,
    invoiceNumber: form.invoiceNumber || null,
    issueDate: form.issueDate || null,
    dueDate: form.dueDate || null,
    currency: form.currency || "TND",
    lines: lineItems.value.map((line) => {
      const values = lineValues(line);
      return {
        description: line.description || null,
        quantity: toNumberOrNull(line.quantity),
        unitPrice: toNumberOrNull(line.unitPrice),
        taxRate: toNumberOrNull(line.taxRate),
        taxAmount: values.taxAmount,
        lineTotal: values.lineTotal,
      };
    }),
  });
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-base font-semibold text-highlighted">
        {{ props.invoice?.id ? t("invoices.form.editTitle") : t("invoices.form.newTitle") }}
      </h2>
    </template>

    <div class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="t('invoices.form.direction')">
          <USelect v-model="form.direction" :items="directionOptions" class="w-full" />
        </UFormField>
        <UFormField :label="t('invoices.form.invoiceNumber')">
          <UInput v-model="form.invoiceNumber" class="w-full" />
        </UFormField>
        <UFormField :label="t('invoices.form.supplierName')">
          <UInput v-model="form.supplierName" class="w-full" />
        </UFormField>
        <UFormField :label="t('invoices.form.supplierTaxId')">
          <UInput v-model="form.supplierTaxId" class="w-full" dir="ltr" />
        </UFormField>
        <UFormField :label="t('invoices.form.issueDate')">
          <UInput v-model="form.issueDate" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('invoices.form.dueDate')">
          <UInput v-model="form.dueDate" type="date" class="w-full" />
        </UFormField>
        <UFormField :label="t('invoices.form.currency')">
          <UInput v-model="form.currency" class="w-full" dir="ltr" />
        </UFormField>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-base font-medium text-highlighted">{{ t("invoices.form.lines") }}</h3>
          <UButton
            color="neutral"
            variant="soft"
            size="lg"
            icon="i-tabler-plus"
            :label="t('invoices.form.addLine')"
            @click="addLine"
          />
        </div>

        <div
          v-for="(line, index) in lineItems"
          :key="index"
          class="grid gap-2 rounded-lg border border-default p-2 sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]"
        >
          <UInput v-model="line.description" :placeholder="t('invoices.form.description')" />
          <UInput
            v-model="line.quantity"
            type="number"
            :placeholder="t('invoices.form.quantity')"
          />
          <UInput
            v-model="line.unitPrice"
            type="number"
            step="0.001"
            :placeholder="t('invoices.form.unitPrice')"
          />
          <UInput
            v-model="line.taxRate"
            type="number"
            step="0.01"
            :placeholder="t('invoices.form.taxRate')"
          />
          <UInput
            v-model="line.taxAmount"
            type="number"
            step="0.001"
            :placeholder="t('invoices.form.lineTax')"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="lg"
            icon="i-tabler-trash"
            :aria-label="t('invoices.form.removeLine')"
            @click="removeLine(index)"
          />
        </div>
      </div>

      <dl class="grid grid-cols-3 gap-2 rounded-lg bg-elevated p-3 text-base">
        <div>
          <dt class="text-sm text-muted">{{ t("invoices.form.subtotal") }}</dt>
          <dd class="text-toned" dir="ltr">{{ totals.subtotal }}</dd>
        </div>
        <div>
          <dt class="text-sm text-muted">{{ t("invoices.form.taxAmount") }}</dt>
          <dd class="text-toned" dir="ltr">{{ totals.taxAmount }}</dd>
        </div>
        <div>
          <dt class="text-sm text-muted">{{ t("invoices.form.total") }}</dt>
          <dd class="font-medium text-highlighted" dir="ltr">{{ totals.total }}</dd>
        </div>
      </dl>

      <div class="flex items-center justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('invoices.form.cancel')"
          @click="emit('cancel')"
        />
        <UButton
          color="primary"
          icon="i-tabler-check"
          :loading="saving"
          :label="t('invoices.form.save')"
          @click="submit"
        />
      </div>
    </div>
  </UCard>
</template>
