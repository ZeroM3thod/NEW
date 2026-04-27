import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticator } from 'otplib';

authenticator.options = { window: 1 };

const TRUSTED_COOKIE  = 'vx_2fa_t';
const PENDING_COOKIE  = 'vx_2fa_pending';
const TRUSTED_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, rememberDevice = false } = body as {
      code: string;
      rememberDevice?: boolean;
    };

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
    }

    // Fetch 2FA record
    const { data: twofa, error: fetchError } = await supabase
      .from('user_2fa')
      .select('totp_secret, totp_enabled, totp_backup_codes')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !twofa || !twofa.totp_enabled || !twofa.totp_secret) {
      return NextResponse.json({ error: '2FA not configured.' }, { status: 400 });
    }

    const trimmedCode = code.trim().replace(/\s|-/g, '').toUpperCase();

    // ── 1. Try TOTP code ────────────────────────────────────────
    if (/^\d{6}$/.test(trimmedCode)) {
      const isValid = authenticator.verify({
        token: trimmedCode,
        secret: twofa.totp_secret,
      });

      if (isValid) {
        return buildSuccess(user.id, rememberDevice);
      }
    }

    // ── 2. Try backup code (format: XXXX-XXXX) ─────────────────
    const backupCodes = (twofa.totp_backup_codes || []) as Array<{
      code: string;
      used: boolean;
    }>;

    const idx = backupCodes.findIndex(
      b => !b.used && b.code === trimmedCode
    );

    if (idx !== -1) {
      // Mark backup code as used
      backupCodes[idx].used = true;
      await supabase
        .from('user_2fa')
        .update({
          totp_backup_codes: backupCodes,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      const remaining = backupCodes.filter(b => !b.used).length;
      return buildSuccess(user.id, rememberDevice, true, remaining);
    }

    return NextResponse.json(
      { error: 'Invalid code. Please try again.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('2FA verify error:', err);
    return NextResponse.json(
      { error: err.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}

function buildSuccess(
  userId: string,
  rememberDevice: boolean,
  usedBackupCode = false,
  backupCodesRemaining?: number
): NextResponse {
  const res = NextResponse.json({
    success: true,
    usedBackupCode,
    backupCodesRemaining,
  });

  // Clear the pending cookie
  res.cookies.set(PENDING_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  // Optionally mark device as trusted for 30 days
  if (rememberDevice) {
    res.cookies.set(`${TRUSTED_COOKIE}_${userId}`, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TRUSTED_MAX_AGE,
    });
  }

  return res;
}
