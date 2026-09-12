export function useAuth() {
  const client = useSupabaseClient();
  const user = useSupabaseUser();
  const session = useSupabaseSession();

  const isLoggedIn = computed(() => Boolean(user.value));

  function redirectToLogin(redirect?: string) {
    return navigateTo({
      path: "/login",
      query: redirect ? { redirect } : undefined,
    });
  }

  async function signOut() {
    await client.auth.signOut();
    return navigateTo("/login");
  }

  return {
    user,
    session,
    isLoggedIn,
    signOut,
    redirectToLogin,
  };
}
