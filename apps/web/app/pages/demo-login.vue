<script setup lang="ts">
import LoadingState from "~/components/ui/LoadingState.vue";

definePageMeta({ layout: false });

const client = useSupabaseClient();
const route = useRoute();

// Demo-only auto sign-in. Each seeded account maps to a role so a scanned QR
// can drop the user straight into the right space. Passwords here match the
// seeded Supabase users and are intentionally public for the pitch demo.
const ACCOUNTS = {
  pme: {
    email: "khalilselmi2022@gmail.com",
    password: "Nationa2026!",
    landing: "/companies",
  },
  accountant: {
    email: "akaidi007@gmail.com",
    password: "Nationa2026!",
    landing: "/companies?view=accounting",
  },
  officer: {
    email: "khalilselmi2003@gmail.com",
    password: "Nationa2026!",
    landing: "/officer",
  },
} as const;

type DemoRole = keyof typeof ACCOUNTS;

const status = ref<"working" | "error">("working");

onMounted(async () => {
  const raw = Array.isArray(route.query.role) ? route.query.role[0] : route.query.role;
  const account = raw && raw in ACCOUNTS ? ACCOUNTS[raw as DemoRole] : null;

  if (!account) {
    status.value = "error";
    return;
  }

  try {
    const { error } = await client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (error) {
      throw error;
    }
    await navigateTo(account.landing);
  } catch {
    status.value = "error";
  }
});
</script>

<template>
  <div class="flex min-h-svh items-center justify-center p-6">
    <div class="w-full max-w-sm text-center">
      <LoadingState v-if="status === 'working'" label="Connexion au compte démo…" />
      <template v-else>
        <UAlert color="error" variant="subtle" title="Échec de la connexion démo" />
        <UButton to="/demo" class="mt-4" label="Retour aux QR codes" />
      </template>
    </div>
  </div>
</template>
