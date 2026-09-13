<script setup lang="ts">
import { FIELD_LABELS, type CanonicalFieldKey } from "@nationa/api/domain/fields";
import PageHeader from "~/components/ui/PageHeader.vue";
import SectionHeader from "~/components/ui/SectionHeader.vue";
import EmptyState from "~/components/ui/EmptyState.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import InvoiceForm from "~/components/invoice/InvoiceForm.vue";
import InvoiceStatusBadge from "~/components/invoice/InvoiceStatusBadge.vue";
import InvoiceTable from "~/components/invoice/InvoiceTable.vue";
import InvoiceUploader from "~/components/invoice/InvoiceUploader.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const client = useApi();
const { t, locale } = useI18n();
const toast = useToast();

const companyId = computed(() => String(route.params.companyId ?? ""));

type InvoiceRecord = Record<string, any> & { id: string };
type InvoiceLine = Record<string, any>;

const items = ref<InvoiceRecord[]>([]);
const loading = ref(false);
const selectedId = ref<string | null>(null);
const detail = ref<{
  invoice: InvoiceRecord;
  lines: InvoiceLine[];
  provenance: InvoiceRecord[];
} | null>(null);
const detailLoading = ref(false);
const showForm = ref(false);
const saving = ref(false);

const uploaderOpen = ref(false);
const mobileDetailOpen = ref(false);
const confirmDeleteOpen = ref(false);
const removing = ref(false);
const detailSide = computed(() => (locale.value === "ar" ? "left" : "right"));

function formatCurrency(value: unknown, currency?: string | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return String(value);
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

function humanizeKey(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function fieldLabel(key: string): string {
  if (key in FIELD_LABELS) {
    const label = FIELD_LABELS[key as CanonicalFieldKey];
    return (locale.value === "ar" ? label.ar : label.fr) || label.fr || humanizeKey(key);
  }
  return humanizeKey(key);
}

function sourceLabel(kind: string): string {
  const key = `invoices.provenance.${kind}`;
  const translated = t(key);
  return translated === key ? humanizeKey(kind) : translated;
}

const provenanceRows = computed(() =>
  (detail.value?.provenance ?? []).map((row) => ({
    id: String(row.id),
    field: fieldLabel(String(row.fieldKey)),
    source: sourceLabel(String(row.sourceKind)),
  })),
);

const formTitle = computed(() =>
  detail.value?.invoice?.id ? t("invoices.form.editTitle") : t("invoices.form.newTitle"),
);

function isDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

async function loadList() {
  loading.value = true;
  try {
    items.value = (await client.invoices.list({
      companyId: companyId.value,
    })) as unknown as InvoiceRecord[];
  } catch {
    toast.add({ title: t("invoices.errors.loadFailed"), color: "error" });
  } finally {
    loading.value = false;
  }
}

async function selectInvoice(id: string, options?: { openMobile?: boolean }) {
  selectedId.value = id;
  showForm.value = false;
  detailLoading.value = true;
  if (options?.openMobile !== false && !isDesktopViewport()) {
    mobileDetailOpen.value = true;
  }
  try {
    detail.value = (await client.invoices.get({
      companyId: companyId.value,
      invoiceId: id,
    })) as unknown as { invoice: InvoiceRecord; lines: InvoiceLine[]; provenance: InvoiceRecord[] };
  } catch {
    detail.value = null;
  } finally {
    detailLoading.value = false;
  }
}

async function onExtracted(id: string) {
  uploaderOpen.value = false;
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
    toast.add({ title: t("invoices.actions.createdToast"), color: "success" });
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
    toast.add({ title: t("invoices.actions.verifiedToast"), color: "success" });
  } catch {
    toast.add({ title: t("invoices.errors.verifyFailed"), color: "error" });
  }
}

async function removeInvoiceRow(id: string) {
  await selectInvoice(id, { openMobile: false });
  confirmDeleteOpen.value = true;
}

async function confirmRemove() {
  if (!selectedId.value) {
    return;
  }
  removing.value = true;
  try {
    await client.invoices.remove({
      companyId: companyId.value,
      invoiceId: selectedId.value,
    });
    confirmDeleteOpen.value = false;
    detail.value = null;
    selectedId.value = null;
    mobileDetailOpen.value = false;
    await loadList();
  } catch {
    toast.add({ title: t("invoices.errors.removeFailed"), color: "error" });
  } finally {
    removing.value = false;
  }
}

watch(companyId, async () => {
  selectedId.value = null;
  detail.value = null;
  showForm.value = false;
  mobileDetailOpen.value = false;
  await loadList();
});

onMounted(loadList);
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('invoices.title')"
      :subtitle="t('invoices.subtitle')"
      icon="i-tabler-receipt"
      max-width="max-w-6xl"
    >
      <template #actions>
        <UBadge
          color="neutral"
          variant="subtle"
          :label="t('invoices.count', { count: items.length })"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-tabler-reload"
          :label="t('invoices.actions.refresh')"
          @click="loadList"
        />
        <UButton
          color="primary"
          variant="soft"
          icon="i-tabler-cloud-upload"
          :label="t('invoices.upload.title')"
          @click="uploaderOpen = true"
        />
        <UButton
          color="primary"
          icon="i-tabler-plus"
          :label="t('invoices.actions.new')"
          @click="startNew"
        />
      </template>
    </PageHeader>

    <div class="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <section class="min-w-0 space-y-3">
        <SectionHeader :title="t('invoices.list.title')" :count="items.length" level="2" />
        <InvoiceTable
          :items="items"
          :loading="loading"
          :selected-id="selectedId"
          @select="selectInvoice"
          @remove="removeInvoiceRow"
        />
      </section>

      <aside class="hidden min-w-0 lg:block">
        <div class="lg:sticky lg:top-20 space-y-4">
          <EmptyState
            v-if="!selectedId"
            size="sm"
            icon="i-tabler-receipt"
            :title="t('invoices.detail.select')"
            :description="t('invoices.detail.selectHint')"
          />

          <LoadingState v-else-if="detailLoading" :label="t('invoices.loading')" />

          <div v-else-if="detail" class="space-y-4">
            <div class="space-y-2">
              <h2 class="truncate text-base font-semibold text-highlighted">
                {{ detail.invoice.invoiceNumber || t("invoices.detail.title") }}
              </h2>
              <div class="flex flex-wrap items-center gap-2">
                <InvoiceStatusBadge :status="detail.invoice.status" />
                <span class="min-w-0 flex-1 truncate text-sm text-muted">
                  {{ detail.invoice.supplierName || "—" }}
                </span>
                <div class="ms-auto flex shrink-0 items-center gap-1">
                  <UButton
                    v-if="detail.invoice.status !== 'verified'"
                    color="primary"
                    variant="ghost"
                    icon="i-tabler-check"
                    size="sm"
                    square
                    class="min-h-11 min-w-11"
                    :aria-label="t('invoices.actions.verify')"
                    :title="t('invoices.actions.verify')"
                    @click="verifyInvoice"
                  />
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-tabler-pencil"
                    size="sm"
                    square
                    class="min-h-11 min-w-11"
                    :aria-label="t('invoices.actions.edit')"
                    :title="t('invoices.actions.edit')"
                    @click="startEdit"
                  />
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-tabler-trash"
                    size="sm"
                    square
                    class="min-h-11 min-w-11"
                    :aria-label="t('invoices.actions.remove')"
                    :title="t('invoices.actions.remove')"
                    @click="confirmDeleteOpen = true"
                  />
                </div>
              </div>
            </div>

            <dl class="grid gap-3 sm:grid-cols-3">
              <div>
                <dt class="text-sm text-muted">{{ t("invoices.form.issueDate") }}</dt>
                <dd class="text-base text-toned">
                  <span dir="ltr">{{ detail.invoice.issueDate || "—" }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-sm text-muted">{{ t("invoices.form.subtotal") }}</dt>
                <dd class="text-base text-toned tabular-nums" dir="ltr">
                  {{ formatCurrency(detail.invoice.subtotal, detail.invoice.currency) }}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-muted">{{ t("invoices.form.total") }}</dt>
                <dd class="text-base font-medium text-highlighted tabular-nums" dir="ltr">
                  {{ formatCurrency(detail.invoice.total, detail.invoice.currency) }}
                </dd>
              </div>
            </dl>

            <div class="divide-y divide-default border-y border-default">
              <div class="space-y-2 py-3">
                <h3 class="text-base font-medium text-highlighted">
                  {{ t("invoices.detail.lines") }}
                </h3>
                <div
                  v-if="detail.lines.length === 0"
                  class="rounded-md border border-dashed border-default py-4 text-center text-sm text-muted"
                >
                  {{ t("invoices.detail.noLines") }}
                </div>
                <div v-else class="overflow-x-auto rounded-md border border-default">
                  <table class="w-full text-base tabular-nums">
                    <thead class="bg-accented text-sm text-muted">
                      <tr>
                        <th class="px-3 py-2 text-start font-medium">
                          {{ t("invoices.form.description") }}
                        </th>
                        <th class="px-3 py-2 text-end font-medium">
                          {{ t("invoices.form.quantity") }}
                        </th>
                        <th class="px-3 py-2 text-end font-medium">
                          {{ t("invoices.form.unitPrice") }}
                        </th>
                        <th class="px-3 py-2 text-end font-medium">
                          {{ t("invoices.form.taxRate") }}
                        </th>
                        <th class="px-3 py-2 text-end font-medium">
                          {{ t("invoices.form.lineTotal") }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="line in detail.lines"
                        :key="line.id"
                        class="border-t border-default"
                      >
                        <td class="px-3 py-2 text-toned">{{ line.description || "—" }}</td>
                        <td class="px-3 py-2 text-end text-muted" dir="ltr">
                          {{ line.quantity ?? "—" }}
                        </td>
                        <td class="px-3 py-2 text-end text-muted" dir="ltr">
                          {{ line.unitPrice ?? "—" }}
                        </td>
                        <td class="px-3 py-2 text-end text-muted" dir="ltr">
                          {{ line.taxRate ?? "—" }}
                        </td>
                        <td class="px-3 py-2 text-end text-toned" dir="ltr">
                          {{ line.lineTotal ?? "—" }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <details v-if="provenanceRows.length" class="py-3">
                <summary class="cursor-pointer text-base font-medium text-toned">
                  {{ t("invoices.detail.provenance") }}
                </summary>
                <dl class="mt-2 space-y-1 text-sm">
                  <div
                    v-for="row in provenanceRows"
                    :key="row.id"
                    class="flex items-center justify-between gap-2"
                  >
                    <dt class="min-w-0 truncate text-muted">{{ row.field }}</dt>
                    <dd class="shrink-0 text-toned">{{ row.source }}</dd>
                  </div>
                </dl>
              </details>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <USlideover
      v-model:open="uploaderOpen"
      :title="t('invoices.upload.title')"
      :description="t('invoices.upload.subtitle')"
      :side="detailSide"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <InvoiceUploader :company-id="companyId" @extracted="onExtracted" />
      </template>
    </USlideover>

    <USlideover
      v-model:open="showForm"
      :title="formTitle"
      :side="detailSide"
      :ui="{ content: 'sm:max-w-2xl' }"
    >
      <template #body>
        <InvoiceForm
          :invoice="detail?.invoice ?? null"
          :lines="detail?.lines ?? []"
          :saving="saving"
          @save="saveInvoice"
          @cancel="showForm = false"
        />
      </template>
    </USlideover>

    <USlideover
      v-model:open="mobileDetailOpen"
      :title="detail?.invoice?.invoiceNumber || t('invoices.detail.title')"
      :side="detailSide"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <div class="space-y-4">
          <div
            v-if="detailLoading"
            class="flex flex-col items-center justify-center gap-3 py-10"
            role="status"
          >
            <UIcon name="i-tabler-loader-2" class="size-6 animate-spin text-muted" />
            <p class="text-base text-muted">{{ t("invoices.loading") }}</p>
          </div>

          <template v-else-if="detail">
            <div class="flex flex-wrap items-center gap-2">
              <InvoiceStatusBadge :status="detail.invoice.status" />
              <span class="truncate text-sm text-muted">{{
                detail.invoice.supplierName || "—"
              }}</span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                v-if="detail.invoice.status !== 'verified'"
                color="primary"
                variant="soft"
                icon="i-tabler-check"
                :label="t('invoices.actions.verify')"
                @click="verifyInvoice"
              />
              <UButton
                color="neutral"
                variant="soft"
                icon="i-tabler-pencil"
                :label="t('invoices.actions.edit')"
                @click="startEdit"
              />
              <UButton
                color="error"
                variant="soft"
                icon="i-tabler-trash"
                :label="t('invoices.actions.remove')"
                @click="confirmDeleteOpen = true"
              />
            </div>

            <dl class="grid gap-3 sm:grid-cols-3">
              <div>
                <dt class="text-sm text-muted">{{ t("invoices.form.issueDate") }}</dt>
                <dd class="text-base text-toned">
                  <span dir="ltr">{{ detail.invoice.issueDate || "—" }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-sm text-muted">{{ t("invoices.form.subtotal") }}</dt>
                <dd class="text-base text-toned tabular-nums" dir="ltr">
                  {{ formatCurrency(detail.invoice.subtotal, detail.invoice.currency) }}
                </dd>
              </div>
              <div>
                <dt class="text-sm text-muted">{{ t("invoices.form.total") }}</dt>
                <dd class="text-base font-medium text-highlighted tabular-nums" dir="ltr">
                  {{ formatCurrency(detail.invoice.total, detail.invoice.currency) }}
                </dd>
              </div>
            </dl>

            <div class="divide-y divide-default border-y border-default">
              <div class="space-y-2 py-3">
                <h3 class="text-base font-medium text-highlighted">
                  {{ t("invoices.detail.lines") }}
                </h3>
                <div
                  v-if="detail.lines.length === 0"
                  class="rounded-md border border-dashed border-default py-4 text-center text-sm text-muted"
                >
                  {{ t("invoices.detail.noLines") }}
                </div>
                <div v-else class="overflow-x-auto rounded-md border border-default">
                  <table class="w-full text-base tabular-nums">
                    <thead class="bg-accented text-sm text-muted">
                      <tr>
                        <th class="px-3 py-2 text-start font-medium">
                          {{ t("invoices.form.description") }}
                        </th>
                        <th class="px-3 py-2 text-end font-medium">
                          {{ t("invoices.form.lineTotal") }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="line in detail.lines"
                        :key="line.id"
                        class="border-t border-default"
                      >
                        <td class="px-3 py-2 text-toned">{{ line.description || "—" }}</td>
                        <td class="px-3 py-2 text-end text-toned" dir="ltr">
                          {{ line.lineTotal ?? "—" }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <details v-if="provenanceRows.length" class="py-3">
                <summary class="cursor-pointer text-base font-medium text-toned">
                  {{ t("invoices.detail.provenance") }}
                </summary>
                <dl class="mt-2 space-y-1 text-sm">
                  <div
                    v-for="row in provenanceRows"
                    :key="row.id"
                    class="flex items-center justify-between gap-2"
                  >
                    <dt class="min-w-0 truncate text-muted">{{ row.field }}</dt>
                    <dd class="shrink-0 text-toned">{{ row.source }}</dd>
                  </div>
                </dl>
              </details>
            </div>
          </template>
        </div>
      </template>
    </USlideover>

    <UModal v-model:open="confirmDeleteOpen">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold text-highlighted">
              {{ t("invoices.detail.confirmDeleteTitle") }}
            </h2>
          </template>

          <p class="text-base text-muted">{{ t("invoices.detail.confirmDeleteBody") }}</p>

          <template #footer>
            <div class="flex w-full items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                :label="t('invoices.detail.cancel')"
                @click="confirmDeleteOpen = false"
              />
              <UButton
                color="error"
                icon="i-tabler-trash"
                :loading="removing"
                :label="t('invoices.detail.confirmDelete')"
                @click="confirmRemove"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
