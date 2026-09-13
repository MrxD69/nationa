<script setup lang="ts">
import SectionHeader from "~/components/ui/SectionHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";
import FilingList from "~/components/filing/FilingList.vue";
import FilingPeriodPicker from "~/components/filing/FilingPeriodPicker.vue";
import FilingPreview from "~/components/filing/FilingPreview.vue";
import FilingStatusBadge from "~/components/filing/FilingStatusBadge.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const client = useApi();
const { t, locale } = useI18n();
const toast = useToast();

const companyId = computed(() => String(route.params.companyId ?? ""));

type FilingRecord = Record<string, any> & { id: string };

const obligations = ref<
  Array<{ id: string; code: string; nameFr: string; nameAr?: string | null }>
>([]);
const filings = ref<FilingRecord[]>([]);
const loading = ref(false);
const preview = ref<{
  totals: Record<string, any>;
  obligation?: Record<string, any> | null;
} | null>(null);
const previewLoading = ref(false);
const creating = ref(false);

const periodStart = ref("");
const periodEnd = ref("");
const obligationId = ref<string | null>(null);

const selectedId = ref<string | null>(null);
const detail = ref<{ filing: FilingRecord; invoices: FilingRecord[] } | null>(null);
const detailLoading = ref(false);
const inviteOpen = ref(false);
const inviteMessage = ref("");
const inviting = ref(false);

const createOpen = ref(false);
const mobileDetailOpen = ref(false);
const confirmDeleteOpen = ref(false);
const removing = ref(false);
const detailSide = computed(() => (locale.value === "ar" ? "left" : "right"));

const detailTotals = computed(() => {
  const payload = detail.value?.filing?.payload;
  return (payload as Record<string, any> | undefined)?.totals ?? null;
});

const formTitle = computed(() => t("filings.actions.newDraft"));

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultPeriod() {
  const now = new Date();
  periodStart.value = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  periodEnd.value = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

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

function isDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

async function loadObligations() {
  try {
    obligations.value = (await client.filings.listObligations({
      companyId: companyId.value,
    })) as unknown as typeof obligations.value;
    const monthly =
      obligations.value.find((item) => item.code.includes("mensuel")) ?? obligations.value[0];
    obligationId.value = monthly?.id ?? null;
  } catch {
    obligations.value = [];
  }
}

async function loadList() {
  loading.value = true;
  try {
    filings.value = (await client.filings.list({
      companyId: companyId.value,
    })) as unknown as FilingRecord[];
  } catch {
    toast.add({ title: t("filings.errors.loadFailed"), color: "error" });
  } finally {
    loading.value = false;
  }
}

async function loadPreview() {
  if (!periodStart.value || !periodEnd.value) {
    return;
  }
  previewLoading.value = true;
  try {
    preview.value = (await client.filings.preview({
      companyId: companyId.value,
      periodStart: periodStart.value,
      periodEnd: periodEnd.value,
      obligationId: obligationId.value ?? undefined,
    })) as unknown as typeof preview.value;
  } catch {
    preview.value = null;
  } finally {
    previewLoading.value = false;
  }
}

async function createDraft() {
  if (!periodStart.value || !periodEnd.value) {
    return;
  }
  creating.value = true;
  try {
    const result = (await client.filings.createDraft({
      companyId: companyId.value,
      periodStart: periodStart.value,
      periodEnd: periodEnd.value,
      obligationId: obligationId.value ?? undefined,
    })) as unknown as { filing: FilingRecord };
    createOpen.value = false;
    await loadList();
    if (result?.filing?.id) {
      await selectFiling(String(result.filing.id));
    }
    toast.add({ title: t("filings.actions.createdToast"), color: "success" });
  } catch {
    toast.add({ title: t("filings.errors.createFailed"), color: "error" });
  } finally {
    creating.value = false;
  }
}

async function selectFiling(id: string, options?: { openMobile?: boolean }) {
  selectedId.value = id;
  inviteOpen.value = false;
  detailLoading.value = true;
  if (options?.openMobile !== false && !isDesktopViewport()) {
    mobileDetailOpen.value = true;
  }
  try {
    detail.value = (await client.filings.get({
      companyId: companyId.value,
      filingId: id,
    })) as unknown as { filing: FilingRecord; invoices: FilingRecord[] };
  } catch {
    detail.value = null;
  } finally {
    detailLoading.value = false;
  }
}

async function recomputeFilingRow(id: string) {
  selectedId.value = id;
  await recompute();
}

async function removeFilingRow(id: string) {
  await selectFiling(id, { openMobile: false });
  confirmDeleteOpen.value = true;
}

async function recompute() {
  if (!selectedId.value) {
    return;
  }
  try {
    await client.filings.recompute({ companyId: companyId.value, filingId: selectedId.value });
    await selectFiling(selectedId.value);
    await loadList();
  } catch {
    toast.add({ title: t("filings.errors.recomputeFailed"), color: "error" });
  }
}

async function setStatus(status: "ready" | "under_review") {
  if (!selectedId.value) {
    return;
  }
  try {
    await client.filings.updateStatus({
      companyId: companyId.value,
      filingId: selectedId.value,
      status,
    });
    await selectFiling(selectedId.value);
    await loadList();
  } catch {
    toast.add({ title: t("filings.errors.updateFailed"), color: "error" });
  }
}

async function inviteAccountant() {
  inviting.value = true;
  try {
    const result = (await client.filings.inviteAccountant({
      companyId: companyId.value,
      filingId: selectedId.value ?? undefined,
      message: inviteMessage.value || undefined,
    })) as unknown as { notified: number };
    inviteOpen.value = false;
    inviteMessage.value = "";
    toast.add({
      title: t("filings.invite.success", { count: result.notified }),
      color: "success",
    });
  } catch {
    toast.add({ title: t("filings.errors.inviteFailed"), color: "error" });
  } finally {
    inviting.value = false;
  }
}

async function confirmRemove() {
  if (!selectedId.value) {
    return;
  }
  removing.value = true;
  try {
    await client.filings.remove({ companyId: companyId.value, filingId: selectedId.value });
    confirmDeleteOpen.value = false;
    selectedId.value = null;
    detail.value = null;
    mobileDetailOpen.value = false;
    await loadList();
  } catch {
    toast.add({ title: t("filings.errors.removeFailed"), color: "error" });
  } finally {
    removing.value = false;
  }
}

function printFiling() {
  if (typeof window !== "undefined") {
    window.print();
  }
}

watch(companyId, async () => {
  selectedId.value = null;
  detail.value = null;
  createOpen.value = false;
  mobileDetailOpen.value = false;
  inviteOpen.value = false;
  defaultPeriod();
  await Promise.all([loadObligations(), loadList()]);
  await loadPreview();
});

onMounted(async () => {
  defaultPeriod();
  await Promise.all([loadObligations(), loadList()]);
  await loadPreview();
});
</script>

<template>
  <div>
    <div class="-mx-4 -mt-4 w-auto border-b border-default sm:-mx-6 sm:-mt-6">
      <div class="grid w-auto items-stretch lg:grid-cols-[minmax(0,20rem)_1px_minmax(0,1fr)]">
        <section class="min-w-0 print:hidden">
          <SectionHeader
            :title="t('filings.list.title')"
            :level="2"
            class="border-b border-default px-4 py-3 [&_h2]:min-w-0 [&_h2]:truncate [&_h2]:text-base"
          >
            <template #actions>
              <UButton
                color="primary"
                variant="ghost"
                icon="i-tabler-file-plus"
                square
                class="min-h-11 min-w-11 shrink-0 rounded-full transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]"
                :aria-label="t('filings.actions.newDraft')"
                :title="t('filings.actions.newDraft')"
                @click="createOpen = true"
              />
            </template>
          </SectionHeader>
          <FilingList
            :items="filings"
            :loading="loading"
            :selected-id="selectedId"
            @select="selectFiling"
            @recompute="recomputeFilingRow"
            @remove="removeFilingRow"
          />
        </section>

        <div
          aria-hidden="true"
          class="hidden w-px self-stretch bg-[var(--ui-border)] lg:block print:hidden"
        />

        <aside class="hidden min-w-0 lg:block">
          <div class="space-y-4 px-4 py-3 lg:sticky lg:top-20">
            <div
              v-if="!selectedId"
              class="flex flex-col items-center justify-center gap-2 px-2 py-12 text-center print:hidden"
            >
              <div
                class="flex size-12 items-center justify-center rounded-full bg-accented text-muted"
              >
                <UIcon name="i-tabler-file-invoice" class="size-6" />
              </div>
              <p class="text-base font-semibold text-highlighted">
                {{ t("filings.list.select") }}
              </p>
              <p class="text-base text-muted">{{ t("filings.list.selectHint") }}</p>
            </div>

            <LoadingState
              v-else-if="detailLoading"
              :label="t('filings.loading')"
              class="print:hidden"
            />

            <div v-else-if="detail" class="space-y-4">
              <div class="space-y-2">
                <h2 class="truncate text-base font-semibold text-highlighted" dir="ltr">
                  {{ detail.filing.periodStart }} → {{ detail.filing.periodEnd }}
                </h2>
                <div class="flex flex-wrap items-center gap-2">
                  <FilingStatusBadge :status="detail.filing.status" />
                  <span class="min-w-0 flex-1 truncate text-sm text-muted">
                    {{ detail.filing.taxType || "—" }}
                  </span>
                  <div class="ms-auto flex shrink-0 flex-wrap items-center gap-1 print:hidden">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-tabler-reload"
                      size="sm"
                      square
                      class="min-h-11 min-w-11"
                      :aria-label="t('filings.actions.recompute')"
                      :title="t('filings.actions.recompute')"
                      @click="recompute"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-tabler-check"
                      size="sm"
                      square
                      class="min-h-11 min-w-11"
                      :aria-label="t('filings.actions.markReady')"
                      :title="t('filings.actions.markReady')"
                      @click="setStatus('ready')"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-tabler-eye"
                      size="sm"
                      square
                      class="min-h-11 min-w-11"
                      :aria-label="t('filings.actions.markUnderReview')"
                      :title="t('filings.actions.markUnderReview')"
                      @click="setStatus('under_review')"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-tabler-users"
                      size="sm"
                      square
                      class="min-h-11 min-w-11"
                      :aria-label="t('filings.actions.inviteAccountant')"
                      :title="t('filings.actions.inviteAccountant')"
                      @click="inviteOpen = !inviteOpen"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-tabler-printer"
                      size="sm"
                      square
                      class="min-h-11 min-w-11"
                      :aria-label="t('filings.actions.print')"
                      :title="t('filings.actions.print')"
                      @click="printFiling"
                    />
                    <UButton
                      color="error"
                      variant="ghost"
                      icon="i-tabler-trash"
                      size="sm"
                      square
                      class="min-h-11 min-w-11"
                      :aria-label="t('filings.actions.remove')"
                      :title="t('filings.actions.remove')"
                      @click="confirmDeleteOpen = true"
                    />
                  </div>
                </div>
              </div>

              <div
                v-if="inviteOpen"
                class="-mx-4 flex flex-wrap items-end gap-2 border-y border-default px-4 py-3 print:hidden"
              >
                <UFormField :label="t('filings.invite.message')" class="min-w-0 flex-1">
                  <UInput v-model="inviteMessage" class="w-full" />
                </UFormField>
                <UButton
                  color="primary"
                  :loading="inviting"
                  :label="t('filings.invite.send')"
                  @click="inviteAccountant"
                />
              </div>

              <FilingPreview :totals="detailTotals" />

              <div class="-mx-4 divide-y divide-default border-y border-default px-4">
                <section class="space-y-3 py-3">
                  <h3 class="text-base font-medium text-highlighted">
                    {{ t("filings.detail.invoices") }}
                  </h3>
                  <div
                    v-if="detail.invoices.length === 0"
                    class="py-4 text-center text-base text-muted"
                  >
                    {{ t("filings.detail.noInvoices") }}
                  </div>
                  <ul v-else class="divide-y divide-default text-base">
                    <li
                      v-for="invoice in detail.invoices"
                      :key="invoice.id"
                      class="flex items-center justify-between gap-2 py-3"
                    >
                      <span class="min-w-0 truncate text-toned">
                        {{ invoice.invoiceNumber || invoice.supplierName || "—" }}
                      </span>
                      <span class="shrink-0 text-muted tabular-nums" dir="ltr">
                        {{ invoice.issueDate }} ·
                        {{ formatCurrency(invoice.total, invoice.currency) }}
                      </span>
                    </li>
                  </ul>
                </section>

                <details class="py-3">
                  <summary class="cursor-pointer text-sm font-medium text-toned">
                    {{ t("filings.detail.technical") }}
                  </summary>
                  <p class="mt-2 text-sm text-muted">{{ t("filings.detail.technicalHint") }}</p>
                  <dl class="mt-2 space-y-1 text-sm">
                    <div class="flex items-center justify-between gap-2">
                      <dt class="text-muted">{{ t("filings.detail.filingId") }}</dt>
                      <dd class="min-w-0 truncate text-toned" dir="ltr">
                        {{ detail.filing.id }}
                      </dd>
                    </div>
                    <div
                      v-if="detail.filing.obligationId"
                      class="flex items-center justify-between gap-2"
                    >
                      <dt class="text-muted">{{ t("filings.detail.obligationId") }}</dt>
                      <dd class="min-w-0 truncate text-toned" dir="ltr">
                        {{ detail.filing.obligationId }}
                      </dd>
                    </div>
                  </dl>
                </details>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <USlideover
      v-model:open="createOpen"
      :title="formTitle"
      :description="t('filings.preview.title')"
      :side="detailSide"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <div class="space-y-5">
          <FilingPeriodPicker
            v-model:obligation-id="obligationId"
            v-model:period-start="periodStart"
            v-model:period-end="periodEnd"
            :obligations="obligations"
            :loading="previewLoading"
            @preview="loadPreview"
          />

          <FilingPreview v-if="preview" :totals="preview.totals" />

          <div class="flex items-center justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :label="t('filings.actions.cancel')"
              @click="createOpen = false"
            />
            <UButton
              color="primary"
              icon="i-tabler-file-plus"
              :loading="creating"
              :disabled="!periodStart || !periodEnd"
              :label="t('filings.actions.createDraft')"
              @click="createDraft"
            />
          </div>
        </div>
      </template>
    </USlideover>

    <USlideover
      v-model:open="mobileDetailOpen"
      :title="
        detail
          ? `${detail.filing.periodStart} → ${detail.filing.periodEnd}`
          : t('filings.detail.title')
      "
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
            <p class="text-base text-muted">{{ t("filings.loading") }}</p>
          </div>

          <template v-else-if="detail">
            <div class="flex flex-wrap items-center gap-2">
              <FilingStatusBadge :status="detail.filing.status" />
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                color="neutral"
                variant="soft"
                icon="i-tabler-reload"
                :label="t('filings.actions.recompute')"
                @click="recompute"
              />
              <UButton
                color="neutral"
                variant="soft"
                icon="i-tabler-check"
                :label="t('filings.actions.markReady')"
                @click="setStatus('ready')"
              />
              <UButton
                color="neutral"
                variant="soft"
                icon="i-tabler-eye"
                :label="t('filings.actions.markUnderReview')"
                @click="setStatus('under_review')"
              />
              <UButton
                color="neutral"
                variant="soft"
                icon="i-tabler-users"
                :label="t('filings.actions.inviteAccountant')"
                @click="inviteOpen = !inviteOpen"
              />
              <UButton
                color="neutral"
                variant="soft"
                icon="i-tabler-printer"
                :label="t('filings.actions.print')"
                @click="printFiling"
              />
              <UButton
                color="error"
                variant="soft"
                icon="i-tabler-trash"
                :label="t('filings.actions.remove')"
                @click="confirmDeleteOpen = true"
              />
            </div>

            <div
              v-if="inviteOpen"
              class="flex flex-wrap items-end gap-2 border-y border-default py-3"
            >
              <UFormField :label="t('filings.invite.message')" class="min-w-0 flex-1">
                <UInput v-model="inviteMessage" class="w-full" />
              </UFormField>
              <UButton
                color="primary"
                :loading="inviting"
                :label="t('filings.invite.send')"
                @click="inviteAccountant"
              />
            </div>

            <dl class="grid gap-3">
              <div>
                <dt class="text-base text-muted">{{ t("filings.list.period") }}</dt>
                <dd class="text-base text-toned" dir="ltr">
                  {{ detail.filing.periodStart }} → {{ detail.filing.periodEnd }}
                </dd>
              </div>
              <div>
                <dt class="text-base text-muted">{{ t("filings.list.taxType") }}</dt>
                <dd class="text-base text-toned">{{ detail.filing.taxType }}</dd>
              </div>
            </dl>

            <FilingPreview :totals="detailTotals" />

            <div class="divide-y divide-default border-y border-default">
              <section class="space-y-3 py-3">
                <h3 class="text-base font-medium text-highlighted">
                  {{ t("filings.detail.invoices") }}
                </h3>
                <div
                  v-if="detail.invoices.length === 0"
                  class="py-4 text-center text-base text-muted"
                >
                  {{ t("filings.detail.noInvoices") }}
                </div>
                <ul v-else class="divide-y divide-default text-base">
                  <li
                    v-for="invoice in detail.invoices"
                    :key="invoice.id"
                    class="flex items-center justify-between gap-2 py-3"
                  >
                    <span class="min-w-0 truncate text-toned">
                      {{ invoice.invoiceNumber || invoice.supplierName || "—" }}
                    </span>
                    <span class="shrink-0 text-muted tabular-nums" dir="ltr">
                      {{ invoice.issueDate }} ·
                      {{ formatCurrency(invoice.total, invoice.currency) }}
                    </span>
                  </li>
                </ul>
              </section>

              <details class="py-3">
                <summary class="cursor-pointer text-sm font-medium text-toned">
                  {{ t("filings.detail.technical") }}
                </summary>
                <p class="mt-2 text-sm text-muted">{{ t("filings.detail.technicalHint") }}</p>
                <dl class="mt-2 space-y-1 text-sm">
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-muted">{{ t("filings.detail.filingId") }}</dt>
                    <dd class="min-w-0 truncate text-toned" dir="ltr">{{ detail.filing.id }}</dd>
                  </div>
                  <div
                    v-if="detail.filing.obligationId"
                    class="flex items-center justify-between gap-2"
                  >
                    <dt class="text-muted">{{ t("filings.detail.obligationId") }}</dt>
                    <dd class="min-w-0 truncate text-toned" dir="ltr">
                      {{ detail.filing.obligationId }}
                    </dd>
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
              {{ t("filings.actions.confirmDeleteTitle") }}
            </h2>
          </template>

          <p class="text-base text-muted">{{ t("filings.actions.confirmDeleteBody") }}</p>

          <template #footer>
            <div class="flex w-full items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                :label="t('filings.actions.cancel')"
                @click="confirmDeleteOpen = false"
              />
              <UButton
                color="error"
                icon="i-tabler-trash"
                :loading="removing"
                :label="t('filings.actions.confirmDelete')"
                @click="confirmRemove"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
