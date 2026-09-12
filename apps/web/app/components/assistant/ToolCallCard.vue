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
</script>

<template>
  <div class="rounded-xl border border-default">
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2 text-start"
      @click="open = !open"
    >
      <UIcon name="i-tabler-tool" class="size-4 shrink-0 text-muted" />
      <span class="flex-1 truncate text-xs font-medium text-toned">{{ label }}</span>
      <UBadge :color="status.color" variant="subtle" size="sm" :label="status.label" />
      <UIcon
        name="i-tabler-chevron-down"
        class="size-4 text-muted transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <div v-if="open" class="space-y-2 border-t border-default p-3">
      <div v-if="input">
        <p class="text-[11px] font-medium text-muted">{{ t("assistant.tools.title") }}</p>
        <pre
          class="mt-1 max-h-48 overflow-auto rounded-lg bg-elevated p-2 text-[11px] leading-4 text-muted"
          >{{ pretty(input) }}</pre>
      </div>
      <div v-if="output !== undefined">
        <pre
          class="max-h-64 overflow-auto rounded-lg bg-elevated p-2 text-[11px] leading-4 text-muted"
          >{{ pretty(output) }}</pre>
      </div>
      <p v-if="errorText" class="text-xs text-error">{{ errorText }}</p>
    </div>
  </div>
</template>
