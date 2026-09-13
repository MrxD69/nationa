<script setup lang="ts">
defineProps<{
  name?: string | null;
  isMine?: boolean;
}>();

const { t, te } = useI18n();

function label(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}
</script>

<template>
  <UBadge
    v-if="isMine"
    color="primary"
    variant="soft"
    icon="i-tabler-user-check"
    :label="label('officerOps.assignment.mine', 'Moi')"
  />
  <UBadge v-else-if="name" color="neutral" variant="subtle" icon="i-tabler-user" :label="name" />
  <UBadge
    v-else
    color="warning"
    variant="subtle"
    icon="i-tabler-user-question"
    :label="label('officerOps.assignment.unassigned', 'Non affecté')"
  />
</template>
