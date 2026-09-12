<script setup lang="ts">
import type { ActionFinding, ActionStep } from "~/composables/useActions";
import ActionStatusBadge from "~/components/action/ActionStatusBadge.vue";

const props = defineProps<{
  step: ActionStep;
  index: number;
  total: number;
  last?: boolean;
  defaultOpen?: boolean;
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
  <li class="relative flex gap-3 sm:gap-4" data-reveal-item>
    <div class="flex flex-col items-center">
      <span
        class="flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-elevated"
        :class="TONES[badgeState] ?? 'text-muted'"
      >
        <UIcon :name="ICONS[badgeState] ?? 'i-tabler-circle'" class="size-4" />
      </span>
      <span
        v-if="!props.last"
        class="mt-1 w-px flex-1"
        style="background-color: var(--ui-border)"
      />
    </div>

    <div class="min-w-0 flex-1 pb-6">
      <div class="rounded-lg border border-default bg-elevated">
        <button
          type="button"
          class="flex w-full items-start justify-between gap-3 px-4 py-3 text-start"
          :aria-expanded="open"
          @click="open = !open"
        >
          <div class="min-w-0 space-y-0.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium text-muted">
                {{
                  t("actions.tracker.stepOf", { position: props.step.position, total: props.total })
                }}
              </span>
              <span v-if="props.step.isOptional" class="text-xs text-dimmed">
                · {{ t("actions.step.optional") }}
              </span>
            </div>
            <div class="truncate text-sm font-medium text-highlighted" :title="title">
              {{ title }}
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <ActionStatusBadge :state="badgeState" size="xs" />
            <UIcon
              name="i-tabler-chevron-down"
              class="size-4 text-muted transition-transform"
              :class="open ? 'rotate-180' : ''"
            />
          </div>
        </button>

        <div v-show="open" class="space-y-4 border-t border-default px-4 py-4">
          <div v-if="props.step.description" class="space-y-1">
            <h4 class="text-xs font-medium uppercase tracking-wide text-muted">
              {{ t("actions.step.objective") }}
            </h4>
            <p class="text-sm leading-6 text-toned">{{ props.step.description }}</p>
          </div>

          <div v-if="props.step.requiredDocumentType" class="space-y-2">
            <h4 class="text-xs font-medium uppercase tracking-wide text-muted">
              {{ t("actions.tracker.requiredDocuments") }}
            </h4>
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-file-text" class="size-4 text-primary" />
              <span class="text-sm text-toned">
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
            <h4 class="text-xs font-medium uppercase tracking-wide text-muted">
              {{ t("actions.tracker.generatedArtifacts") }}
            </h4>
            <ul class="grid gap-1.5">
              <li
                v-for="entry in generatedDocuments"
                :key="entry.document.id"
                class="flex items-center gap-2 text-sm text-toned"
              >
                <UIcon name="i-tabler-file-check" class="size-4 text-success" />
                <span class="truncate">{{ entry.document.title }}</span>
              </li>
            </ul>
          </div>

          <div v-if="props.step.citations.length" class="space-y-2">
            <h4 class="text-xs font-medium uppercase tracking-wide text-muted">
              {{ t("actions.tracker.citations") }}
            </h4>
            <ul class="grid gap-2">
              <li
                v-for="citation in props.step.citations"
                :key="citation.id"
                class="rounded-md border border-muted px-3 py-2"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge color="neutral" variant="subtle" size="xs">
                    {{ citation.source }}
                  </UBadge>
                  <span v-if="citation.article" class="text-xs text-muted">
                    {{ citation.article }}
                  </span>
                </div>
                <div class="mt-1 text-sm font-medium text-highlighted">
                  {{ citationTitle(citation) }}
                </div>
                <p v-if="citationText(citation)" class="mt-1 text-xs leading-5 text-muted">
                  {{ citationText(citation) }}
                </p>
                <UButton
                  v-if="citation.url"
                  :to="citation.url"
                  target="_blank"
                  external
                  size="xs"
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
            <h4 class="text-xs font-medium uppercase tracking-wide text-muted">
              {{ t("actions.tracker.findings") }}
            </h4>
            <ul class="grid gap-2">
              <li
                v-for="finding in props.step.findings"
                :key="finding.id"
                class="rounded-md border border-default px-3 py-2"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge :color="severityColor(finding)" variant="subtle" size="xs">
                    {{ t(`actions.severity.${finding.severity}`, finding.severity) }}
                  </UBadge>
                  <span class="text-sm font-medium text-highlighted">{{ finding.title }}</span>
                </div>
                <p class="mt-1 text-xs leading-5 text-muted">{{ finding.messagePlain }}</p>
                <p v-if="finding.suggestedFix" class="mt-1 text-xs text-primary">
                  {{ finding.suggestedFix }}
                </p>
              </li>
            </ul>
          </div>

          <div v-if="props.step.fields.length" class="space-y-2">
            <h4 class="text-xs font-medium uppercase tracking-wide text-muted">
              {{ t("actions.tracker.fields") }}
            </h4>
            <dl class="grid gap-1.5 sm:grid-cols-2">
              <div
                v-for="field in props.step.fields"
                :key="field.id"
                class="min-w-0 rounded-md border border-muted px-3 py-2"
              >
                <dt class="truncate text-xs text-muted">{{ field.fieldKey }}</dt>
                <dd class="truncate text-sm text-toned" :title="fieldValue(field)">
                  {{ fieldValue(field) }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>
