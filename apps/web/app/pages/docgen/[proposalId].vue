<script setup lang="ts">
import type { DocgenDraftView } from "~/composables/useDocgen";
import DocgenApprovalBar from "~/components/docgen/DocgenApprovalBar.vue";
import DocgenArtifact from "~/components/docgen/DocgenArtifact.vue";
import DocgenDraftPreview from "~/components/docgen/DocgenDraftPreview.vue";
import DocgenFieldEditor from "~/components/docgen/DocgenFieldEditor.vue";
import DocgenQuestionnaire from "~/components/docgen/DocgenQuestionnaire.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const proposalId = computed(() => String(route.params.proposalId ?? ""));

const { draftsQuery, updateMutation, approveMutation, rejectMutation } = useDocgen();

const { data, isPending, refetch } = draftsQuery({ proposalId: proposalId.value });

const draft = computed<DocgenDraftView | null>(() => data.value?.[0] ?? null);
const payload = computed(() => draft.value?.payload ?? null);
const status = computed(() => draft.value?.proposal.status ?? "draft");

const answers = ref<Record<string, string>>({});
const edits = ref<Record<string, string>>({});
const originalEdits = ref<Record<string, string>>({});
const approved = ref<DocgenDraftView | null>(null);

watch(
  draft,
  (value) => {
    if (!value) {
      return;
    }
    const next: Record<string, string> = {};
    for (const field of value.payload.fields) {
      next[field.key] = field.valueText ?? "";
    }
    edits.value = { ...next };
    originalEdits.value = { ...next };
    answers.value = {};
  },
  { immediate: true },
);

const update = updateMutation();
const approve = approveMutation();
const reject = rejectMutation();

const isBusy = computed(
  () => update.isPending.value || approve.isPending.value || reject.isPending.value,
);
const isDraft = computed(() => status.value === "draft");

type FieldEdit = { key: string; valueText: string | null };

function changedFields(): FieldEdit[] {
  const changed: FieldEdit[] = [];
  for (const [key, value] of Object.entries(edits.value)) {
    if ((originalEdits.value[key] ?? "") === value) {
      continue;
    }
    changed.push({ key, valueText: value.trim().length > 0 ? value : null });
  }
  return changed;
}

function pendingAnswers() {
  return Object.entries(answers.value)
    .filter(([, value]) => value.trim().length > 0)
    .map(([questionId, valueText]) => ({ questionId, valueText }));
}

async function save(): Promise<boolean> {
  if (!draft.value) {
    return false;
  }
  const fields = changedFields();
  const answerList = pendingAnswers();
  if (fields.length === 0 && answerList.length === 0) {
    return true;
  }
  try {
    await update.mutateAsync({
      proposalId: draft.value.proposal.id,
      fields,
      answers: answerList,
    });
    await refetch();
    return true;
  } catch (error) {
    toast.add({
      title: t("docgen.errors.updateFailed"),
      description: error instanceof Error ? error.message : undefined,
      color: "error",
    });
    return false;
  }
}

async function onApprove(): Promise<void> {
  if (!draft.value) {
    return;
  }
  const saved = await save();
  if (!saved) {
    return;
  }
  try {
    const result = (await approve.mutateAsync({
      proposalId: draft.value.proposal.id,
    })) as unknown as DocgenDraftView;
    approved.value = result;
    await refetch();
    toast.add({ title: t("docgen.approval.approvedToast"), color: "success" });
  } catch (error) {
    toast.add({
      title: t("docgen.errors.approveFailed"),
      description: error instanceof Error ? error.message : undefined,
      color: "error",
    });
  }
}

async function onReject(reason: string | undefined): Promise<void> {
  if (!draft.value) {
    return;
  }
  try {
    await reject.mutateAsync({ proposalId: draft.value.proposal.id, reason });
    await refetch();
    toast.add({ title: t("docgen.approval.rejectedToast"), color: "neutral" });
  } catch (error) {
    toast.add({
      title: t("docgen.errors.rejectFailed"),
      description: error instanceof Error ? error.message : undefined,
      color: "error",
    });
  }
}

const artifactView = computed(() => approved.value ?? draft.value);
</script>

<template>
  <div class="mx-auto w-full max-w-[100rem] space-y-3">
    <PageHeader
      :title="t('docgen.workspace.title')"
      :subtitle="t('docgen.workspace.subtitle')"
      icon="i-tabler-file-text"
      back-to="/docgen"
      dense
      max-width="max-w-[100rem]"
    >
      <template #actions>
        <UBadge
          color="neutral"
          variant="subtle"
          size="lg"
          :label="t(`docgen.status.${status}`, status)"
        />
      </template>
    </PageHeader>

    <LoadingState v-if="isPending && !draft" variant="skeleton-grid" />

    <UAlert
      v-else-if="!draft"
      color="error"
      variant="soft"
      icon="i-tabler-alert-triangle"
      :title="t('docgen.errors.loadFailed')"
    />

    <DocgenArtifact
      v-else-if="artifactView && !isDraft"
      :payload="artifactView.payload"
      :status="status"
      :document-id="artifactView.payload.approvedDocumentId ?? null"
      :storage-key="artifactView.payload.approvedStorageKey ?? null"
    />

    <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-0">
      <div class="min-w-0 self-start lg:sticky lg:top-20">
        <DocgenDraftPreview :payload="draft.payload" />
      </div>

      <div class="min-w-0 space-y-4 lg:border-s lg:border-default lg:ps-8">
        <DocgenQuestionnaire
          v-if="(payload?.questions?.length ?? 0) > 0"
          v-model="answers"
          :questions="payload?.questions ?? []"
        />

        <DocgenFieldEditor v-model="edits" :fields="draft.payload.fields" />

        <DocgenApprovalBar
          :busy="isBusy"
          :disabled="!isDraft"
          @approve="onApprove"
          @reject="onReject"
        />

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-default pt-4">
          <p class="text-sm text-muted">{{ t("docgen.editor.stickyHint") }}</p>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-tabler-device-floppy"
            :loading="update.isPending.value"
            :disabled="isBusy"
            :label="t('docgen.editor.save')"
            @click="save"
          />
        </div>
      </div>
    </div>
  </div>
</template>
