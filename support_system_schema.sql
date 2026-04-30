-- ================================================================
-- ValutX — USER SUPPORT SYSTEM SCHEMA
-- ================================================================

-- ══════════════════════════════════════════════════════════════
-- 1. ENUM TYPES
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Ticket Status
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE public.ticket_status AS ENUM ('open', 'resolved', 'closed');
  END IF;

  -- Ticket Priority
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. TABLES
-- ══════════════════════════════════════════════════════════════

-- ── 2a. support_tickets ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id    TEXT            UNIQUE NOT NULL, -- e.g., TKT-8821
  user_id      UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject      TEXT            NOT NULL,
  category     TEXT            NOT NULL,
  priority     public.ticket_priority DEFAULT 'medium',
  status       public.ticket_status   DEFAULT 'open',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 2b. ticket_messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id    UUID            NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id    UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message      TEXT            NOT NULL,
  is_read      BOOLEAN         DEFAULT FALSE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 2c. ticket_logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_logs (
  id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id    UUID            NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  action       TEXT            NOT NULL, -- e.g., 'status_changed', 'message_sent', 'assigned'
  performed_by UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  details      JSONB,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 3. INDEXES
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_logs_ticket_id_idx ON public.ticket_logs(ticket_id);

-- ══════════════════════════════════════════════════════════════
-- 4. HELPER FUNCTIONS
-- ══════════════════════════════════════════════════════════════

-- Function to check if a user is a moderator/admin
CREATE OR REPLACE FUNCTION public.is_support_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'moderator', 'support')
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 5. ROW-LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_logs     ENABLE ROW LEVEL SECURITY;

-- ── support_tickets Policies ─────────────────────────────────

CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id OR public.is_support_staff());

CREATE POLICY "Users can create their own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Support staff can update tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.is_support_staff());

-- ── ticket_messages Policies ─────────────────────────────────

CREATE POLICY "Users can view messages for their tickets"
  ON public.ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_messages.ticket_id
        AND (user_id = auth.uid() OR public.is_support_staff())
    )
  );

CREATE POLICY "Users can send messages to their tickets"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_messages.ticket_id
        AND (user_id = auth.uid() OR public.is_support_staff())
        AND status <> 'closed'
    )
  );

-- ── ticket_logs Policies ─────────────────────────────────────

CREATE POLICY "Support staff and ticket owners can view logs"
  ON public.ticket_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_logs.ticket_id
        AND (user_id = auth.uid() OR public.is_support_staff())
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 6. TRIGGERS
-- ══════════════════════════════════════════════════════════════

-- Update support_tickets.updated_at on message insertion
CREATE OR REPLACE FUNCTION public.update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_tickets
  SET updated_at = NOW()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ticket_message_inserted
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_ticket_timestamp();

-- ══════════════════════════════════════════════════════════════
-- 7. ENABLE REALTIME
-- ══════════════════════════════════════════════════════════════

-- Add tables to the supabase_realtime publication
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.support_tickets, 
    public.ticket_messages, 
    public.ticket_logs;
COMMIT;
