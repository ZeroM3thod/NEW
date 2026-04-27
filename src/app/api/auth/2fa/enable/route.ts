import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticator } from 'otplib';

authenticator.options = { window: 1 };

/** Generate 10 single-use backup codes (8 chars each, grouped). */
function generateBackupCodes(): string[] {
  return Array.from({ length: 10 }, () => {
    const raw = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    // Format as XXXX-XXXX
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body as { code: string };

    if (!code || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json(
        { error: 'A 6-digit code is required.' },
        { status: 400 }
      );
    }

    // Fetch pending secret
    const { data: twofa, error: fetchError } = await supabase
      .from('user_2fa')
      .select('totp_pending_secret, totp_enabled')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !twofa) {
      return NextResponse.json({ error: 'Setup not initiated.' }, { status: 400 });
    }

    if (twofa.totp_enabled) {
      return NextResponse.json({ error: '2FA is already enabled.' }, { status: 400 });
    }

    if (!twofa.totp_pending_secret) {
      return NextResponse.json(
        { error: 'No pending setup found. Please restart setup.' },
        { status: 400 }
      );
    }

    // Verify the TOTP code against the pending secret
    const isValid = authenticator.verify({
      token: code.trim(),
      secret: twofa.totp_pending_secret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid code. Please check the time on your device and try again.' },
        { status: 400 }
      );
    }

    // Generate backup codes
    const plainBackupCodes = generateBackupCodes();
    const backupCodesForStorage = plainBackupCodes.map(c => ({ code: c, used: false }));

    // Enable 2FA: move pending_secret → totp_secret, clear pending
    const { error: updateError } = await supabase
      .from('user_2fa')
      .update({
        totp_secret: twofa.totp_pending_secret,
        totp_pending_secret: null,
        totp_enabled: true,
        totp_backup_codes: backupCodesForStorage,
        enabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('2FA enable update error:', updateError);
      return NextResponse.json({ error: 'Failed to enable 2FA.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, backupCodes: plainBackupCodes });
  } catch (err: any) {
    console.error('2FA enable error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to enable 2FA.' },
      { status: 500 }
    );
  }
}
