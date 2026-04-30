import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
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
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Verify ticket exists and is not closed
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('status, user_id')
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if user has permission (is owner or staff)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = profile?.role && ['admin', 'moderator', 'support'].includes(profile.role);
    if (!isStaff && ticket.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 });
    }

    // 2. Insert message
    const { data: msg, error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: id,
        sender_id: user.id,
        message
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // 3. Update ticket status if it was 'pending' and an admin replied
    if (isStaff && ticket.status === 'pending') {
      await supabase
        .from('support_tickets')
        .update({ status: 'open' })
        .eq('id', id);
        
      await supabase
        .from('ticket_logs')
        .insert({
          ticket_id: id,
          action: 'status_changed',
          performed_by: user.id,
          details: { text: 'Ticket opened by moderator', status: 'open' }
        });
    }

    // 4. Create log entry for message
    await supabase
      .from('ticket_logs')
      .insert({
        ticket_id: id,
        action: 'message_sent',
        performed_by: user.id,
        details: { text: isStaff ? 'Admin replied to ticket' : 'User replied to ticket' }
      });

    return NextResponse.json(msg);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
