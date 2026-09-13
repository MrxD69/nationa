<script setup lang="ts">
import LoadingState from "~/components/ui/LoadingState.vue";
import OfficerSection from "~/components/officer/ui/OfficerSection.vue";
import MemberAdminTable from "~/components/officer/trust/MemberAdminTable.vue";

definePageMeta({ layout: "officer", middleware: "auth" });

type Member = {
  userId: string;
  email: string;
  displayName?: string | null;
  role: string;
  status: string;
  addedAt?: string | null;
  isSelf?: boolean;
};

const { t, locale } = useI18n();
const api = useApi();
const toast = useToast();
const { user } = useAuth();
const { agencyId, current, ready, ensureLoaded } = useOfficerAgency();

const currentUserId = computed(() => user.value?.id ?? null);

const agencyLabel = computed(() => {
  const value = current.value;
  if (!value) {
    return t("officerTrust.agency.subtitle");
  }
  return locale.value === "ar" ? value.nameAr || value.nameFr : value.nameFr || value.nameAr;
});

const members = ref<Member[]>([]);
const canManage = ref(false);
const loading = ref(true);
const error = ref<string | null>(null);
const forbidden = ref(false);
const actionError = ref<string | null>(null);

const addOpen = ref(false);
const addEmail = ref("");
const addRole = ref("officer");
const adding = ref(false);
const addError = ref<string | null>(null);
const addNotFound = ref(false);
let initialised = false;

function errorText(cause: unknown): string {
  if (cause instanceof Error) {
    const code = (cause as Error & { code?: string }).code;
    return code || cause.message || String(cause);
  }
  if (cause && typeof cause === "object") {
    const record = cause as Record<string, unknown>;
    if (typeof record.code === "string") {
      return record.code;
    }
    if (typeof record.message === "string") {
      return record.message;
    }
  }
  return String(cause ?? "");
}

function friendlyActionError(cause: unknown): string {
  const message = errorText(cause);
  if (/admin/i.test(message)) {
    return t("officerTrust.agency.lastAdminError");
  }
  // Only show a message that reads like a sentence; otherwise stay generic.
  return /[a-zà-ÿ]\s+[a-zà-ÿ]/i.test(message) ? message : t("officerTrust.agency.actionError");
}

const roleOptions = computed(() => [
  { label: t("officerTrust.agency.roleLabels.officer"), value: "officer" },
  { label: t("officerTrust.agency.roleLabels.supervisor"), value: "supervisor" },
  { label: t("officerTrust.agency.roleLabels.admin"), value: "admin" },
]);

async function loadMembers() {
  if (!agencyId.value) {
    return;
  }
  loading.value = true;
  error.value = null;
  forbidden.value = false;
  try {
    const response = await api.officer.agencyMembers({ agencyId: agencyId.value });
    members.value = Array.isArray(response?.members) ? (response.members as Member[]) : [];
    canManage.value = Boolean(response?.canManage);
  } catch (cause) {
    const message = errorText(cause);
    if (/forbidden|403/i.test(message)) {
      forbidden.value = true;
    } else {
      error.value = message;
    }
  } finally {
    loading.value = false;
  }
}

async function bootstrap() {
  await ensureLoaded();
  if (ready.value && agencyId.value) {
    await loadMembers();
  } else {
    loading.value = false;
  }
  initialised = true;
}

function openAdd() {
  addEmail.value = "";
  addRole.value = "officer";
  addError.value = null;
  addNotFound.value = false;
  addOpen.value = true;
}

async function addMember() {
  if (!agencyId.value || addEmail.value.trim().length === 0) {
    return;
  }
  adding.value = true;
  addError.value = null;
  addNotFound.value = false;
  try {
    await api.officer.agencyMemberAdd({
      agencyId: agencyId.value,
      email: addEmail.value.trim(),
      role: addRole.value,
    });
    addOpen.value = false;
    toast.add({ title: t("officerTrust.agency.addSuccess"), color: "success" });
    await loadMembers();
  } catch (cause) {
    const message = errorText(cause);
    if (/not_found|not found|404/i.test(message)) {
      addNotFound.value = true;
    } else {
      addError.value = t("officerTrust.agency.addError");
    }
  } finally {
    adding.value = false;
  }
}

async function onEdit(payload: { userId: string; role: string }) {
  if (!agencyId.value) {
    return;
  }
  actionError.value = null;
  try {
    await api.officer.agencyMemberUpdate({
      agencyId: agencyId.value,
      userId: payload.userId,
      role: payload.role,
    });
    toast.add({ title: t("officerTrust.agency.successRole"), color: "success" });
    await loadMembers();
  } catch (cause) {
    actionError.value = friendlyActionError(cause);
  }
}

async function onSetStatus(payload: { userId: string; status: string }) {
  if (!agencyId.value) {
    return;
  }
  actionError.value = null;
  try {
    await api.officer.agencyMemberUpdate({
      agencyId: agencyId.value,
      userId: payload.userId,
      status: payload.status,
    });
    toast.add({ title: t("officerTrust.agency.successStatus"), color: "success" });
    await loadMembers();
  } catch (cause) {
    actionError.value = friendlyActionError(cause);
  }
}

async function onRemove(payload: { userId: string }) {
  if (!agencyId.value) {
    return;
  }
  actionError.value = null;
  try {
    await api.officer.agencyMemberRemove({
      agencyId: agencyId.value,
      userId: payload.userId,
    });
    toast.add({ title: t("officerTrust.agency.successRemove"), color: "success" });
    await loadMembers();
  } catch (cause) {
    actionError.value = friendlyActionError(cause);
  }
}

onMounted(() => {
  void bootstrap();
});

watch(agencyId, (value) => {
  if (initialised && value && ready.value) {
    void loadMembers();
  }
});
</script>

<template>
  <div class="w-full space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="min-w-0 truncate text-lg font-semibold text-highlighted">{{ agencyLabel }}</h1>
      <UButton
        v-if="canManage && !forbidden"
        size="md"
        icon="i-tabler-user-plus"
        :label="t('officerTrust.agency.addAgent')"
        @click="openAdd"
      />
    </div>

    <LoadingState
      v-if="loading && members.length === 0 && !forbidden && !error"
      variant="skeleton-rows"
      :count="4"
      :label="t('officerTrust.agency.loading')"
    />

    <UAlert
      v-else-if="forbidden"
      color="warning"
      variant="subtle"
      icon="i-tabler-lock"
      :title="t('officerTrust.agency.forbiddenTitle')"
      :description="t('officerTrust.agency.forbiddenDescription')"
    >
      <template #actions>
        <UButton
          to="/officer"
          size="md"
          color="neutral"
          variant="soft"
          icon="i-tabler-arrow-left"
          :label="t('officerTrust.common.back')"
          :ui="{ leadingIcon: 'rtl:rotate-180' }"
        />
      </template>
    </UAlert>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-tabler-alert-triangle"
      :title="t('officerTrust.agency.error')"
      :description="error"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          size="md"
          icon="i-tabler-reload"
          :label="t('officerTrust.common.retry')"
          @click="loadMembers()"
        />
      </template>
    </UAlert>

    <template v-else>
      <UAlert
        v-if="actionError"
        color="error"
        variant="subtle"
        icon="i-tabler-alert-triangle"
        :title="actionError"
        close
        @update:open="actionError = null"
      />

      <OfficerSection
        :title="t('officerTrust.agency.columns.agent')"
        icon="i-tabler-users-group"
        :count="members.length"
      >
        <MemberAdminTable
          :members="members"
          :can-manage="canManage"
          :current-user-id="currentUserId"
          :loading="loading"
          @edit="onEdit"
          @set-status="onSetStatus"
          @remove="onRemove"
        />
      </OfficerSection>
    </template>

    <UModal
      v-model:open="addOpen"
      :title="t('officerTrust.agency.addTitle')"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="addMember">
          <UAlert
            v-if="addNotFound"
            color="warning"
            variant="subtle"
            icon="i-tabler-user-question"
            :title="t('officerTrust.agency.addNotFound')"
          />

          <UAlert
            v-else-if="addError"
            color="error"
            variant="subtle"
            icon="i-tabler-alert-triangle"
            :title="addError"
          />

          <UFormField :label="t('officerTrust.agency.emailLabel')" :required="true" class="w-full">
            <UInput
              v-model="addEmail"
              type="email"
              size="md"
              class="w-full"
              :placeholder="t('officerTrust.agency.emailPlaceholder')"
            />
          </UFormField>

          <UFormField :label="t('officerTrust.agency.roleLabel')" class="w-full">
            <USelect v-model="addRole" :items="roleOptions" size="md" class="w-full" />
          </UFormField>
        </form>
      </template>

      <template #footer>
        <div class="flex w-full items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            :label="t('officerTrust.common.cancel')"
            @click="addOpen = false"
          />
          <UButton
            icon="i-tabler-user-plus"
            size="md"
            :loading="adding"
            :disabled="addEmail.trim().length === 0"
            :label="t('officerTrust.agency.addSubmit')"
            @click="addMember"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
