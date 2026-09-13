<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";

const open = defineModel<boolean>("open", { default: false });
const props = defineProps<{ companyId: string }>();
const emit = defineEmits<{ invited: [] }>();

const { $orpc } = useNuxtApp();
const { t } = useI18n();

const invite = useMutation($orpc.companies.invite.mutationOptions());

type AccessRole = "owner" | "employee" | "accountant" | "accountant_assistant" | "admin";

const email = ref("");
const role = ref<AccessRole>("accountant");
const expiresInDays = ref(7);
const result = ref<{ token: string; invitationId: string; expiresAt: string | Date } | null>(null);
const error = ref<string | null>(null);
const copied = ref(false);

const roleItems = computed<{ label: string; value: AccessRole }[]>(() => [
  { label: t("companies.roles.accountant"), value: "accountant" },
  { label: t("companies.roles.accountant_assistant"), value: "accountant_assistant" },
  { label: t("companies.roles.employee"), value: "employee" },
  { label: t("companies.roles.owner"), value: "owner" },
  { label: t("companies.roles.admin"), value: "admin" },
]);

const invitationLink = computed(() => {
  if (!result.value) {
    return "";
  }
  const origin = import.meta.client ? window.location.origin : "";
  return `${origin}/accept-invite?token=${result.value.token}`;
});

function resetForm() {
  email.value = "";
  role.value = "accountant";
  expiresInDays.value = 7;
  result.value = null;
  error.value = null;
  copied.value = false;
}

watch(open, (value) => {
  if (!value) {
    resetForm();
  }
});

async function copyLink() {
  try {
    await navigator.clipboard.writeText(invitationLink.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    copied.value = false;
  }
}

async function submit() {
  error.value = null;
  try {
    result.value = await invite.mutateAsync({
      companyId: props.companyId,
      email: email.value,
      role: role.value,
      expiresInDays: expiresInDays.value,
    });
    emit("invited");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-medium text-highlighted">{{ t("companies.access.inviteTitle") }}</h2>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-tabler-x"
              square
              @click="open = false"
            />
          </div>
        </template>

        <div v-if="result" class="grid gap-4">
          <UAlert
            color="success"
            variant="subtle"
            :title="t('companies.access.tokenTitle')"
            :description="t('companies.access.tokenHelp')"
          />
          <div class="flex items-center gap-2 rounded-md border border-default p-3">
            <code class="min-w-0 flex-1 truncate text-sm">{{ invitationLink }}</code>
            <UButton
              color="neutral"
              variant="soft"
              :icon="copied ? 'i-tabler-check' : 'i-tabler-copy'"
              @click="copyLink"
            >
              {{ copied ? t("companies.access.copied") : t("companies.access.copy") }}
            </UButton>
          </div>
          <div class="flex justify-end">
            <UButton
              color="neutral"
              variant="soft"
              :label="t('companies.access.close')"
              @click="open = false"
            />
          </div>
        </div>

        <form v-else class="grid gap-4" @submit.prevent="submit">
          <UAlert v-if="error" color="error" variant="subtle" :title="error" />

          <UFormField :label="t('companies.access.email')">
            <UInput
              v-model="email"
              type="email"
              required
              class="w-full"
              :placeholder="t('companies.access.emailPlaceholder')"
            />
          </UFormField>

          <UFormField :label="t('companies.access.role')">
            <USelect v-model="role" :items="roleItems" class="w-full" />
          </UFormField>

          <UFormField :label="t('companies.access.expiresIn')">
            <UInput v-model.number="expiresInDays" type="number" min="1" max="365" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              :label="t('companies.access.cancel')"
              @click="open = false"
            />
            <UButton
              type="submit"
              :loading="invite.isPending.value"
              :label="t('companies.access.send')"
            />
          </div>
        </form>
      </UCard>
    </template>
  </UModal>
</template>
