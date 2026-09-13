<script setup lang="ts">
import { NuxtLink } from "#components";
import SeverityBadge from "./SeverityBadge.vue";

type Finding = {
  id: string;
  severity: "info" | "warning" | "error" | "blocker";
  code: string;
  title: string;
  messagePlain: string;
  comparedRefs: unknown;
  status: "open" | "resolved" | "waived" | "acknowledged";
};

type ComparedRefsPayload = {
  params?: Record<string, string>;
};

const props = withDefaults(
  defineProps<{
    finding: Finding;
    companyId?: string;
    linkable?: boolean;
  }>(),
  { companyId: undefined, linkable: true },
);

const { t, te } = useI18n();

const params = computed<Record<string, string>>(
  () => (props.finding.comparedRefs as ComparedRefsPayload | null)?.params ?? {},
);

function translate(field: "title" | "message"): string {
  const key = `checks.findings.${props.finding.code}.${field}`;
  if (te(key)) {
    return t(key, params.value);
  }
  return field === "title" ? props.finding.title : props.finding.messagePlain;
}

const detailLink = computed(() => ({
  path: `/findings/${props.finding.id}`,
  query: props.companyId ? { companyId: props.companyId } : {},
}));
</script>

<template>
  <component
    :is="linkable ? NuxtLink : 'div'"
    v-bind="linkable ? { to: detailLink } : {}"
    class="group flex items-center gap-4 px-5 py-4 transition-control hover-surface focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
  >
    <div class="min-w-0 flex-1 space-y-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <SeverityBadge :severity="finding.severity" />
        <UBadge color="neutral" variant="outline" size="lg">
          {{ t(`checks.status.${finding.status}`) }}
        </UBadge>
      </div>

      <h3 class="text-lg font-semibold text-highlighted">{{ translate("title") }}</h3>
      <p class="line-clamp-2 text-base text-muted">{{ translate("message") }}</p>
    </div>

    <UIcon
      v-if="linkable"
      name="i-tabler-chevron-right"
      class="size-6 shrink-0 text-muted transition-control group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
    />
  </component>
</template>
