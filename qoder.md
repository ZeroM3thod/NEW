File 1 — src/app/auth/signin/page.tsx
Change the redirectTo in handleForgot so it points directly to the password page instead of /auth/callback:
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.25s;
    animation-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
  }
VvisualizeVvisualize show_widgetNow here are the exact code changes:

Change 1 — src/app/auth/signin/page.tsx
Find this in handleForgot:
ts// BEFORE
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
});
Change it to:
ts// AFTER
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/forget/password`,
});

Change 2 — src/app/auth/forget/password/page.tsx
Replace the entire session-checking useEffect (the first one) with this version that also handles the ?code= param client-side:
tsuseEffect(() => {
  let settled = false;
  let subscription: { unsubscribe: () => void } | null = null;

  const init = async () => {
    // ── 1. Handle PKCE code in URL (Supabase sends ?code= for password reset)
    //       This runs client-side so it works in any WebView on mobile too.
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          settled = true;
          setSessionReady(true);
          setCheckingSession(false);
          // Clean the URL so the code can't be reused if the page refreshes
          window.history.replaceState({}, '', '/auth/forget/password');
          return;
        }
      } catch {
        // fall through to other checks
      }
    }

    // ── 2. Listen for PASSWORD_RECOVERY (hash-based implicit flow fallback)
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        settled = true;
        setSessionReady(true);
        setCheckingSession(false);
      }
    });
    subscription = data.subscription;

    // ── 3. Check for an already-active session (e.g. desktop where callback
    //       route already exchanged the code and set the cookie)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      settled = true;
      setSessionReady(true);
      setCheckingSession(false);
      return;
    }

    // ── 4. Give auth-state events a moment to fire, then give up
    setTimeout(() => {
      if (!settled) setCheckingSession(false);
    }, 3000);
  };

  init();
  return () => { subscription?.unsubscribe(); };
}, [supabase]);
