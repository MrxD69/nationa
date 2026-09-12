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
  <NuxtLink :to="detailLink" class="block focus:outline-none">
    <UCard class="h-full transition hover:ring-2 hover:ring-primary/40">
      <div class="flex flex-wrap items-center gap-2">
        <SeverityBadge :severity="finding.severity" />
        <UBadge color="neutral" variant="outline" size="sm">
          {{ t(`checks.status.${finding.status}`) }}
        </UBadge>
      </div>

      <h3 class="mt-3 text-sm font-semibold text-highlighted">{{ translate("title") }}</h3>
      <p class="mt-1 line-clamp-2 text-sm text-muted">{{ translate("message") }}</p>
    </UCard>
  </NuxtLink>
</template>
