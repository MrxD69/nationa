<script setup lang="ts">
import ActionProgressRing from "~/components/action/ActionProgressRing.vue";
import { useOpenActions } from "~/composables/useOpenActions";
import type { PinnedAction } from "~/composables/useOpenActions";

const props = withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false });

const { locale, t } = useI18n();
const route = useRoute();
const { pinned, unpin } = useOpenActions();

function label(entry: PinnedAction): string {
  return locale.value.startsWith("ar") ? (entry.nameAr ?? entry.nameFr) : entry.nameFr;
}

function to(entry: PinnedAction): string {
  const query = new URLSearchParams();
  if (entry.caseId) {
    query.set("caseId", entry.caseId);
  }
  if (entry.companyId) {
    query.set("companyId", entry.companyId);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/actions/${entry.templateId}${suffix}`;
}

function isActive(entry: PinnedAction): boolean {
  return route.path === `/actions/${entry.templateId}`;
}
</script>

<template>
  <!--
    Started démarches stay under the Démarches rail item and survive collapsing,
    because a half-finished filing is the thing a user most needs to get back to.
    Collapsed, the ring alone carries the meaning; expanded, it gets its name.
  -->
  <div v-if="pinned.length > 0" class="flex w-full flex-col gap-1">
    <span
      v-if="!props.collapsed"
      class="px-2 pt-1 text-sm font-medium tracking-wide text-dimmed uppercase"
    >
      {{ t("shell.rail.openActions") }}
    </span>

    <div
      v-for="entry in pinned"
      :key="entry.templateId"
      class="group flex w-full items-center gap-1"
      :class="props.collapsed ? 'justify-center' : ''"
    >
      <NuxtLink
        :to="to(entry)"
        :title="`${label(entry)} — ${Math.round(entry.progress)}%`"
        :aria-label="`${label(entry)} — ${Math.round(entry.progress)}%`"
        :aria-current="isActive(entry) ? 'page' : undefined"
        class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
        :class="[
          props.collapsed ? 'justify-center' : 'justify-start',
          isActive(entry) ? 'bg-primary/10 text-primary' : 'text-toned hover:bg-elevated',
        ]"
      >
        <ActionProgressRing
          aria-hidden="true"
          :value="entry.progress"
          :size="props.collapsed ? 30 : 26"
          :show-value="false"
          :label="undefined"
        />
        <span v-if="!props.collapsed" class="min-w-0 flex-1 truncate text-base">
          {{ label(entry) }}
        </span>
        <span v-if="!props.collapsed" class="shrink-0 text-sm font-semibold text-muted">
          {{ Math.round(entry.progress) }}%
        </span>
      </NuxtLink>

      <UButton
        v-if="!props.collapsed"
        color="neutral"
        variant="ghost"
        size="sm"
        square
        icon="i-tabler-x"
        class="reveal-on-hover shrink-0"
        :aria-label="t('shell.rail.unpin')"
        :title="t('shell.rail.unpin')"
        @click="unpin(entry.templateId)"
      />
    </div>
  </div>
</template>
