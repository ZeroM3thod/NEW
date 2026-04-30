import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/support/tickets - Fetch tickets
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is support staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = profile?.role && ['admin', 'moderator', 'support'].includes(profile.role);

    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          username,
          email,
          phone_number
        )
      `)
      .order('created_at', { ascending: false });

    if (!isStaff) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/support/tickets - Create a new ticket
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, category, priority, message } = body;

    if (!subject || !category || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate Ticket ID: TKT-XXXX
    const ticket_id = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        ticket_id,
        user_id: user.id,
        subject,
        category,
        priority: priority || 'medium',
        status: 'open'
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    // 2. Create the first message
    const { error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message
      });

    if (msgError) throw msgError;

    // 3. Create a log entry
    await supabase
      .from('ticket_logs')
      .insert({
        ticket_id: ticket.id,
        action: 'created',
        performed_by: user.id,
        details: { text: 'Ticket submitted by user' }
      });

    return NextResponse.json(ticket);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
