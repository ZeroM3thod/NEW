import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

authenticator.options = { window: 1 };

function formatSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') || secret;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if 2FA is already enabled
    const { data: twofa } = await supabase
      .from('user_2fa')
      .select('totp_enabled')
      .eq('user_id', user.id)
      .single();

    if (twofa?.totp_enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it first.' },
        { status: 400 }
      );
    }

    // Get profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, username, first_name')
      .eq('id', user.id)
      .single();

    const accountLabel =
      profile?.email || user.email || profile?.username || 'User';

    // Generate a new TOTP secret
    const secret = authenticator.generateSecret(20);

    // Store as pending (not yet enabled — user must verify first)
    const { error: upsertError } = await supabase
      .from('user_2fa')
      .upsert(
        { user_id: user.id, totp_pending_secret: secret, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('2FA setup upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to initialise setup.' }, { status: 500 });
    }

    // Build OTP URI and QR code
    const otpauth = authenticator.keyuri(accountLabel, 'ValutX', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth, {
      width: 220,
      margin: 2,
      color: { dark: '#1c1c1c', light: '#faf7f2' },
      errorCorrectionLevel: 'M',
    });

    return NextResponse.json({
      secret: formatSecret(secret),
      secretRaw: secret,
      qrDataUrl,
      accountLabel,
    });
  } catch (err: any) {
    console.error('2FA setup error:', err);
    return NextResponse.json(
      { error: err.message || 'Setup failed.' },
      { status: 500 }
    );
  }
}
