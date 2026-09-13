export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();

  if (user.value) {
    return;
  }

  // The supabase plugin fills `useSupabaseUser` asynchronously
  // (onAuthStateChange -> getClaims), so right after sign-in the ref is still null
  // even though a valid session exists. Trusting it here bounced freshly logged-in
  // users back to /login, which is why the login button needed two clicks.
  const client = useSupabaseClient();

  try {
    const { data } = await client.auth.getSession();
    if (data.session) {
      return;
    }
  } catch {
    // fall through to the login redirect
  }

  return navigateTo({
    path: "/login",
    query: { redirect: to.fullPath },
  });
});
