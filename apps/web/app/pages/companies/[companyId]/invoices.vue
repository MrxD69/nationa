<script setup lang="ts">
import InvoiceForm from "~/components/invoice/InvoiceForm.vue";
import InvoiceStatusBadge from "~/components/invoice/InvoiceStatusBadge.vue";
import InvoiceTable from "~/components/invoice/InvoiceTable.vue";
import InvoiceUploader from "~/components/invoice/InvoiceUploader.vue";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const client = useApi();
const { t } = useI18n();
const toast = useToast();

const companyId = computed(() => String(route.params.companyId ?? ""));

type InvoiceRow = Record<string, any>;
type InvoiceLine = Record<string, any>;

const items = ref<InvoiceRow[]>([]);
const loading = ref(false);
const selectedId = ref<string | null>(null);
const detail = ref<{ invoice: InvoiceRow; lines: InvoiceLine[]; provenance: InvoiceRow[] } | null>(
  null,
);
const detailLoading = ref(false);
const showForm = ref(false);
const saving = ref(false);

async function loadList() {
  loading.value = true;
  try {
    items.value = (await client.invoices.list({
      companyId: companyId.value,
    })) as unknown as InvoiceRow[];
  } catch {
    toast.add({ title: t("invoices.errors.loadFailed"), color: "error" });
  } finally {
    loading.value = false;
  }
}

async function selectInvoice(id: string) {
  selectedId.value = id;
  showForm.value = false;
  detailLoading.value = true;
  try {
    detail.value = (await client.invoices.get({
      companyId: companyId.value,
      invoiceId: id,
    })) as unknown as { invoice: InvoiceRow; lines: InvoiceLine[]; provenance: InvoiceRow[] };
  } catch {
    detail.value = null;
  } finally {
    detailLoading.value = false;
  }
}

async function onExtracted(id: string) {
  await loadList();
  await selectInvoice(id);
}

function startNew() {
  selectedId.value = null;
  detail.value = null;
  showForm.value = true;
}

function startEdit() {
  if (!detail.value) {
    return;
  }
  showForm.value = true;
}

async function saveInvoice(payload: Record<string, unknown>) {
  saving.value = true;
  try {
    if (detail.value?.invoice?.id) {
      await client.invoices.update({
        companyId: companyId.value,
        invoiceId: detail.value.invoice.id,
        patch: payload,
        lines: payload.lines,
      } as never);
    } else {
      await client.invoices.createManual({
        companyId: companyId.value,
        ...payload,
      } as never);
    }
    showForm.value = false;
    await loadList();
    if (detail.value?.invoice?.id) {
      await selectInvoice(String(detail.value.invoice.id));
    }
  } catch {
    toast.add({ title: t("invoices.errors.saveFailed"), color: "error" });
  } finally {
    saving.value = false;
  }
}

async function verifyInvoice() {
  if (!detail.value?.invoice?.id) {
    return;
  }
  try {
    await client.invoices.verify({
      companyId: companyId.value,
      invoiceId: String(detail.value.invoice.id),
    });
    await selectInvoice(String(detail.value.invoice.id));
    await loadList();
  } catch {
    toast.add({ title: t("invoices.errors.verifyFailed"), color: "error" });
  }
}

async function removeInvoice() {
  if (!detail.value?.invoice?.id) {
    return;
  }
  try {
    await client.invoices.remove({
      companyId: companyId.value,
      invoiceId: String(detail.value.invoice.id),
    });
    detail.value = null;
    selectedId.value = null;
    await loadList();
  } catch {
    toast.add({ title: t("invoices.errors.removeFailed"), color: "error" });
  }
}

function formatAmount(value: unknown, currency?: string | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toFixed(3)} ${currency || "TND"}` : String(value);
}

onMounted(loadList);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-highlighted">
          {{ t("invoices.title") }}
        </h1>
        <p class="text-sm text-muted">{{ t("invoices.subtitle") }}</p>
      </div>
      <div class="flex items-center gap-2">
        <UBadge
          color="neutral"
          variant="subtle"
          :label="t('invoices.count', { count: items.length })"
        />
        <UButton
          color="primary"
          size="sm"
          icon="i-tabler-plus"
          :label="t('invoices.actions.new')"
          @click="startNew"
        />
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <InvoiceUploader :company-id="companyId" @extracted="onExtracted" />

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-highlighted">{{ t("invoices.title") }}</h2>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-tabler-reload"
            :label="t('invoices.actions.refresh')"
            @click="loadList"
          />
        </div>
        <InvoiceTable
          :items="items"
          :loading="loading"
          :selected-id="selectedId"
          @select="selectInvoice"
        />
      </section>
    </div>

    <InvoiceForm
      v-if="showForm"
      :invoice="detail?.invoice ?? null"
      :lines="detail?.lines ?? []"
      :saving="saving"
      @save="saveInvoice"
      @cancel="showForm = false"
    />

    <UCard v-if="selectedId && !showForm">
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-highlighted">
              {{ detail?.invoice?.invoiceNumber || t("invoices.detail.title") }}
            </p>
            <p class="text-xs text-muted">{{ detail?.invoice?.supplierName || "—" }}</p>
          </div>
          <div class="flex items-center gap-2">
            <InvoiceStatusBadge :status="detail?.invoice?.status" />
            <UButton
              v-if="detail?.invoice?.status !== 'verified'"
              color="primary"
              variant="soft"
              size="sm"
              icon="i-tabler-check"
              :label="t('invoices.actions.verify')"
              @click="verifyInvoice"
            />
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-tabler-pencil"
              :label="t('invoices.actions.edit')"
              @click="startEdit"
            />
            <UButton
              color="error"
              variant="soft"
              size="sm"
              icon="i-tabler-trash"
              :label="t('invoices.actions.remove')"
              @click="removeInvoice"
            />
          </div>
        </div>
      </template>

      <div v-if="detailLoading" class="flex items-center gap-2 py-8 text-sm text-muted">
        <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
        {{ t("invoices.loading") }}
      </div>

      <div v-else-if="detail" class="space-y-5">
        <dl class="grid gap-3 sm:grid-cols-3">
          <div>
            <dt class="text-xs text-muted">{{ t("invoices.form.issueDate") }}</dt>
            <dd class="text-sm text-toned">{{ detail.invoice.issueDate || "—" }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">{{ t("invoices.form.subtotal") }}</dt>
            <dd class="text-sm text-toned" dir="ltr">
              {{ formatAmount(detail.invoice.subtotal, detail.invoice.currency) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">{{ t("invoices.form.total") }}</dt>
            <dd class="text-sm font-medium text-highlighted" dir="ltr">
              {{ formatAmount(detail.invoice.total, detail.invoice.currency) }}
            </dd>
          </div>
        </dl>

        <div class="space-y-2">
          <h3 class="text-sm font-medium text-highlighted">{{ t("invoices.detail.lines") }}</h3>
          <div
            v-if="detail.lines.length === 0"
            class="rounded-lg border border-dashed border-default py-4 text-center text-xs text-muted"
          >
            {{ t("invoices.detail.noLines") }}
          </div>
          <div v-else class="overflow-x-auto rounded-lg border border-default">
            <table class="w-full text-sm">
              <thead class="bg-elevated text-xs text-muted">
                <tr>
                  <th class="px-3 py-2 text-start font-medium">
                    {{ t("invoices.form.description") }}
                  </th>
                  <th class="px-3 py-2 text-end font-medium">{{ t("invoices.form.quantity") }}</th>
                  <th class="px-3 py-2 text-end font-medium">{{ t("invoices.form.unitPrice") }}</th>
                  <th class="px-3 py-2 text-end font-medium">{{ t("invoices.form.taxRate") }}</th>
                  <th class="px-3 py-2 text-end font-medium">{{ t("invoices.form.lineTotal") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="line in detail.lines" :key="line.id" class="border-t border-default">
                  <td class="px-3 py-2 text-toned">{{ line.description || "—" }}</td>
                  <td class="px-3 py-2 text-end text-muted" dir="ltr">
                    {{ line.quantity ?? "—" }}
                  </td>
                  <td class="px-3 py-2 text-end text-muted" dir="ltr">
                    {{ line.unitPrice ?? "—" }}
                  </td>
                  <td class="px-3 py-2 text-end text-muted" dir="ltr">{{ line.taxRate ?? "—" }}</td>
                  <td class="px-3 py-2 text-end text-toned" dir="ltr">
                    {{ line.lineTotal ?? "—" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-2">
          <h3 class="text-sm font-medium text-highlighted">
            {{ t("invoices.detail.provenance") }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="row in detail.provenance"
              :key="row.id"
              color="neutral"
              variant="subtle"
              size="sm"
              :label="`${row.fieldKey}: ${row.sourceKind}`"
            />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
