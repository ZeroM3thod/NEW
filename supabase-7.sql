-- ================================================================
-- VaultX Migration 7: Schema Alignment & Security Fixes
-- ================================================================

-- 1. Add missing columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
ADD COLUMN IF NOT EXISTS active_season_id UUID REFERENCES public.seasons(id);

-- 2. Add missing column to seasons
ALTER TABLE public.seasons 
ADD COLUMN IF NOT EXISTS entry_close_date TIMESTAMP WITH TIME ZONE;

-- 3. Add missing columns to settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS usdt_bep20_address TEXT,
ADD COLUMN IF NOT EXISTS usdt_trc20_address TEXT;

-- 4. Fix RLS Circular Reference
-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS on profiles (reversing supabase-2.sql)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate profiles policies to be clean and non-circular
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins full access" ON public.profiles;

CREATE POLICY "Admins full access"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin());

CREATE POLICY "Public read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 5. Canonical handle_new_user trigger
-- Consolidates improvements from supabase-5.sql and supabase-6.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    referrer_id UUID;
    user_count INTEGER;
    user_role public.user_role := 'user';
BEGIN
    -- First user is admin
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    IF user_count = 0 THEN
        user_role := 'admin';
    END IF;

    -- Referral logic
    IF new.raw_user_meta_data->>'referral_by_code' IS NOT NULL THEN
        SELECT id INTO referrer_id FROM public.profiles 
        WHERE referral_code = (new.raw_user_meta_data->>'referral_by_code');
    END IF;

    INSERT INTO public.profiles (
        id, first_name, last_name, username, email, phone_number, country,
        role, referral_code, referred_by,
        balance, withdrawable_total, invested_total, profits_total, referral_earned,
        status, commission_rate
    )
    VALUES (
        new.id,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'username',
        new.email,
        new.raw_user_meta_data->>'phone',
        COALESCE(new.raw_user_meta_data->>'country', 'Bangladesh'),
        user_role,
        upper(substring(md5(random()::text) from 1 for 8)),
        referrer_id,
        0, 0, 0, 0, 0,
        'active', 7.0
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Verify and set initial data for settings if missing addresses
UPDATE public.settings 
SET usdt_bep20_address = '0x1234567890abcdef1234567890abcdef12345678', -- Placeholder
    usdt_trc20_address = 'TABC1234567890abcdef1234567890abcdef'      -- Placeholder
WHERE id = 1 AND (usdt_bep20_address IS NULL OR usdt_trc20_address IS NULL);
