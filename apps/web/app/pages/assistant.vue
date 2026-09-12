<script setup lang="ts">
import AssistantWorkspace from "~/components/assistant/AssistantWorkspace.vue";

definePageMeta({ middleware: "auth" });
</script>

<template>
  <AssistantWorkspace />
</template>
