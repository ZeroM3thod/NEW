-- ================================================================
-- ValutX — Google Authenticator 2FA Migration
-- Run in Supabase SQL Editor
-- ================================================================

-- ── 1. Create dedicated user_2fa table (keeps secrets off profiles) ──
CREATE TABLE IF NOT EXISTS public.user_2fa (
  user_id              UUID     PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  totp_secret          TEXT,                          -- active secret (when enabled)
  totp_pending_secret  TEXT,                          -- temp secret during setup
  totp_enabled         BOOLEAN  NOT NULL DEFAULT FALSE,
  totp_backup_codes    JSONB    NOT NULL DEFAULT '[]'::jsonb,
  enabled_at           TIMESTAMP WITH TIME ZONE,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 2. Enable RLS ──────────────────────────────────────────────
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

-- Users can only access their own 2FA record
CREATE POLICY "user_2fa_self_rw"
  ON public.user_2fa FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "user_2fa_admin_all"
  ON public.user_2fa FOR ALL
  USING (public.is_admin());

-- ── 3. Auto-create empty row when profile is created ──────────
CREATE OR REPLACE FUNCTION public.handle_new_user_2fa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_2fa (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_2fa ON public.profiles;
CREATE TRIGGER on_profile_created_2fa
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_2fa();

-- ── 4. Backfill existing profiles ─────────────────────────────
INSERT INTO public.user_2fa (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ── 5. Verification ───────────────────────────────────────────
SELECT 'user_2fa table' AS check_type, COUNT(*) AS row_count FROM public.user_2fa;

SELECT 'Policies' AS check_type, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_2fa'
ORDER BY policyname;
