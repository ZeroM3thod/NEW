import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'
  
  // Use headers to determine the correct origin
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '') || 'https'
  const origin = `${protocol}://${host}`

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // For password recovery, send to the set-password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/forget/password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If no code or exchange failed, redirect to sign in
  return NextResponse.redirect(`${origin}/auth/signin`)
}