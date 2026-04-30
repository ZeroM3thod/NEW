import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // 1. Verify user is staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = profile?.role && ['admin', 'moderator', 'support'].includes(profile.role);
    if (!isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch current status
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('status')
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // 3. Update status
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', id);

    if (updateError) throw updateError;

    // 4. Create log entry
    let logText = `Ticket marked as ${status}`;
    if (status === 'open' && (ticket.status === 'closed' || ticket.status === 'resolved')) {
      logText = 'Ticket re-opened by moderator';
    }

    await supabase
      .from('ticket_logs')
      .insert({
        ticket_id: id,
        action: 'status_changed',
        performed_by: user.id,
        details: { text: logText, status }
      });

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
