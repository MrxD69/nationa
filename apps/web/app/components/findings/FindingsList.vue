<script setup lang="ts">
import FindingCard from "./FindingCard.vue";

type Severity = "info" | "warning" | "error" | "blocker";

type Finding = {
  id: string;
  severity: Severity;
  code: string;
  title: string;
  messagePlain: string;
  comparedRefs: unknown;
  status: "open" | "resolved" | "waived" | "acknowledged";
};

const props = defineProps<{
  findings: Finding[];
  companyId: string;
}>();

const { t } = useI18n();

const SEVERITY_ORDER: Severity[] = ["blocker", "error", "warning", "info"];

const groups = computed(() =>
  SEVERITY_ORDER.map((severity) => ({
    severity,
    items: props.findings.filter((finding) => finding.severity === severity),
  })).filter((group) => group.items.length > 0),
);
</script>

<template>
  <div class="space-y-8">
    <section v-for="group in groups" :key="group.severity" class="space-y-3">
      <header class="flex items-center gap-2">
        <h2 class="text-base font-semibold tracking-tight text-highlighted">
          {{ t(`checks.groups.${group.severity}`) }}
        </h2>
        <UBadge color="neutral" variant="soft" size="lg">{{ group.items.length }}</UBadge>
      </header>

      <div class="divide-y divide-default overflow-hidden rounded-lg border border-default">
        <FindingCard
          v-for="finding in group.items"
          :key="finding.id"
          :finding="finding"
          :company-id="companyId"
        />
      </div>
    </section>
  </div>
</template>
