<script setup lang="ts">
import FindingCard from "./FindingCard.vue";
import SectionHeader from "~/components/ui/SectionHeader.vue";

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

const props = withDefaults(
  defineProps<{
    findings: Finding[];
    companyId?: string;
    linkable?: boolean;
  }>(),
  { companyId: undefined, linkable: true },
);

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
      <SectionHeader :title="t(`checks.groups.${group.severity}`)" :count="group.items.length" />

      <div class="divide-y divide-default overflow-hidden rounded-lg border border-default">
        <FindingCard
          v-for="finding in group.items"
          :key="finding.id"
          :finding="finding"
          :company-id="companyId"
          :linkable="linkable"
        />
      </div>
    </section>
  </div>
</template>
