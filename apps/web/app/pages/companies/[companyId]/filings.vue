<script setup lang="ts">
import FilingList from "~/components/filing/FilingList.vue";
import FilingPeriodPicker from "~/components/filing/FilingPeriodPicker.vue";
import FilingPreview from "~/components/filing/FilingPreview.vue";
import FilingStatusBadge from "~/components/filing/FilingStatusBadge.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const client = useApi();
const { t } = useI18n();
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

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultPeriod() {
  const now = new Date();
  periodStart.value = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  periodEnd.value = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
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
    await loadList();
    if (result?.filing?.id) {
      await selectFiling(String(result.filing.id));
    }
    toast.add({ title: t("filings.preview.title"), color: "success" });
  } catch {
    toast.add({ title: t("filings.errors.createFailed"), color: "error" });
  } finally {
    creating.value = false;
  }
}

async function selectFiling(id: string) {
  selectedId.value = id;
  detailLoading.value = true;
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

async function removeFiling() {
  if (!selectedId.value) {
    return;
  }
  try {
    await client.filings.remove({ companyId: companyId.value, filingId: selectedId.value });
    selectedId.value = null;
    detail.value = null;
    await loadList();
  } catch {
    toast.add({ title: t("filings.errors.removeFailed"), color: "error" });
  }
}

function printFiling() {
  if (typeof window !== "undefined") {
    window.print();
  }
}

const detailTotals = computed(() => {
  const payload = detail.value?.filing?.payload;
  return (payload as Record<string, any> | undefined)?.totals ?? null;
});

onMounted(async () => {
  defaultPeriod();
  await Promise.all([loadObligations(), loadList()]);
  await loadPreview();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3 print:hidden">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-highlighted">
          {{ t("filings.title") }}
        </h1>
        <p class="text-sm text-muted">{{ t("filings.subtitle") }}</p>
      </div>
      <UBadge
        color="neutral"
        variant="subtle"
        :label="t('filings.count', { count: filings.length })"
      />
    </div>

    <UCard class="print:hidden">
      <template #header>
        <h2 class="text-sm font-semibold text-highlighted">{{ t("filings.preview.title") }}</h2>
      </template>

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
            color="primary"
            icon="i-tabler-file-plus"
            :loading="creating"
            :disabled="!periodStart || !periodEnd"
            :label="t('filings.actions.createDraft')"
            @click="createDraft"
          />
        </div>
      </div>
    </UCard>

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="space-y-3 print:hidden">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-highlighted">{{ t("filings.title") }}</h2>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-tabler-reload"
            :label="t('filings.actions.refresh')"
            @click="loadList"
          />
        </div>
        <FilingList
          :items="filings"
          :loading="loading"
          :selected-id="selectedId"
          @select="selectFiling"
        />
      </section>

      <section v-if="selectedId" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <h2 class="text-sm font-semibold text-highlighted">{{ t("filings.detail.title") }}</h2>
          <div class="flex flex-wrap items-center gap-2">
            <FilingStatusBadge :status="detail?.filing?.status" />
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-tabler-reload"
              :label="t('filings.actions.recompute')"
              @click="recompute"
            />
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-tabler-check"
              :label="t('filings.actions.markReady')"
              @click="setStatus('ready')"
            />
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-tabler-eye"
              :label="t('filings.actions.markUnderReview')"
              @click="setStatus('under_review')"
            />
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-tabler-users"
              :label="t('filings.actions.inviteAccountant')"
              @click="inviteOpen = !inviteOpen"
            />
            <UButton
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-tabler-printer"
              :label="t('filings.actions.print')"
              @click="printFiling"
            />
            <UButton
              color="error"
              variant="soft"
              size="xs"
              icon="i-tabler-trash"
              :label="t('filings.actions.remove')"
              @click="removeFiling"
            />
          </div>
        </div>

        <div
          v-if="inviteOpen"
          class="flex flex-wrap items-end gap-2 rounded-xl border border-default p-3 print:hidden"
        >
          <UFormField :label="t('filings.invite.message')" class="min-w-64 flex-1">
            <UInput v-model="inviteMessage" class="w-full" />
          </UFormField>
          <UButton
            color="primary"
            size="sm"
            :loading="inviting"
            :label="t('filings.invite.send')"
            @click="inviteAccountant"
          />
        </div>

        <div v-if="detailLoading" class="flex items-center gap-2 py-8 text-sm text-muted">
          <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
          {{ t("filings.loading") }}
        </div>

        <div v-else-if="detail" class="filing-print space-y-4">
          <UCard>
            <dl class="grid gap-3 sm:grid-cols-2">
              <div>
                <dt class="text-xs text-muted">{{ t("filings.list.period") }}</dt>
                <dd class="text-sm text-toned" dir="ltr">
                  {{ detail.filing.periodStart }} → {{ detail.filing.periodEnd }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted">{{ t("filings.list.taxType") }}</dt>
                <dd class="text-sm text-toned">{{ detail.filing.taxType }}</dd>
              </div>
            </dl>
          </UCard>

          <FilingPreview :totals="detailTotals" />

          <UCard>
            <template #header>
              <h3 class="text-sm font-medium text-highlighted">
                {{ t("filings.detail.invoices") }}
              </h3>
            </template>
            <div v-if="detail.invoices.length === 0" class="py-4 text-center text-xs text-muted">
              {{ t("filings.detail.noInvoices") }}
            </div>
            <ul v-else class="divide-y divide-default text-sm">
              <li
                v-for="invoice in detail.invoices"
                :key="invoice.id"
                class="flex items-center justify-between gap-2 py-2"
              >
                <span class="text-toned">{{
                  invoice.invoiceNumber || invoice.supplierName || "—"
                }}</span>
                <span class="text-muted" dir="ltr">
                  {{ invoice.issueDate }} · {{ invoice.total }}
                </span>
              </li>
            </ul>
          </UCard>
        </div>
      </section>
    </div>
  </div>
</template>
