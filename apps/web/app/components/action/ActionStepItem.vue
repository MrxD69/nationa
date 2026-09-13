<script setup lang="ts">
import type { ActionFinding, ActionStep } from "~/composables/useActions";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";
import FormPreview from "~/components/form/FormPreview.vue";
import { matchForms } from "~/constants/forms";

const props = defineProps<{
  step: ActionStep;
  index: number;
  total: number;
  last?: boolean;
  defaultOpen?: boolean;
  agencyId?: string | null;
}>();

const { locale, t } = useI18n();

const open = ref(Boolean(props.defaultOpen));

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
  not_started: "text-muted",
  in_progress: "text-info",
  done: "text-success",
  verified: "text-success",
  generated: "text-primary",
  needs_correction: "text-warning",
  blocked: "text-error",
  locked: "text-dimmed",
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

const badgeState = computed(() =>
  !props.step.reachable && props.step.state === "not_started" ? "locked" : props.step.state,
);

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

/**
 * Whether opening this step would show anything at all. A disclosure that expands
 * into an empty box is worse than no disclosure, so a step with no detail simply
 * is not expandable.
 */
const hasDetails = computed(
  () =>
    Boolean(props.step.description) ||
    forms.value.length > 0 ||
    Boolean(props.step.requiredDocumentType) ||
    generatedDocuments.value.length > 0 ||
    props.step.citations.length > 0 ||
    props.step.findings.length > 0 ||
    props.step.fields.length > 0,
);

const generatedDocuments = computed(() =>
  props.step.documents.filter(
    (entry) =>
      entry.version &&
      (entry.version.source === "generated" || entry.version.source === "ai_generated"),
  ),
);

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

function fieldValue(value: { valueText: string | null; valueJsonb: unknown }): string {
  if (value.valueText) {
    return value.valueText;
  }
  if (value.valueJsonb === null || value.valueJsonb === undefined) {
    return "";
  }
  if (typeof value.valueJsonb === "object") {
    return JSON.stringify(value.valueJsonb);
  }
  return String(value.valueJsonb);
}
</script>

<template>
  <li class="relative flex gap-4" data-reveal-item>
    <div class="flex flex-col items-center">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-full border border-default bg-default"
        :class="TONES[badgeState] ?? 'text-muted'"
      >
        <UIcon :name="ICONS[badgeState] ?? 'i-tabler-circle'" class="size-6" />
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
        class="flex w-full items-start justify-between gap-4 py-2 text-start"
        :aria-expanded="hasDetails ? open : undefined"
        @click="hasDetails ? (open = !open) : undefined"
      >
        <span class="min-w-0 space-y-1">
          <span class="flex flex-wrap items-center gap-2 text-base text-muted">
            {{ t("actions.tracker.stepOf", { position: props.step.position, total: props.total }) }}
            <span v-if="props.step.isOptional" class="text-dimmed">
              · {{ t("actions.step.optional") }}
            </span>
          </span>
          <span class="block text-lg font-semibold text-highlighted" :title="title">
            {{ title }}
          </span>
        </span>

        <span class="flex shrink-0 items-center gap-2">
          <ActionStatusBadge :state="badgeState" size="lg" />
          <UIcon
            v-if="hasDetails"
            name="i-tabler-chevron-down"
            class="size-6 text-muted transition-transform"
            :class="open ? 'rotate-180' : ''"
          />
        </span>
      </component>

      <div v-show="hasDetails && open" class="space-y-6 pt-3">
        <div v-if="props.step.description" class="space-y-1">
          <h4 class="text-base font-semibold tracking-wide text-muted uppercase">
            {{ t("actions.step.objective") }}
          </h4>
          <p class="text-base leading-7 text-toned">{{ props.step.description }}</p>
        </div>

        <div v-if="forms.length" class="space-y-2">
          <h4 class="text-base font-semibold tracking-wide text-muted uppercase">
            {{ t("actions.step.officialForm") }}
          </h4>
          <div class="grid gap-3">
            <FormPreview v-for="form in forms" :key="form.id" :form="form" />
          </div>
        </div>

        <div v-if="props.step.requiredDocumentType" class="space-y-2">
          <h4 class="text-base font-semibold tracking-wide text-muted uppercase">
            {{ t("actions.tracker.requiredDocuments") }}
          </h4>
          <div class="flex items-center gap-2">
            <UIcon name="i-tabler-file-text" class="size-6 text-primary" />
            <span class="text-base text-toned">
              {{
                locale === "ar"
                  ? (props.step.requiredDocumentType.nameAr ??
                    props.step.requiredDocumentType.nameFr)
                  : props.step.requiredDocumentType.nameFr
              }}
            </span>
          </div>
        </div>

        <div v-if="generatedDocuments.length" class="space-y-2">
          <h4 class="text-base font-semibold tracking-wide text-muted uppercase">
            {{ t("actions.tracker.generatedArtifacts") }}
          </h4>
          <ul class="grid gap-2">
            <li
              v-for="entry in generatedDocuments"
              :key="entry.document.id"
              class="flex items-center gap-2 text-base text-toned"
            >
              <UIcon name="i-tabler-file-check" class="size-6 text-success" />
              <span class="truncate">{{ entry.document.title }}</span>
            </li>
          </ul>
        </div>

        <div v-if="props.step.citations.length" class="space-y-2">
          <h4 class="text-base font-semibold tracking-wide text-muted uppercase">
            {{ t("actions.tracker.citations") }}
          </h4>
          <ul class="divide-y divide-default border-y border-default">
            <li v-for="citation in props.step.citations" :key="citation.id" class="py-3">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="neutral" variant="subtle" size="lg">{{ citation.source }}</UBadge>
                <span v-if="citation.article" class="text-base text-muted">
                  {{ citation.article }}
                </span>
              </div>
              <div class="mt-1 text-base font-medium text-highlighted">
                {{ citationTitle(citation) }}
              </div>
              <p v-if="citationText(citation)" class="mt-1 text-base leading-6 text-muted">
                {{ citationText(citation) }}
              </p>
              <UButton
                v-if="citation.url"
                :to="citation.url"
                target="_blank"
                external
                size="lg"
                color="neutral"
                variant="link"
                icon="i-tabler-external-link"
                :label="t('actions.tracker.citations')"
                class="mt-1 px-0"
              />
            </li>
          </ul>
        </div>

        <div v-if="props.step.findings.length" class="space-y-2">
          <h4 class="text-base font-semibold tracking-wide text-muted uppercase">
            {{ t("actions.tracker.findings") }}
          </h4>
          <ul class="divide-y divide-default border-y border-default">
            <li v-for="finding in props.step.findings" :key="finding.id" class="py-3">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :color="severityColor(finding)" variant="subtle" size="lg">
                  {{ t(`actions.severity.${finding.severity}`, finding.severity) }}
                </UBadge>
                <span class="text-base font-medium text-highlighted">{{ finding.title }}</span>
              </div>
              <p class="mt-1 text-base leading-6 text-muted">{{ finding.messagePlain }}</p>
              <p v-if="finding.suggestedFix" class="mt-1 text-base text-primary">
                {{ finding.suggestedFix }}
              </p>
            </li>
          </ul>
        </div>

        <div v-if="props.step.fields.length" class="space-y-2">
          <h4 class="text-base font-semibold tracking-wide text-muted uppercase">
            {{ t("actions.tracker.fields") }}
          </h4>
          <dl class="divide-y divide-default border-y border-default">
            <div
              v-for="field in props.step.fields"
              :key="field.id"
              class="flex min-w-0 items-baseline justify-between gap-4 py-3"
            >
              <dt class="truncate text-base text-muted">{{ field.fieldKey }}</dt>
              <dd class="truncate text-base text-toned" :title="fieldValue(field)">
                {{ fieldValue(field) }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </li>
</template>
