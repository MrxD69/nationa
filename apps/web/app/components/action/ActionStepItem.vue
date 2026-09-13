<script setup lang="ts">
import type { ActionFinding, ActionStep } from "~/composables/useActions";
import { FIELD_LABELS, normalizeFieldKey } from "@nationa/api/domain/fields";
import ActionDescription from "~/components/action/ActionDescription.vue";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";
import FormPreview from "~/components/form/FormPreview.vue";
import { matchForms } from "~/constants/forms";
import { parseChecklist } from "~/utils/checklist";

const props = defineProps<{
  step: ActionStep;
  index: number;
  total: number;
  last?: boolean;
  open?: boolean;
  current?: boolean;
  agencyId?: string | null;
}>();

const emit = defineEmits<{ (event: "toggle"): void }>();

const { locale, t } = useI18n();

const ICONS: Record<string, string> = {
  not_started: "i-tabler-circle",
  in_progress: "i-tabler-progress",
  done: "i-tabler-circle-check",
  verified: "i-tabler-shield-check",
  generated: "i-tabler-file-check",
  needs_correction: "i-tabler-alert-triangle",
  blocked: "i-tabler-ban",
  locked: "i-tabler-lock",
};

const TONES: Record<string, string> = {
  not_started: "border-default bg-default text-dimmed",
  in_progress: "border-info bg-info/10 text-info",
  done: "border-success bg-success/10 text-success",
  verified: "border-success bg-success/10 text-success",
  generated: "border-primary bg-primary/10 text-primary",
  needs_correction: "border-warning bg-warning/10 text-warning",
  blocked: "border-error bg-error/10 text-error",
  locked: "border-default bg-muted text-dimmed",
};

const SEVERITY_COLORS: Record<
  string,
  "primary" | "info" | "success" | "warning" | "error" | "neutral"
> = {
  info: "info",
  warning: "warning",
  error: "error",
  blocker: "error",
};

const locked = computed(() => !props.step.reachable && props.step.state === "not_started");
const badgeState = computed(() => (locked.value ? "locked" : props.step.state));

const title = computed(() =>
  locale.value === "ar" ? (props.step.titleAr ?? props.step.titleFr) : props.step.titleFr,
);

/**
 * The official paperwork this step is really about. Showing the front page beside
 * the instruction means someone who has never filed before can recognise the form
 * rather than guess at its name.
 */
const forms = computed(() =>
  matchForms({
    title: title.value,
    description: props.step.description,
    documentTypeCode: props.step.requiredDocumentType?.code ?? null,
    agencyId: props.agencyId ?? null,
  }),
);

const generatedDocuments = computed(() =>
  props.step.documents.filter(
    (entry) =>
      entry.version &&
      (entry.version.source === "generated" || entry.version.source === "ai_generated"),
  ),
);

/**
 * What opening this step would add. The instruction itself is never in here — it
 * is printed with the step, because hiding "what to do" behind a chevron is how
 * people miss it. A disclosure that expands into an empty box is worse than no
 * disclosure, so a step with no extra material simply is not expandable.
 */
type DetailChip = { key: string; icon: string; label: string; count: number };

const detailChips = computed<DetailChip[]>(() => {
  const chips: DetailChip[] = [];

  if (forms.value.length) {
    chips.push({
      key: "forms",
      icon: "i-tabler-file-description",
      label: t("actions.step.officialForm"),
      count: forms.value.length,
    });
  }
  if (props.step.requiredDocumentType) {
    chips.push({
      key: "requiredDocument",
      icon: "i-tabler-file-text",
      label: t("actions.tracker.requiredDocuments"),
      count: 1,
    });
  }
  if (generatedDocuments.value.length) {
    chips.push({
      key: "generated",
      icon: "i-tabler-file-check",
      label: t("actions.tracker.generatedArtifacts"),
      count: generatedDocuments.value.length,
    });
  }
  if (props.step.findings.length) {
    chips.push({
      key: "findings",
      icon: "i-tabler-alert-triangle",
      label: t("actions.tracker.findings"),
      count: props.step.findings.length,
    });
  }
  if (props.step.fields.length) {
    chips.push({
      key: "fields",
      icon: "i-tabler-list-details",
      label: t("actions.tracker.fields"),
      count: props.step.fields.length,
    });
  }
  if (props.step.citations.length) {
    chips.push({
      key: "citations",
      icon: "i-tabler-scale",
      label: t("actions.step.legalInfo"),
      count: props.step.citations.length,
    });
  }

  return chips;
});

const hasDetails = computed(() => detailChips.value.length > 0);

/* A description that is really a checklist gets its point count in the label. */
const checkpointCount = computed(() => parseChecklist(props.step.description).items.length);

const requiredDocumentName = computed(() => {
  const type = props.step.requiredDocumentType;
  if (!type) {
    return "";
  }
  return locale.value === "ar" ? (type.nameAr ?? type.nameFr) : type.nameFr;
});

function citationTitle(citation: ActionStep["citations"][number]): string {
  if (locale.value === "ar") {
    return citation.titleAr ?? citation.titleFr ?? citation.source;
  }
  return citation.titleFr ?? citation.titleAr ?? citation.source;
}

function citationText(citation: ActionStep["citations"][number]): string {
  if (locale.value === "ar") {
    return citation.textAr ?? citation.textFr ?? "";
  }
  return citation.textFr ?? citation.textAr ?? "";
}

function severityColor(finding: ActionFinding) {
  return SEVERITY_COLORS[finding.severity] ?? "neutral";
}

/**
 * Field keys arrive as machine identifiers (`legalName`, `taxId`…). Show the
 * translated label a person can read, falling back to a neutral word instead of
 * leaking the raw key.
 */
function fieldLabel(key: string): string {
  const normalized = normalizeFieldKey(key);
  const labels = normalized ? FIELD_LABELS[normalized] : undefined;
  if (!labels) {
    return t("actions.fields.unknown");
  }
  return locale.value === "ar" ? (labels.ar ?? labels.fr) : labels.fr;
}

const ADDRESS_PARTS = [
  "street",
  "building",
  "office",
  "locality",
  "postalCode",
  "city",
  "governorate",
  "country",
] as const;

/**
 * Turn stored values into readable text: join address parts, expand arrays and
 * plain objects, and never dump raw JSON at the reader.
 */
function humanizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? t("actions.fields.yes") : t("actions.fields.no");
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => humanizeValue(entry))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const address = ADDRESS_PARTS.map((part) => humanizeValue(record[part])).filter(Boolean);
    if (address.length > 0) {
      return address.join(", ");
    }
    return Object.entries(record)
      .map(([key, entry]) => {
        const text = humanizeValue(entry);
        return text ? `${fieldLabel(key)}: ${text}` : "";
      })
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

function fieldValue(field: ActionStep["fields"][number]): string {
  return field.valueText ?? humanizeValue(field.valueJsonb);
}

function isNumericText(value: string): boolean {
  return value.length > 0 && /\d/.test(value) && /^[\d\s.,:/\-%+()]+$/.test(value);
}

/** One label style for every block inside a step, so the eye stops re-learning it. */
const LABEL_CLASS = "text-xs font-semibold tracking-wide text-dimmed uppercase";
</script>

<template>
  <li class="relative flex gap-4" data-reveal-item>
    <div class="flex flex-col items-center">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-full border transition-control"
        :class="[
          TONES[badgeState] ?? TONES.not_started,
          props.current ? 'ring-2 ring-primary/30' : '',
        ]"
      >
        <UIcon :name="ICONS[badgeState] ?? 'i-tabler-circle'" class="size-5" />
      </span>
      <span v-if="!props.last" class="mt-2 w-px flex-1 bg-(--ui-border)" />
    </div>

    <!--
      A step is a row on one timeline, not an object in its own box. The steps are
      separated by a single rule; nothing here gets its own border and radius.
    -->
    <div class="min-w-0 flex-1 pb-6" :class="props.last ? '' : 'border-b border-default'">
      <component
        :is="hasDetails ? 'button' : 'div'"
        :type="hasDetails ? 'button' : undefined"
        class="group/head flex w-full items-start justify-between gap-4 rounded-md py-1.5 text-start"
        :aria-expanded="hasDetails ? props.open : undefined"
        @click="hasDetails ? emit('toggle') : undefined"
      >
        <span class="min-w-0 space-y-1">
          <span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span class="tabular">
              {{
                t("actions.tracker.stepOf", { position: props.step.position, total: props.total })
              }}
            </span>
            <span v-if="props.step.isOptional" class="text-dimmed">
              · {{ t("actions.step.optional") }}
            </span>
            <UBadge v-if="props.current" color="primary" variant="subtle" size="sm">
              {{ t("actions.step.current") }}
            </UBadge>
          </span>

          <span
            class="block text-lg leading-6 font-semibold transition-control"
            :class="[
              locked ? 'text-muted' : 'text-highlighted',
              hasDetails && !locked ? 'group-hover/head:text-primary' : '',
            ]"
          >
            {{ title }}
          </span>

          <span v-if="locked" class="block text-sm leading-6 text-dimmed">
            {{ t("actions.step.lockedHint") }}
          </span>
        </span>

        <span class="flex shrink-0 items-center gap-2">
          <ActionStatusBadge :state="badgeState" size="sm" />
          <UIcon
            v-if="hasDetails"
            name="i-tabler-chevron-down"
            class="size-5 text-dimmed transition-transform"
            :class="props.open ? 'rotate-180' : ''"
          />
        </span>
      </component>

      <!-- What to do is the step. It stays on the page whether or not the extra
           material below is expanded. -->
      <div v-if="props.step.description" class="space-y-2 pt-1">
        <h4 class="flex flex-wrap items-baseline gap-2">
          <span :class="LABEL_CLASS">{{ t("actions.step.whatToDo") }}</span>
          <span v-if="checkpointCount" class="tabular text-xs text-dimmed normal-case">
            {{ t("actions.step.checkpoints", { count: checkpointCount }, checkpointCount) }}
          </span>
        </h4>
        <ActionDescription :text="props.step.description" />
      </div>

      <!-- Collapsed, the step still says what expanding it would show. -->
      <button
        v-if="hasDetails && !props.open"
        type="button"
        class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md text-sm text-muted transition-control hover:text-primary"
        :aria-expanded="false"
        @click="emit('toggle')"
      >
        <span
          v-for="chip in detailChips"
          :key="chip.key"
          class="inline-flex items-center gap-1.5 rounded-md border border-default px-2 py-1"
        >
          <UIcon :name="chip.icon" class="size-4 shrink-0 text-dimmed" />
          {{ chip.label }}
          <span v-if="chip.count > 1" class="tabular text-dimmed">{{ chip.count }}</span>
        </span>
        <span class="inline-flex items-center gap-1 font-medium">
          {{ t("actions.step.showDetails") }}
          <UIcon name="i-tabler-chevron-down" class="size-4" />
        </span>
      </button>

      <div v-show="hasDetails && props.open" class="space-y-6 pt-4">
        <div v-if="forms.length" class="space-y-2">
          <h4 :class="LABEL_CLASS">{{ t("actions.step.officialForm") }}</h4>
          <div class="grid gap-3">
            <FormPreview v-for="form in forms" :key="form.id" :form="form" />
          </div>
        </div>

        <div v-if="props.step.requiredDocumentType" class="space-y-2">
          <h4 :class="LABEL_CLASS">{{ t("actions.tracker.requiredDocuments") }}</h4>
          <p class="flex items-center gap-2 text-base text-toned">
            <UIcon name="i-tabler-file-text" class="size-5 shrink-0 text-primary" />
            {{ requiredDocumentName }}
          </p>
        </div>

        <div v-if="generatedDocuments.length" class="space-y-2">
          <h4 :class="LABEL_CLASS">{{ t("actions.tracker.generatedArtifacts") }}</h4>
          <ul class="m-0 grid list-none gap-2 p-0">
            <li
              v-for="entry in generatedDocuments"
              :key="entry.document.id"
              class="flex items-center gap-2 text-base text-toned"
            >
              <UIcon name="i-tabler-file-check" class="size-5 shrink-0 text-success" />
              <span class="truncate">{{ entry.document.title }}</span>
            </li>
          </ul>
        </div>

        <div v-if="props.step.findings.length" class="space-y-2">
          <h4 :class="LABEL_CLASS">{{ t("actions.tracker.findings") }}</h4>
          <ul class="m-0 list-none divide-y divide-default border-y border-default p-0">
            <li v-for="finding in props.step.findings" :key="finding.id" class="space-y-1 py-3">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :color="severityColor(finding)" variant="subtle" size="sm">
                  {{ t(`actions.severity.${finding.severity}`, finding.severity) }}
                </UBadge>
                <span class="text-base font-semibold text-highlighted">{{ finding.title }}</span>
              </div>
              <p class="text-base leading-7 text-muted">{{ finding.messagePlain }}</p>
              <p
                v-if="finding.suggestedFix"
                class="flex items-start gap-1.5 text-base leading-7 text-primary"
              >
                <UIcon name="i-tabler-bulb" class="mt-1 size-4 shrink-0" />
                {{ finding.suggestedFix }}
              </p>
            </li>
          </ul>
        </div>

        <div v-if="props.step.fields.length" class="space-y-2">
          <h4 :class="LABEL_CLASS">{{ t("actions.tracker.fields") }}</h4>
          <dl class="m-0 divide-y divide-default border-y border-default">
            <div
              v-for="field in props.step.fields"
              :key="field.id"
              class="grid gap-x-4 gap-y-0.5 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]"
            >
              <dt class="text-sm text-muted sm:text-base">{{ fieldLabel(field.fieldKey) }}</dt>
              <dd
                class="min-w-0 text-base break-words text-toned"
                :class="isNumericText(fieldValue(field)) ? 'tabular' : ''"
                :dir="isNumericText(fieldValue(field)) ? 'ltr' : undefined"
              >
                {{ fieldValue(field) }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Legal references used to hide inside a tooltip. They are the reason a
             step exists, so they are written out where they can be read and linked. -->
        <div v-if="props.step.citations.length" class="space-y-2">
          <h4 :class="LABEL_CLASS">{{ t("actions.step.legalInfo") }}</h4>
          <ul class="m-0 list-none space-y-3 p-0">
            <li
              v-for="citation in props.step.citations"
              :key="citation.id"
              class="rounded-md border border-default bg-muted/40 p-3"
            >
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="neutral" variant="subtle" size="sm">{{ citation.source }}</UBadge>
                <span v-if="citation.article" class="text-sm text-muted">
                  {{ citation.article }}
                </span>
              </div>
              <p class="mt-1.5 text-base font-medium text-highlighted">
                {{ citationTitle(citation) }}
              </p>
              <p v-if="citationText(citation)" class="mt-1 text-base leading-7 text-muted">
                {{ citationText(citation) }}
              </p>
              <UButton
                v-if="citation.url"
                :to="citation.url"
                target="_blank"
                external
                color="neutral"
                variant="link"
                size="sm"
                icon="i-tabler-external-link"
                :label="t('actions.tracker.openCitation')"
                class="mt-1 px-0"
              />
            </li>
          </ul>
        </div>
      </div>
    </div>
  </li>
</template>
