Change 1 — src/app/auth/signin/page.tsx
Add this import at the top:
tsimport { createClient as createDirectClient } from '@supabase/supabase-js'
Then replace handleForgot's resetPasswordForEmail call:
tsconst handleForgot = async (e: React.FormEvent) => {
  e.preventDefault()
  setFEmailCls(''); setFEmailMsg('')
  const email = fEmail.trim()
  if (!email) { setFEmailMsg('⚠ Email is required.'); setFEmailCls('fi-err'); return }
  if (!EMAIL_RX.test(email)) { setFEmailMsg('⚠ Enter a valid email address.'); setFEmailCls('fi-err'); return }
  setFEmailCls('fi-good')
  setFLoading(true)

  // Use vanilla client with explicit implicit flow — bypasses @supabase/ssr's forced PKCE
  const supabaseImplicit = createDirectClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit' } }
  )

  const { error } = await supabaseImplicit.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/forget/password`,
  })

  setFLoading(false)
  if (error) {
    showToast('✕ ' + error.message, 'err')
    setFEmailCls('fi-err')
  } else {
    setFSentTo(email)
    setFSuccess(true)
    showToast('✓ Reset link sent to ' + email, 'ok')
    startCountdown(15 * 60)
  }
}

Change 2 — src/app/auth/forget/password/page.tsx
Replace the session-checking useEffect entirely:
tsuseEffect(() => {
  let settled = false;
  let unsubscribe: (() => void) | null = null;

  const init = async () => {
    // ── Priority 1: Hash fragment (implicit flow) ──────────────────
    // Supabase puts #access_token=...&type=recovery in the URL.
    // This works in any WebView — no PKCE verifier needed.
    if (typeof window !== 'undefined' && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken  = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type         = params.get('type');

      if (accessToken && type === 'recovery') {
        const { error } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken ?? '',
        });
        if (!error) {
          settled = true;
          setSessionReady(true);
          setCheckingSession(false);
          // Clean up the tokens from the URL
          window.history.replaceState({}, '', '/auth/forget/password');
          return;
        }
      }
    }

    // ── Priority 2: onAuthStateChange ─────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        settled = true;
        setSessionReady(true);
        setCheckingSession(false);
      }
    });
    unsubscribe = () => subscription.unsubscribe();

    // ── Priority 3: Existing session (desktop — callback already ran) ──
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      settled = true;
      setSessionReady(true);
      setCheckingSession(false);
      return;
    }

    // ── Fallback: give up after 4s ─────────────────────────────────
    setTimeout(() => {
      if (!settled) setCheckingSession(false);
    }, 4000);
  };

  init();
  return () => { unsubscribe?.(); };
}, [supabase]);

Also revert src/utils/supabase/client.ts
Remove the auth options you added earlier — they had no effect and aren't needed now:
tsimport { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          return document.cookie.split(';').flatMap(c => {
            const [name, ...rest] = c.trim().split('=')
            if (!name) return []
            return [{ name: name.trim(), value: rest.join('=') }]
          })
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookie = `${name}=${value}`
            if (options?.path)     cookie += `; path=${options.path}`
            if (options?.maxAge)   cookie += `; max-age=${options.maxAge}`
            if (options?.domain)   cookie += `; domain=${options.domain}`
            if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
            if (options?.secure)   cookie += `; secure`
            document.cookie = cookie
          })
        },
      },
    }
  )
}

Why this finally works: The vanilla @supabase/supabase-js client respects flowType: 'implicit' and tells Supabase to put the tokens directly in the URL hash (#access_token=...). No PKCE verifier is generated or needed. When the email link opens in any mobile WebView, the hash is right there in the URL — the password page reads it directly and calls setSession(). No storage lookup, no verifier, no failure.