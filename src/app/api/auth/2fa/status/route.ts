import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: twofa } = await supabase
      .from('user_2fa')
      .select('totp_enabled, enabled_at, totp_backup_codes')
      .eq('user_id', user.id)
      .single();

    const backupCodes = (twofa?.totp_backup_codes || []) as Array<{
      code: string;
      used: boolean;
    }>;

    return NextResponse.json({
      enabled: twofa?.totp_enabled ?? false,
      enabledAt: twofa?.enabled_at ?? null,
      backupCodesRemaining: backupCodes.filter(b => !b.used).length,
      backupCodesTotal: backupCodes.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch status.' },
      { status: 500 }
    );
  }
}
