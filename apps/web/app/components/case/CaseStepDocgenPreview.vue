<script setup lang="ts">
const props = defineProps<{
  caseId?: string | null;
  stepId: string;
  templateCode: string;
  language: "fr" | "ar";
}>();

const { t } = useI18n();
const toast = useToast();

const { listDrafts, draftQuery, generateMutation } = useDocgen();
const { setDocgenContext, requestHandoff } = useAssistantContext();
const { setOpen } = useAssistantPanel();

const proposalId = ref<string | null>(null);
const discovering = ref(false);
const error = ref<string | null>(null);

const { data: draft, isLoading: draftLoading } = draftQuery(() => proposalId.value);

const payload = computed(() => draft.value?.payload ?? null);
const renderHtml = computed(() => payload.value?.render.html ?? "");
const dir = computed(() => ((payload.value?.language ?? props.language) === "ar" ? "rtl" : "ltr"));
const lang = computed(() => payload.value?.language ?? props.language);

const generate = generateMutation();
const busy = computed(() => discovering.value || generate.isPending.value);

async function discover(): Promise<void> {
  if (!props.caseId) {
    return;
  }
  discovering.value = true;
  try {
    const drafts = await listDrafts({ caseId: props.caseId });
    const latest = drafts
      .filter(
        (item) =>
          item.payload.templateCode === props.templateCode && item.payload.stepId === props.stepId,
      )
      .sort(
        (a, b) =>
          new Date(b.proposal.createdAt).getTime() - new Date(a.proposal.createdAt).getTime(),
      )[0];
    if (latest) {
      proposalId.value = latest.proposal.id;
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    discovering.value = false;
  }
}

onMounted(discover);

async function handoff(): Promise<void> {
  error.value = null;
  try {
    let id = proposalId.value;
    if (!id) {
      const created = await generate.mutateAsync({
        templateCode: props.templateCode,
        language: props.language,
        mode: "template",
        ...(props.caseId ? { caseId: props.caseId } : {}),
        stepId: props.stepId,
      });
      id = created.proposal.id;
      proposalId.value = id;
    }
    setDocgenContext({ stepId: props.stepId, docgenProposalId: id });
    setOpen(true);
    requestHandoff(t("cases.docgen.handoffPrompt"));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    error.value = message;
    toast.add({ title: t("cases.docgen.error"), description: message, color: "error" });
  }
}
</script>

<template>
  <div class="grid gap-4 rounded-lg border border-default p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <h3 class="text-base font-semibold text-highlighted">
          {{ t("cases.docgen.previewTitle") }}
        </h3>
        <p class="text-sm text-muted">{{ t("cases.docgen.previewSubtitle") }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <UBadge
          color="success"
          variant="subtle"
          size="lg"
          :label="t('cases.docgen.filledLegend')"
        />
        <UBadge color="neutral" variant="subtle" size="lg" :label="t('cases.docgen.blankLegend')" />
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('cases.docgen.error')"
      :description="error"
    />

    <div
      v-if="discovering || draftLoading"
      class="flex items-center gap-2 py-4 text-base text-muted"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>{{ t("common.loading") }}</span>
    </div>

    <UAlert
      v-else-if="!renderHtml"
      color="neutral"
      variant="soft"
      icon="i-tabler-file-text"
      :title="t('cases.docgen.empty')"
    />

    <div
      v-else
      class="docgen-inline rounded-lg border border-default bg-elevated p-6"
      :dir="dir"
      :lang="lang"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="renderHtml" />
    </div>

    <div class="flex justify-end">
      <UButton
        color="primary"
        icon="i-tabler-sparkles"
        :loading="busy"
        :disabled="busy"
        :label="t('cases.docgen.handoff')"
        @click="handoff"
      />
    </div>
  </div>
</template>

<style scoped>
.docgen-inline :deep(.docgen-value) {
  background: color-mix(in srgb, var(--ui-color-success-500) 18%, transparent);
  border-radius: 2px;
  padding: 0 0.15rem;
}

.docgen-inline :deep(.docgen-blank) {
  background: transparent;
}
</style>
