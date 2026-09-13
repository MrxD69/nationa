<script setup lang="ts">
import AssignmentChip from "~/components/officer/ui/AssignmentChip.vue";

const props = withDefaults(
  defineProps<{
    agencyId: string;
    submissionId: string;
    assigneeUserId?: string | null;
    assigneeName?: string | null;
    isMine?: boolean;
  }>(),
  { assigneeUserId: null, assigneeName: null, isMine: false },
);

const emit = defineEmits<{ changed: [] }>();

const { t } = useI18n();
const api = useApi();
const toast = useToast();

type Member = { userId: string; displayName?: string | null; email?: string | null };

const members = ref<Member[]>([]);
const pending = ref<"claim" | "release" | "assign" | null>(null);
const assigningId = ref<string | undefined>(undefined);

const memberItems = computed(() =>
  members.value.map((member) => ({
    value: member.userId,
    label: member.displayName || member.email || t("officerTrust.common.unknown"),
  })),
);

async function loadMembers() {
  try {
    const result = await api.officer.team({ agencyId: props.agencyId });
    members.value = result.members ?? [];
  } catch {
    // The assign picker is a bonus; a failure must not break claiming/releasing.
    members.value = [];
  }
}

async function run(action: "claim" | "release" | "assign") {
  if (pending.value) {
    return;
  }
  pending.value = action;
  try {
    if (action === "claim") {
      await api.officer.claim({ agencyId: props.agencyId, submissionId: props.submissionId });
      toast.add({ title: t("officerOps.assignment.claimed"), color: "success" });
    } else if (action === "release") {
      await api.officer.release({ agencyId: props.agencyId, submissionId: props.submissionId });
      toast.add({ title: t("officerOps.assignment.released"), color: "success" });
    } else {
      if (!assigningId.value) {
        return;
      }
      await api.officer.assign({
        agencyId: props.agencyId,
        submissionId: props.submissionId,
        assigneeUserId: assigningId.value,
      });
      toast.add({ title: t("officerOps.assignment.assigned"), color: "success" });
    }
    await loadMembers();
    emit("changed");
  } catch {
    toast.add({ title: t("officerOps.assignment.error"), color: "error" });
  } finally {
    pending.value = null;
  }
}

onMounted(loadMembers);

watch(assigningId, (value) => {
  if (value) {
    void run("assign");
  }
});

defineExpose({ reload: loadMembers });
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-default pt-3">
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted">{{ t("officerOps.assignment.current") }} :</span>
      <AssignmentChip :name="assigneeName" :is-mine="isMine" />
    </div>

    <div class="ms-auto flex flex-wrap items-center gap-2">
      <UButton
        v-if="isMine"
        size="md"
        color="neutral"
        variant="soft"
        icon="i-tabler-user-minus"
        :loading="pending === 'release'"
        :label="t('officerOps.assignment.release')"
        @click="run('release')"
      />
      <UButton
        v-else
        size="md"
        color="primary"
        icon="i-tabler-hand-grab"
        :loading="pending === 'claim'"
        :label="t('officerOps.assignment.take')"
        @click="run('claim')"
      />

      <USelectMenu
        v-model="assigningId"
        :items="memberItems"
        value-key="value"
        search-input
        size="md"
        leading-icon="i-tabler-user-plus"
        :placeholder="t('officerOps.assignment.assignTo')"
        :search-input="{ placeholder: t('officerOps.assignment.searchPlaceholder') }"
        :ui="{ base: 'w-full sm:w-64' }"
        class="w-full sm:w-64"
      >
        <template #default>
          <span class="truncate">
            {{
              assigningId
                ? (memberItems.find((m) => m.value === assigningId)?.label ??
                  t("officerOps.assignment.chooseAgent"))
                : t("officerOps.assignment.chooseAgent")
            }}
          </span>
        </template>
      </USelectMenu>
    </div>
  </div>
</template>
