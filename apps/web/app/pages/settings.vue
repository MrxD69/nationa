<script setup lang="ts">
import { parseAccountType } from "@nationa/api/domain/account";

import PreferencesForm from "~/components/settings/PreferencesForm.vue";
import PageHeader from "~/components/ui/PageHeader.vue";
import SectionHeader from "~/components/ui/SectionHeader.vue";
import LoadingState from "~/components/ui/LoadingState.vue";

definePageMeta({ layout: "app", middleware: "auth" });

const client = useApi();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { t } = useI18n();

const {
  data: preferences,
  pending: loading,
  error,
  refresh,
} = await useAsyncData("settings-preferences", () => client.preferences.get());

const { data: session } = useAsyncData("settings-session", () => client.session.get(), {
  lazy: true,
});

const accountType = computed(
  () =>
    parseAccountType(session.value?.accountType) ??
    parseAccountType(user.value?.user_metadata?.accountType) ??
    "unknown",
);

const userEmail = computed(() => user.value?.email ?? t("common.user.guest"));
const displayName = computed(() => {
  const value = user.value?.user_metadata?.displayName;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : userEmail.value;
});
const signingOut = ref(false);

async function signOut() {
  signingOut.value = true;
  try {
    await supabase.auth.signOut();
    await navigateTo("/login");
  } finally {
    signingOut.value = false;
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-8 py-8">
    <PageHeader
      :title="t('settings.title')"
      :subtitle="t('settings.subtitle')"
      icon="i-tabler-settings"
    />

    <section class="space-y-4">
      <SectionHeader :title="t('settings.sections.account')" icon="i-tabler-user-circle" />
      <div
        class="flex flex-col gap-3 rounded-lg border border-default p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0 space-y-3">
          <div class="space-y-0.5">
            <p class="text-sm text-dimmed">{{ t("settings.account.name") }}</p>
            <p class="truncate text-base font-medium text-highlighted">{{ displayName }}</p>
          </div>
          <div class="space-y-0.5">
            <p class="text-sm text-dimmed">{{ t("settings.account.email") }}</p>
            <p class="truncate text-base font-medium text-highlighted" dir="ltr">
              {{ userEmail }}
            </p>
          </div>
          <div class="space-y-0.5">
            <p class="text-sm text-dimmed">{{ t("settings.account.type") }}</p>
            <UBadge
              color="neutral"
              variant="subtle"
              icon="i-tabler-user-circle"
              :label="t(`settings.account.types.${accountType}`)"
            />
          </div>
        </div>
        <UButton
          color="error"
          variant="soft"
          icon="i-tabler-logout"
          :loading="signingOut"
          :disabled="signingOut"
          :label="t('settings.signOut')"
          @click="signOut"
        />
      </div>
    </section>

    <LoadingState v-if="loading" variant="skeleton-list" :count="2" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      :title="t('settings.error')"
      :description="error?.message"
    >
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          icon="i-tabler-refresh"
          :label="t('common.error.retry')"
          @click="refresh()"
        />
      </template>
    </UAlert>

    <PreferencesForm v-else-if="preferences" :preferences="preferences" />
  </div>
</template>
