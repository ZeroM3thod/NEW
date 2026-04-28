import { createBrowserClient } from '@supabase/ssr'

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
            if (options?.path)    cookie += `; path=${options.path}`
            if (options?.maxAge)  cookie += `; max-age=${options.maxAge}`
            if (options?.domain)  cookie += `; domain=${options.domain}`
            if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
            if (options?.secure)  cookie += `; secure`
            document.cookie = cookie
          })
        },
      },
    }
  )
}