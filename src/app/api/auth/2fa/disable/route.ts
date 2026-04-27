import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createBrowserClient } from '@supabase/ssr';
import { authenticator } from 'otplib';

authenticator.options = { window: 1 };

// Cookie names — must stay in sync with verify/route.ts and check/route.ts
const TRUSTED_PREFIX = 'vx_2fa_t_';  // full cookie: vx_2fa_t_{userId}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { password, code } = body as { password: string; code: string };

    if (!password || !code) {
      return NextResponse.json(
        { error: 'Password and 2FA code are both required.' },
        { status: 400 }
      );
    }

    // ── 1. Verify password by attempting sign-in ────────────────
    const browserSupabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const email = user.email!;
    const { error: signInError } = await browserSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Incorrect password. Please try again.' },
        { status: 400 }
      );
    }

    // ── 2. Verify 2FA code ──────────────────────────────────────
    const { data: twofa, error: fetchError } = await supabase
      .from('user_2fa')
      .select('totp_secret, totp_enabled, totp_backup_codes')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !twofa || !twofa.totp_enabled || !twofa.totp_secret) {
      return NextResponse.json({ error: '2FA is not currently enabled.' }, { status: 400 });
    }

    const trimmedCode = code.trim().replace(/\s|-/g, '').toUpperCase();
    let codeValid = false;

    // Check TOTP
    if (/^\d{6}$/.test(trimmedCode)) {
      codeValid = authenticator.verify({
        token: trimmedCode,
        secret: twofa.totp_secret,
      });
    }

    // Check backup code
    if (!codeValid) {
      const backupCodes = (twofa.totp_backup_codes || []) as Array<{
        code: string;
        used: boolean;
      }>;
      const idx = backupCodes.findIndex(b => !b.used && b.code === trimmedCode);
      codeValid = idx !== -1;
    }

    if (!codeValid) {
      return NextResponse.json(
        { error: 'Invalid 2FA code. Please try again.' },
        { status: 400 }
      );
    }

    // ── 3. Disable 2FA ──────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('user_2fa')
      .update({
        totp_secret: null,
        totp_pending_secret: null,
        totp_enabled: false,
        totp_backup_codes: [],
        enabled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('2FA disable error:', updateError);
      return NextResponse.json({ error: 'Failed to disable 2FA.' }, { status: 500 });
    }

    // Clear the trusted device cookie for this user
    const res = NextResponse.json({ success: true });
    res.cookies.set(`${TRUSTED_PREFIX}${user.id}`, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return res;
  } catch (err: any) {
    console.error('2FA disable error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to disable 2FA.' },
      { status: 500 }
    );
  }
}