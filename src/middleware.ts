import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Maintenance mode check
  const { data: settings } = await supabase
    .from('settings')
    .select('maintenance_mode, maintenance_ends_at')
    .eq('id', 1)
    .maybeSingle()

  const isMaintenance = settings?.maintenance_mode || false
  const maintenanceEndsAt = settings?.maintenance_ends_at ? new Date(settings.maintenance_ends_at) : null
  const now = new Date()

  let effectiveMaintenance = isMaintenance
  if (isMaintenance && maintenanceEndsAt && maintenanceEndsAt < now) {
    effectiveMaintenance = false
  }

  const isMaintenancePage = request.nextUrl.pathname.startsWith('/maintenance')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isApiPage = request.nextUrl.pathname.startsWith('/api/')  // Allow all API routes without auth
  const isHomePage = request.nextUrl.pathname === '/'

  let userRole = 'user'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    userRole = profile?.role || 'user'
  }

  // Maintenance mode logic
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

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/maintenance') &&
    !request.nextUrl.pathname.startsWith('/api/') &&  // ✅ Allow API routes without auth
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    return NextResponse.redirect(url)
  }

  // Admin route protection
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
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}