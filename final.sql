-- ================================================================
-- ValutX — FINAL COMPLETE DATABASE SCHEMA
-- Run this on a fresh Supabase project (SQL Editor)
-- Incorporates all migrations: schema, RLS fixes, referral logic,
-- deposit lock feature, pool increment RPC, duplicate-signup fix.
-- ================================================================


-- ══════════════════════════════════════════════════════════════
-- 1. EXTENSIONS
-- ══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════
-- 2. ENUM TYPES
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- User roles
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('user', 'admin');
  END IF;

  -- Season lifecycle states (paused added for admin pause/resume feature)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'season_status') THEN
    CREATE TYPE public.season_status AS ENUM (
      'upcoming', 'open', 'running', 'paused', 'closed'
    );
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- 3. CORE TABLES
-- ══════════════════════════════════════════════════════════════

-- ── 3a. profiles ─────────────────────────────────────────────
-- Note: active_season_id FK to seasons is added after seasons table exists.
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name         TEXT,
  last_name          TEXT,
  username           TEXT        UNIQUE,
  email              TEXT,
  phone_number       TEXT,
  country            TEXT        DEFAULT 'Bangladesh',

  -- Access control
  role               public.user_role DEFAULT 'user',
  status             TEXT        DEFAULT 'active'
                                 CHECK (status IN ('active', 'suspended', 'pending')),

  -- Referral
  referral_code      TEXT        UNIQUE,
  referred_by        UUID        REFERENCES public.profiles(id),
  commission_rate    NUMERIC     DEFAULT 15.0,  -- % of referral's profit (flat rate, no tiers)
  referral_earned    NUMERIC     DEFAULT 0,

  -- Financial
  balance            NUMERIC     DEFAULT 0,
  invested_total     NUMERIC     DEFAULT 0,
  withdrawable_total NUMERIC     DEFAULT 0,
  profits_total      NUMERIC     DEFAULT 0,

  -- Convenience link to active season (FK added below)
  active_season_id   UUID,

  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3b. seasons ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seasons (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT          NOT NULL,
  period           TEXT,                         -- human-readable label
  roi_range        TEXT,                         -- e.g. "20–30%"
  final_roi        NUMERIC,                      -- set on close
  status           public.season_status DEFAULT 'upcoming',
  pool_cap         NUMERIC       DEFAULT 1000000,
  current_pool     NUMERIC       DEFAULT 0,
  min_entry        NUMERIC       DEFAULT 100,
  max_entry        NUMERIC       DEFAULT 50000,
  duration_days    INTEGER       DEFAULT 90,
  start_date       TIMESTAMP WITH TIME ZONE,     -- entry opens
  end_date         TIMESTAMP WITH TIME ZONE,     -- season closes
  entry_close_date TIMESTAMP WITH TIME ZONE,     -- last day to join
  auto_close_enabled BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add deferred FK: profiles.active_season_id → seasons.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_profiles_active_season'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_active_season
      FOREIGN KEY (active_season_id) REFERENCES public.seasons(id);
  END IF;
END $$;

-- ── 3c. investments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investments (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id  UUID    REFERENCES public.seasons(id),
  amount     NUMERIC NOT NULL,
  status     TEXT    DEFAULT 'active',   -- active | completed
  joined_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3d. deposits ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deposits (
  id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount             NUMERIC NOT NULL,
  network            TEXT    DEFAULT 'BEP-20',
  tx_hash            TEXT,
  status             TEXT    DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason   TEXT,

  -- 60-day security lock: withdrawal blocked until this timestamp
  locked_until       TIMESTAMP WITH TIME ZONE,
  -- Set to TRUE after the unlock e-mail notification is sent
  unlock_email_sent  BOOLEAN DEFAULT FALSE,

  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3e. withdrawals ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount           NUMERIC NOT NULL,
  address          TEXT    NOT NULL,
  network          TEXT    DEFAULT 'BEP-20',
  tx_hash          TEXT,                         -- set by admin on approval
  status           TEXT    DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  note             TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3f. settings (singleton — id must equal 1) ───────────────
CREATE TABLE IF NOT EXISTS public.settings (
  id                  INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode    BOOLEAN DEFAULT FALSE,
  maintenance_ends_at TIMESTAMP WITH TIME ZONE,
  base_referral_rate  NUMERIC DEFAULT 15.0,   -- flat 15% commission, no tiers
  usdt_bep20_address  TEXT,
  usdt_trc20_address  TEXT,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3g. user_2fa ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_2fa (
  user_id              UUID     PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  totp_secret          TEXT,                          -- active secret (when enabled)
  totp_pending_secret  TEXT,                          -- temp secret during setup
  totp_enabled         BOOLEAN  NOT NULL DEFAULT FALSE,
  totp_backup_codes    JSONB    NOT NULL DEFAULT '[]'::jsonb,
  enabled_at           TIMESTAMP WITH TIME ZONE,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
-- 4. INDEXES
-- ══════════════════════════════════════════════════════════════

-- Case-insensitive uniqueness for email and username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_idx
  ON public.profiles (LOWER(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- Speed up common lookups
CREATE INDEX IF NOT EXISTS investments_user_id_idx   ON public.investments (user_id);
CREATE INDEX IF NOT EXISTS investments_season_id_idx ON public.investments (season_id);
CREATE INDEX IF NOT EXISTS deposits_user_id_idx      ON public.deposits    (user_id);
CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx   ON public.withdrawals (user_id);

-- Lock-expiry query (used by dashboard & deposit page)
CREATE INDEX IF NOT EXISTS deposits_locked_until_idx
  ON public.deposits (user_id, locked_until)
  WHERE status = 'approved' AND locked_until IS NOT NULL;


-- ══════════════════════════════════════════════════════════════
-- 5. ROW-LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa    ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════
-- 6. is_admin() HELPER FUNCTION
--    SECURITY DEFINER so the policy on `profiles` can call it
--    without causing infinite recursion.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- 7. RLS POLICIES
--    Drop ALL existing policies first to ensure a clean slate,
--    then recreate exactly what the application needs.
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM   pg_policies
    WHERE  schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      r.policyname, r.tablename
    );
  END LOOP;
END $$;

-- ── profiles ─────────────────────────────────────────────────
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- ── seasons ──────────────────────────────────────────────────
CREATE POLICY "seasons_select_all"
  ON public.seasons FOR SELECT
  USING (true);

CREATE POLICY "seasons_admin_all"
  ON public.seasons FOR ALL
  USING (public.is_admin());

-- ── investments ──────────────────────────────────────────────
CREATE POLICY "investments_select_own_and_referrals"
  ON public.investments FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.investments.user_id
        AND p.referred_by = auth.uid()
    )
  );

CREATE POLICY "investments_insert_own"
  ON public.investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "investments_admin_all"
  ON public.investments FOR ALL
  USING (public.is_admin());

-- ── deposits ─────────────────────────────────────────────────
CREATE POLICY "deposits_select_own"
  ON public.deposits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "deposits_insert_own"
  ON public.deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "deposits_admin_all"
  ON public.deposits FOR ALL
  USING (public.is_admin());

-- ── withdrawals ──────────────────────────────────────────────
CREATE POLICY "withdrawals_select_own"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "withdrawals_insert_own"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "withdrawals_admin_all"
  ON public.withdrawals FOR ALL
  USING (public.is_admin());

-- ── settings ─────────────────────────────────────────────────
CREATE POLICY "settings_select_all"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "settings_admin_all"
  ON public.settings FOR ALL
  USING (public.is_admin());

-- ── user_2fa ─────────────────────────────────────────────────
CREATE POLICY "user_2fa_self_rw"
  ON public.user_2fa FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_2fa_admin_all"
  ON public.user_2fa FOR ALL
  USING (public.is_admin());


-- ══════════════════════════════════════════════════════════════
-- 8. RPC: increment_season_pool
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_season_pool(
  p_season_id UUID,
  p_amount    NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.seasons
  SET    current_pool = COALESCE(current_pool, 0) + p_amount
  WHERE  id = p_season_id
    AND  status IN ('open', 'running');
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_season_pool(UUID, NUMERIC) TO authenticated;


-- ══════════════════════════════════════════════════════════════
-- 9. ENUM: extra user roles
-- ══════════════════════════════════════════════════════════════

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'representative';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'moderator';


-- ══════════════════════════════════════════════════════════════
-- 10. TRIGGER: handle_new_user
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_user_count  INTEGER;
  v_user_role   public.user_role := 'user';
  v_username    TEXT;
BEGIN
  -- ── First registered user is automatically admin ──────────
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;
  IF v_user_count = 0 THEN
    v_user_role := 'admin';
  END IF;

  -- ── Resolve optional referral code ───────────────────────
  IF new.raw_user_meta_data->>'referral_by_code' IS NOT NULL
     AND TRIM(new.raw_user_meta_data->>'referral_by_code') <> ''
  THEN
    SELECT id INTO v_referrer_id
    FROM   public.profiles
    WHERE  referral_code =
           UPPER(TRIM(new.raw_user_meta_data->>'referral_by_code'));
  END IF;

  -- ── Always store username in lowercase ───────────────────
  v_username := LOWER(TRIM(COALESCE(new.raw_user_meta_data->>'username', '')));
  IF v_username = '' THEN v_username := NULL; END IF;

  -- ── Insert profile ────────────────────────────────────────
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    username,
    email,
    phone_number,
    country,
    role,
    status,
    referral_code,
    referred_by,
    commission_rate,   -- flat 15% for all users, no tier increases
    balance,
    invested_total,
    withdrawable_total,
    profits_total,
    referral_earned
  )
  VALUES (
    new.id,
    TRIM(new.raw_user_meta_data->>'first_name'),
    TRIM(new.raw_user_meta_data->>'last_name'),
    v_username,
    LOWER(TRIM(new.email)),
    new.raw_user_meta_data->>'phone',
    COALESCE(TRIM(new.raw_user_meta_data->>'country'), 'Bangladesh'),
    v_user_role,
    'active',
    -- Generate a random 8-char uppercase referral code
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    v_referrer_id,
    15.0,   -- flat 15% commission rate, no milestone tiers
    0, 0, 0, 0, 0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ══════════════════════════════════════════════════════════════
-- 11. TRIGGER: handle_new_user_2fa
-- ══════════════════════════════════════════════════════════════

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


-- ══════════════════════════════════════════════════════════════
-- 12. INITIAL SEED DATA
-- ══════════════════════════════════════════════════════════════

INSERT INTO public.settings (id, maintenance_mode, base_referral_rate)
VALUES (1, FALSE, 15.0)   -- flat 15% commission rate
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- 13. BACKFILL EXISTING DATA (safe to run on populated DBs)
-- ══════════════════════════════════════════════════════════════

-- Sync current_pool from actual investment amounts
UPDATE public.seasons s
SET    current_pool = COALESCE((
  SELECT SUM(i.amount)
  FROM   public.investments i
  WHERE  i.season_id = s.id
    AND  i.status IN ('active', 'completed')
), 0);

-- Normalise existing emails / usernames to lowercase
UPDATE public.profiles
SET    email    = LOWER(email)
WHERE  email IS NOT NULL
  AND  email <> LOWER(email);

UPDATE public.profiles
SET    username = LOWER(username)
WHERE  username IS NOT NULL
  AND  username <> LOWER(username);

-- Ensure all non-suspended profiles have 'active' status
UPDATE public.profiles
SET    status = 'active'
WHERE  status IS NULL OR status = 'pending';

-- Backfill locked_until for old deposits that have none
UPDATE public.deposits
SET    locked_until = created_at
WHERE  locked_until IS NULL;

-- Backfill 2FA rows for any existing profiles
INSERT INTO public.user_2fa (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ── Update existing users to flat 15% commission ─────────────
-- Removes any old tier-based overrides; everyone gets 15% going forward.
UPDATE public.profiles
SET    commission_rate = 15.0
WHERE  commission_rate <> 15.0;

-- Update global setting too
UPDATE public.settings
SET    base_referral_rate = 15.0,
       updated_at         = NOW()
WHERE  id = 1;


-- ══════════════════════════════════════════════════════════════
-- 14. VERIFICATION QUERIES
-- ══════════════════════════════════════════════════════════════

SELECT 'Tables' AS check_type, tablename
FROM   pg_tables
WHERE  schemaname = 'public'
  AND  tablename IN (
         'profiles','seasons','investments',
         'deposits','withdrawals','settings','user_2fa'
       );

SELECT 'RLS enabled' AS check_type, relname AS table_name, relrowsecurity AS enabled
FROM   pg_class
WHERE  relname IN (
         'profiles','seasons','investments',
         'deposits','withdrawals','settings','user_2fa'
       );

SELECT 'Policies' AS check_type, tablename, policyname, cmd
FROM   pg_policies
WHERE  schemaname = 'public'
ORDER  BY tablename, policyname;

SELECT 'Trigger' AS check_type, trigger_name, event_object_table
FROM   information_schema.triggers
WHERE  trigger_name IN ('on_auth_user_created', 'on_profile_created_2fa');

SELECT 'Functions' AS check_type, routine_name
FROM   information_schema.routines
WHERE  routine_schema = 'public'
  AND  routine_name IN (
         'is_admin','handle_new_user','increment_season_pool',
         'handle_new_user_2fa'
       );

SELECT 'Commission check' AS check_type,
       commission_rate,
       COUNT(*) AS user_count
FROM   public.profiles
GROUP  BY commission_rate;

SELECT 'Base referral rate' AS check_type, base_referral_rate
FROM   public.settings WHERE id = 1;