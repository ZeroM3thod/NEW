import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
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

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          username,
          email,
          phone_number
        )
      `)
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = profile?.role && ['admin', 'moderator', 'support'].includes(profile.role);
    if (!isStaff && ticket.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:sender_id (
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Fetch logs
    const { data: logs, error: logError } = await supabase
      .from('ticket_logs')
      .select(`
        *,
        performer:performed_by (
          first_name,
          last_name
        )
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: false });

    if (logError) throw logError;

    return NextResponse.json({
      ...ticket,
      messages,
      logs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
