<script setup lang="ts">
definePageMeta({ layout: false });

const origin = ref("");

onMounted(() => {
  origin.value = window.location.origin;
});

const accounts = [
  {
    role: "pme",
    label: "Entreprise (PME)",
    email: "khalilselmi2022@gmail.com",
    hint: "Propriétaire — société, documents, démarches",
  },
  {
    role: "accountant",
    label: "Comptable",
    email: "akaidi007@gmail.com",
    hint: "Portefeuille clients",
  },
  {
    role: "officer",
    label: "Agent RNE",
    email: "khalilselmi2003@gmail.com",
    hint: "Back-office RNE",
  },
] as const;

function loginUrl(role: string): string {
  return `${origin.value}/demo-login?role=${role}`;
}

function qrSrc(role: string): string {
  const data = encodeURIComponent(loginUrl(role));
  return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=${data}`;
}
</script>

<template>
  <div class="mx-auto flex min-h-svh max-w-5xl flex-col gap-8 px-6 py-12">
    <header class="space-y-2 text-center">
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
        Comptes démo — scannez un QR code
      </h1>
      <p class="text-base text-muted">
        Chaque code ouvre l'application et connecte automatiquement le compte correspondant.
      </p>
    </header>

    <div v-if="origin" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="account in accounts"
        :key="account.role"
        class="flex flex-col items-center gap-4 rounded-2xl border border-default bg-default p-6 text-center shadow-sm"
      >
        <h2 class="text-lg font-semibold text-highlighted">{{ account.label }}</h2>
        <img
          :src="qrSrc(account.role)"
          :alt="`QR code — ${account.label}`"
          class="size-56 rounded-lg bg-white p-2"
          width="420"
          height="420"
        />
        <div class="space-y-1">
          <p class="text-sm font-medium text-toned">{{ account.email }}</p>
          <p class="text-xs text-muted">{{ account.hint }}</p>
        </div>
        <a
          :href="qrSrc(account.role)"
          download
          target="_blank"
          rel="noopener"
          class="text-sm font-medium text-primary hover:underline"
        >
          Télécharger le PNG
        </a>
      </article>
    </div>
    <p v-else class="text-center text-sm text-muted">Génération des QR codes…</p>
  </div>
</template>
