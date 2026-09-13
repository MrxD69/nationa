<script setup lang="ts">
type ActivityEntry = {
  id?: string;
  action?: string | null;
  summary?: string | null;
  actorType?: string | null;
  createdAt?: string | Date | null;
};

const props = defineProps<{ events: ActivityEntry[] }>();

const { t, locale } = useI18n();

function formatDate(value?: string | Date | null): string {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function iconFor(action?: string | null): string {
  if (!action) {
    return "i-tabler-point";
  }
  if (action.includes("review") || action.includes("decided")) {
    return "i-tabler-gavel";
  }
  if (action.includes("resubmit")) {
    return "i-tabler-arrow-back-up";
  }
  if (action.includes("submit") || action.includes("created")) {
    return "i-tabler-send";
  }
  return "i-tabler-point";
}
</script>

<template>
  <div v-if="props.events.length === 0" class="text-base text-muted">
    {{ t("submissions.timeline.empty") }}
  </div>

  <ol v-else class="relative space-y-4 border-s border-default ps-4">
    <li v-for="(event, index) in props.events" :key="event.id ?? index" class="relative">
      <span
        class="absolute -start-[1.4rem] flex size-6 items-center justify-center rounded-full bg-elevated text-muted"
      >
        <UIcon :name="iconFor(event.action)" class="size-3.5" />
      </span>
      <p class="text-base text-highlighted" dir="auto">{{ event.summary || event.action }}</p>
      <p class="text-sm text-muted">{{ formatDate(event.createdAt) }}</p>
    </li>
  </ol>
</template>
