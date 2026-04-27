import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Cookie names — must stay in sync with verify/route.ts and middleware.ts
const PENDING_COOKIE  = 'vx_2fa_pending';
const TRUSTED_PREFIX  = 'vx_2fa_t_';           // full cookie: vx_2fa_t_{userId}
const PENDING_MAX_AGE = 10 * 60;               // 10 minutes to complete 2FA

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch 2FA status
    const { data: twofa } = await supabase
      .from('user_2fa')
      .select('totp_enabled')
      .eq('user_id', user.id)
      .single();

    // 2FA not enabled → no action needed
    if (!twofa?.totp_enabled) {
      return NextResponse.json({ requires2fa: false });
    }

    // Check if this device is already trusted
    const trustedCookie = req.cookies.get(`${TRUSTED_PREFIX}${user.id}`);
    if (trustedCookie?.value === 'true') {
      return NextResponse.json({ requires2fa: false, trustedDevice: true });
    }

    // Set the pending cookie — middleware will enforce /auth/2fa redirect
    const res = NextResponse.json({ requires2fa: true });
    res.cookies.set(PENDING_COOKIE, '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PENDING_MAX_AGE,
    });

    return res;
  } catch (err: any) {
    console.error('2FA check error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error.' },
      { status: 500 }
    );
  }
}