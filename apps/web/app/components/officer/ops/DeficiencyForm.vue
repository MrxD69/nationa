<script setup lang="ts">
type ChecklistItem = {
  code: string;
  labelFr: string;
  labelAr?: string | null;
  severity: "warning" | "error" | "blocker";
};

type Template = {
  id: string;
  decision: "return_for_correction" | "reject";
  labelFr: string;
  labelAr?: string | null;
  reasonFr: string;
  reasonAr?: string | null;
  checklist: ChecklistItem[];
};

const props = defineProps<{
  agencyId: string;
  submissionId: string;
  templates: Template[];
  dueOptions: number[];
}>();

const emit = defineEmits<{
  issued: [{ status: string; dueAt: string | null }];
  cancel: [];
}>();

const { t, locale, te } = useI18n();
const api = useApi();
const toast = useToast();

const selectedId = ref<string | null>(props.templates[0]?.id ?? null);
const reason = ref("");
const dueDays = ref<number | null>(props.dueOptions[0] ?? null);
const notes = ref("");
const checked = ref<Record<string, boolean>>({});
const step = ref<"form" | "confirm">("form");
const submitting = ref(false);

const selectedTemplate = computed(
  () => props.templates.find((template) => template.id === selectedId.value) ?? null,
);

function templateLabel(template: Template): string {
  return locale.value === "ar" ? template.labelAr || template.labelFr : template.labelFr;
}

function itemLabel(item: ChecklistItem): string {
  return locale.value === "ar" ? item.labelAr || item.labelFr : item.labelFr;
}

function severityKey(severity: string): string {
  const key = `officerOps.deficiency.severity.${severity}`;
  return te(key) ? t(key) : severity;
}

function applyTemplate(id: string) {
  const template = props.templates.find((item) => item.id === id);
  if (!template) {
    return;
  }
  selectedId.value = id;
  reason.value = locale.value === "ar" ? template.reasonAr || template.reasonFr : template.reasonFr;
  checked.value = Object.fromEntries(template.checklist.map((item) => [item.code, true]));
}

applyTemplate(selectedId.value ?? props.templates[0]?.id ?? "");

const checkedItems = computed(
  () => selectedTemplate.value?.checklist.filter((item) => checked.value[item.code]) ?? [],
);

const dueAt = computed<string | null>(() => {
  if (dueDays.value === null) {
    return null;
  }
  return new Date(Date.now() + dueDays.value * 86_400_000).toISOString();
});

const deadlineLabel = computed(() => {
  if (!dueAt.value) {
    return t("officerOps.deficiency.deadlineNone");
  }
  const date = new Date(dueAt.value);
  return t("officerOps.deficiency.deadline", { date: date.toLocaleDateString(locale.value) });
});

const canSubmit = computed(
  () => !submitting.value && selectedTemplate.value !== null && reason.value.trim().length >= 3,
);

async function submit() {
  if (!canSubmit.value || !selectedTemplate.value) {
    return;
  }
  submitting.value = true;
  try {
    const result = await api.officer.issueDeficiency({
      agencyId: props.agencyId,
      submissionId: props.submissionId,
      decision: selectedTemplate.value.decision,
      reason: reason.value.trim(),
      checklist: checkedItems.value.map((item) => ({
        code: item.code,
        label: itemLabel(item),
        severity: item.severity,
      })),
      dueAt: dueAt.value ?? undefined,
      notes: notes.value.trim() || undefined,
    });
    toast.add({ title: t("officerOps.deficiency.success"), color: "success" });
    emit("issued", { status: result.status, dueAt: result.dueAt ?? dueAt.value });
  } catch {
    toast.add({ title: t("officerOps.deficiency.error"), color: "error" });
    step.value = "form";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <h3 class="text-lg font-semibold text-highlighted">{{ t("officerOps.deficiency.title") }}</h3>
      <p class="text-base text-muted">{{ t("officerOps.deficiency.subtitle") }}</p>
    </div>

    <UAlert
      v-if="templates.length === 0"
      color="warning"
      variant="subtle"
      icon="i-tabler-info-circle"
      :description="t('officerOps.deficiency.noTemplates')"
    />

    <template v-else-if="step === 'form'">
      <UFormField :label="t('officerOps.deficiency.templateLabel')" required>
        <div class="divide-y divide-default">
          <button
            v-for="template in templates"
            :key="template.id"
            type="button"
            class="flex min-h-12 w-full items-center gap-3 py-3 text-start transition-control"
            :aria-pressed="template.id === selectedId"
            @click="applyTemplate(template.id)"
          >
            <UIcon
              :name="
                template.id === selectedId ? 'i-tabler-circle-check-filled' : 'i-tabler-circle'
              "
              class="size-5 shrink-0"
              :class="template.id === selectedId ? 'text-primary' : 'text-muted'"
            />
            <span
              class="text-base font-medium"
              :class="template.id === selectedId ? 'text-primary' : 'text-highlighted'"
            >
              {{ templateLabel(template) }}
            </span>
          </button>
        </div>
      </UFormField>

      <UFormField :label="t('officerOps.deficiency.reasonLabel')" required>
        <UTextarea
          v-model="reason"
          :rows="4"
          class="w-full"
          :placeholder="t('officerOps.deficiency.reasonPlaceholder')"
        />
      </UFormField>

      <div v-if="selectedTemplate && selectedTemplate.checklist.length > 0">
        <UFormField :label="t('officerOps.deficiency.checklistLabel')">
          <div class="divide-y divide-default">
            <label
              v-for="item in selectedTemplate.checklist"
              :key="item.code"
              class="flex min-h-11 cursor-pointer items-center gap-3 py-3"
            >
              <UCheckbox v-model="checked[item.code]" />
              <span class="min-w-0 flex-1 text-base text-toned">{{ itemLabel(item) }}</span>
              <UBadge
                :color="
                  item.severity === 'blocker'
                    ? 'error'
                    : item.severity === 'error'
                      ? 'warning'
                      : 'neutral'
                "
                variant="subtle"
                :label="severityKey(item.severity)"
              />
            </label>
          </div>
        </UFormField>
      </div>

      <UFormField :label="t('officerOps.deficiency.dueLabel')">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="days in dueOptions"
            :key="days"
            size="md"
            :color="dueDays === days ? 'primary' : 'neutral'"
            :variant="dueDays === days ? 'solid' : 'soft'"
            :icon="dueDays === days ? 'i-tabler-calendar-check' : 'i-tabler-calendar'"
            :label="t('officerOps.deficiency.dueIn', { count: days })"
            @click="dueDays = days"
          />
          <UButton
            size="md"
            :color="dueDays === null ? 'primary' : 'neutral'"
            :variant="dueDays === null ? 'solid' : 'soft'"
            :icon="dueDays === null ? 'i-tabler-calendar-check' : 'i-tabler-calendar-off'"
            :label="t('officerOps.deficiency.dueNone')"
            @click="dueDays = null"
          />
        </div>
      </UFormField>

      <UFormField :label="t('officerOps.deficiency.notesLabel')">
        <UTextarea
          v-model="notes"
          :rows="2"
          class="w-full"
          :placeholder="t('officerOps.deficiency.notesPlaceholder')"
        />
      </UFormField>
    </template>

    <div v-else class="space-y-4">
      <div class="space-y-1">
        <p class="text-lg font-semibold text-highlighted">
          {{ t("officerOps.deficiency.confirmTitle") }}
        </p>
        <p class="text-base text-muted">{{ t("officerOps.deficiency.confirmBody") }}</p>
      </div>

      <div class="space-y-2">
        <p class="text-sm font-medium text-muted">
          {{ t("officerOps.deficiency.applicantWillReceive") }}
        </p>
        <p class="whitespace-pre-line border-s-2 border-default ps-3 text-base text-toned">
          {{ reason }}
        </p>
        <p class="flex items-center gap-2 text-base text-toned">
          <UIcon name="i-tabler-calendar-clock" class="size-5 shrink-0" />
          {{ deadlineLabel }}
        </p>
        <p v-if="checkedItems.length > 0" class="text-base text-muted">
          {{ t("officerOps.deficiency.checklistLabel") }} : {{ checkedItems.length }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap justify-end gap-2 border-t border-default pt-4">
      <UButton
        size="md"
        color="neutral"
        variant="ghost"
        :label="t('officerOps.deficiency.cancel')"
        @click="emit('cancel')"
      />
      <UButton
        v-if="step === 'confirm'"
        size="md"
        color="neutral"
        variant="soft"
        icon="i-tabler-arrow-left"
        :ui="{ leadingIcon: 'rtl:rotate-180' }"
        :label="t('officerOps.deficiency.back')"
        @click="step = 'form'"
      />
      <UButton
        v-if="step === 'form'"
        size="md"
        color="warning"
        icon="i-tabler-send"
        :disabled="!canSubmit"
        :label="t('officerOps.deficiency.submit')"
        @click="step = 'confirm'"
      />
      <UButton
        v-else
        size="md"
        color="warning"
        icon="i-tabler-send"
        :loading="submitting"
        :disabled="!canSubmit"
        :label="t('officerOps.deficiency.submit')"
        @click="submit"
      />
    </div>
  </div>
</template>
