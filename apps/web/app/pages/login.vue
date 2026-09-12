<script setup lang="ts">
const client = useSupabaseClient();
const user = useSupabaseUser();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

watch(user, (current) => {
  if (current) {
    navigateTo("/");
  }
});

async function submit(action: "signIn" | "signUp") {
  loading.value = true;
  error.value = null;

  try {
    const { error: authError } =
      action === "signIn"
        ? await client.auth.signInWithPassword({ email: email.value, password: password.value })
        : await client.auth.signUp({ email: email.value, password: password.value });

    if (authError) {
      throw authError;
    }

    await navigateTo("/");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Authentication failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UContainer class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-medium">Sign in</h1>
      </template>

      <form class="grid gap-4" @submit.prevent="submit('signIn')">
        <UFormField label="Email">
          <UInput
            v-model="email"
            type="email"
            autocomplete="email"
            class="w-full"
            required
            :disabled="loading"
          />
        </UFormField>

        <UFormField label="Password">
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full"
            required
            :disabled="loading"
          />
        </UFormField>

        <UAlert v-if="error" color="error" variant="subtle" :title="error" />

        <div class="flex gap-2">
          <UButton type="submit" class="flex-1" :loading="loading" :disabled="loading">
            Sign in
          </UButton>
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            class="flex-1"
            :loading="loading"
            :disabled="loading"
            @click="submit('signUp')"
          >
            Sign up
          </UButton>
        </div>
      </form>
    </UCard>
  </UContainer>
</template>
