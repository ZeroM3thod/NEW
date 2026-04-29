Change 1 — src/utils/supabase/client.ts
tsimport { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',       // ← tokens arrive as #hash fragments, no verifier needed
        detectSessionInUrl: true,   // ← client auto-processes the hash on load
      },
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

Change 2 — src/app/auth/signin/page.tsx
Change the redirectTo in handleForgot to point directly to the password page:
tsconst { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/forget/password`,
})

Change 3 — src/app/auth/forget/password/page.tsx
Replace the session-checking useEffect with this cleaner version (no ?code= needed with implicit flow — onAuthStateChange handles the hash automatically):
tsuseEffect(() => {
  let settled = false;

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
      settled = true;
      setSessionReady(true);
      setCheckingSession(false);
    }
  });

  // Also catch an already-active session (e.g. desktop where cookie was set)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      settled = true;
      setSessionReady(true);
      setCheckingSession(false);
    } else {
      setTimeout(() => {
        if (!settled) setCheckingSession(false);
      }, 3000);
    }
  });

  return () => subscription.unsubscribe();
}, [supabase]);
