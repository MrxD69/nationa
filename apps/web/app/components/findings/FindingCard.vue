<script setup lang="ts">
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

const props = defineProps<{
  finding: Finding;
  companyId: string;
}>();

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
  query: { companyId: props.companyId },
}));
</script>

<template>
  <NuxtLink
    :to="detailLink"
    class="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-elevated focus:outline-none focus-visible:bg-elevated"
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

    <UIcon name="i-tabler-chevron-right" class="size-6 shrink-0 text-muted rtl:rotate-180" />
  </NuxtLink>
</template>
