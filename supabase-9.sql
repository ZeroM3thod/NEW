-- ================================================================
-- ValutX: Fix Duplicate Signup — DB-Level Constraints
-- Run this in your Supabase SQL editor
-- ================================================================

-- 1. Ensure email column exists and is unique (case-insensitive)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Normalize existing emails to lowercase to avoid conflicts
UPDATE public.profiles 
SET email = LOWER(email) 
WHERE email IS NOT NULL AND email != LOWER(email);

-- 3. Normalize existing usernames to lowercase
UPDATE public.profiles 
SET username = LOWER(username) 
WHERE username IS NOT NULL AND username != LOWER(username);

-- 4. Drop old constraints if they exist (to recreate properly)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_email_key;

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_username_key;

-- 5. Add UNIQUE constraint on email (case-insensitive via citext or lower index)
-- Option A: unique index on LOWER(email) — works without installing citext
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_lower 
ON public.profiles (LOWER(email)) 
WHERE email IS NOT NULL;

-- Option B: unique index on LOWER(username)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_lower 
ON public.profiles (LOWER(username)) 
WHERE username IS NOT NULL;

-- 6. Update the handle_new_user trigger to always store lowercase
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    referrer_id UUID;
    user_count  INTEGER;
    user_role   public.user_role := 'user';
    new_username TEXT;
BEGIN
    -- First user becomes admin
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    IF user_count = 0 THEN
        user_role := 'admin';
    END IF;

    -- Resolve referrer
    IF new.raw_user_meta_data->>'referral_by_code' IS NOT NULL THEN
        SELECT id INTO referrer_id 
        FROM public.profiles 
        WHERE referral_code = (new.raw_user_meta_data->>'referral_by_code');
    END IF;

    -- ── FIX: Always lowercase username ──
    new_username := LOWER(TRIM(COALESCE(new.raw_user_meta_data->>'username', '')));

    INSERT INTO public.profiles (
        id, first_name, last_name, username, email,
        phone_number, country,
        role, referral_code, referred_by,
        balance, withdrawable_total, invested_total,
        profits_total, referral_earned, commission_rate,
        status
    )
    VALUES (
        new.id,
        TRIM(new.raw_user_meta_data->>'first_name'),
        TRIM(new.raw_user_meta_data->>'last_name'),
        new_username,
        LOWER(TRIM(new.email)),   -- ── FIX: Always lowercase email ──
        new.raw_user_meta_data->>'phone',
        COALESCE(TRIM(new.raw_user_meta_data->>'country'), 'Bangladesh'),
        user_role,
        UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
        referrer_id,
        0, 0, 0, 0, 0, 7.0,
        'active'
    )
    -- ── FIX: ON CONFLICT prevents duplicate profile if signUp is somehow called twice ──
    ON CONFLICT (id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Verify the constraints exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'profiles' 
  AND indexname IN ('profiles_email_unique_lower', 'profiles_username_unique_lower');