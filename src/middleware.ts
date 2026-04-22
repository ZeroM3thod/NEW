import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Static assets — skip all DB work
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Maintenance mode check ──────────────────────────────────
  const { data: settings } = await supabase
    .from('settings')
    .select('maintenance_mode, maintenance_ends_at')
    .eq('id', 1)
    .maybeSingle()

  const isMaintenance = settings?.maintenance_mode || false
  const maintenanceEndsAt = settings?.maintenance_ends_at
    ? new Date(settings.maintenance_ends_at)
    : null
  const now = new Date()
  let effectiveMaintenance = isMaintenance && !(maintenanceEndsAt && maintenanceEndsAt < now)

  const isMaintenancePage = pathname.startsWith('/maintenance')
  const isSuspendedPage   = pathname.startsWith('/suspended')
  const isAdminPage       = pathname.startsWith('/admin')
  const isAuthPage        = pathname.startsWith('/auth')
  const isApiPage         = pathname.startsWith('/api/')
  const isHomePage        = pathname === '/'

  // ── Fetch user profile (role + status) ─────────────────────
  let userRole   = 'user'
  let userStatus = 'active'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle()
    userRole   = profile?.role   || 'user'
    userStatus = (profile?.status || 'active').toLowerCase()
  }

  // ── SUSPENSION CHECK ────────────────────────────────────────
  // If a logged-in user is suspended they may ONLY visit:
  //   /            (home)
  //   /auth/*      (so they can sign out via the sign-in page)
  //   /suspended   (the suspension page itself)
  //   /api/*       (API routes are always allowed)
  if (user && userStatus === 'suspended') {
    if (!isSuspendedPage && !isHomePage && !isAuthPage && !isApiPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/suspended'
      return NextResponse.redirect(url)
    }
    // Allow the suspended page, home, auth, and api — fall through
    return supabaseResponse
  }

  // ── MAINTENANCE MODE ────────────────────────────────────────
  if (effectiveMaintenance && userRole !== 'admin' && !isAdminPage && !isMaintenancePage) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/maintenance'
      return NextResponse.redirect(url)
    }
    if (!isHomePage && !isAuthPage && !isApiPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/maintenance'
      return NextResponse.redirect(url)
    }
  }

  // ── UNAUTHENTICATED REDIRECT ────────────────────────────────
  if (
    !user &&
    !isAuthPage &&
    !isMaintenancePage &&
    !isSuspendedPage &&
    !isApiPage &&
    !isHomePage
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    return NextResponse.redirect(url)
  }

  // ── ADMIN ROUTE PROTECTION ──────────────────────────────────
  if (isAdminPage) {
    if (!user || userRole !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/404'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}