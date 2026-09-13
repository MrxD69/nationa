<script setup lang="ts">
const props = defineProps<{
  name: string;
  state?: string | null;
  input?: unknown;
  output?: unknown;
  errorText?: string | null;
}>();

const { t } = useI18n();

const detailsOpen = ref(false);

const label = computed(() => {
  const key = `assistant.tools.${props.name}`;
  const translated = t(key);
  return translated === key ? props.name : translated;
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
  <div v-if="props.state === 'output-error'" class="space-y-1">
    <div class="flex items-center gap-2 text-sm text-error">
      <UIcon name="i-tabler-alert-triangle" class="size-4 shrink-0" />
      <span class="min-w-0 truncate">{{ label }}</span>
    </div>
    <details @toggle="onDetailsToggle">
      <summary class="flex cursor-pointer list-none items-center gap-1.5 text-sm text-muted">
        <UIcon
          name="i-tabler-chevron-right"
          class="size-4 shrink-0 transition-[transform]"
          :class="detailsOpen ? 'rotate-90' : ''"
        />
        {{ t("assistant.tools.errorDetails") }}
      </summary>
      <div class="mt-2 space-y-2">
        <p v-if="props.errorText" class="text-sm text-error">{{ props.errorText }}</p>
        <pre
          class="max-h-48 overflow-auto rounded-md bg-elevated p-2 text-sm leading-5 text-muted"
          dir="ltr"
          >{{ pretty(props.output ?? props.input) }}</pre>
      </div>
    </details>
  </div>
</template>
