<script setup lang="ts">
type BadgeColor = "primary" | "neutral" | "info" | "success" | "warning" | "error";

const props = defineProps<{ status?: string | null }>();

const { t } = useI18n();

const STATUS_META: Record<string, { key: string; color: BadgeColor; icon: string }> = {
  uploaded: { key: "uploaded", color: "neutral", icon: "i-tabler-cloud-upload" },
  queued: { key: "pending", color: "neutral", icon: "i-tabler-clock" },
  processing: { key: "processing", color: "info", icon: "i-tabler-loader-2" },
  running: { key: "processing", color: "info", icon: "i-tabler-loader-2" },
  extracted: { key: "extracted", color: "success", icon: "i-tabler-circle-check" },
  succeeded: { key: "extracted", color: "success", icon: "i-tabler-circle-check" },
  needs_review: { key: "needs_review", color: "warning", icon: "i-tabler-alert-triangle" },
  verified: { key: "verified", color: "primary", icon: "i-tabler-rosette-discount-check" },
  failed: { key: "failed", color: "error", icon: "i-tabler-square-rounded-x" },
};

const FALLBACK = { key: "uploaded", color: "neutral" as BadgeColor, icon: "i-tabler-file" };

const meta = computed(() => STATUS_META[props.status ?? ""] ?? FALLBACK);
</script>

<template>
  <UBadge
    :color="meta.color"
    variant="subtle"
    :icon="meta.icon"
    :label="t(`documents.status.${meta.key}`)"
  />
</template>
