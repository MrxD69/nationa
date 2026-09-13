<script setup lang="ts">
const props = defineProps<{
  name: string;
  state?: string | null;
  input?: unknown;
  output?: unknown;
  errorText?: string | null;
}>();

const { t } = useI18n();

const open = ref(false);
const detailsOpen = ref(false);

const label = computed(() => {
  const key = `assistant.tools.${props.name}`;
  const translated = t(key);
  return translated === key ? props.name : translated;
});

const status = computed(() => {
  if (props.state === "output-error") {
    return { label: t("assistant.tools.error"), color: "error" as const };
  }
  if (props.state === "output-available") {
    return { label: t("assistant.tools.done"), color: "success" as const };
  }
  return { label: t("assistant.tools.running"), color: "neutral" as const };
});

function pretty(value: unknown): string {
  if (value === undefined || value === null) {
    return "—";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function onDetailsToggle(event: Event) {
  if (event.target instanceof HTMLDetailsElement) {
    detailsOpen.value = event.target.open;
  }
}
</script>

<template>
  <div class="rounded-lg border border-default">
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2 text-start"
      @click="open = !open"
    >
      <UIcon name="i-tabler-tool" class="size-4 shrink-0 text-muted" />
      <span class="flex-1 truncate text-sm font-medium text-toned">{{ label }}</span>
      <UBadge :color="status.color" variant="subtle" size="lg" :label="status.label" />
      <UIcon
        name="i-tabler-chevron-down"
        class="size-4 text-muted transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <div v-if="open" class="space-y-2 border-t border-default p-3">
      <p v-if="input" class="text-sm font-medium text-muted">{{ t("assistant.tools.title") }}</p>

      <details class="rounded-md" :open="detailsOpen" @toggle="onDetailsToggle">
        <summary
          class="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted"
        >
          <UIcon
            name="i-tabler-chevron-right"
            class="size-4 shrink-0 transition-transform"
            :class="detailsOpen ? 'rotate-90' : ''"
          />
          {{ detailsOpen ? t("assistant.tools.hideDetails") : t("assistant.tools.showDetails") }}
        </summary>

        <div class="mt-2 space-y-2">
          <pre
            v-if="input"
            class="max-h-48 overflow-auto rounded-md bg-elevated p-2 text-sm leading-5 text-muted"
            dir="ltr"
            >{{ pretty(input) }}</pre>
          <pre
            v-if="output !== undefined"
            class="max-h-64 overflow-auto rounded-md bg-elevated p-2 text-sm leading-5 text-muted"
            dir="ltr"
            >{{ pretty(output) }}</pre>
        </div>
      </details>

      <p v-if="errorText" class="text-sm text-error">{{ errorText }}</p>
    </div>
  </div>
</template>
