-- ================================================================
-- VaultX Migration: Referral & Balance Logic Fixes
-- Run this in your Supabase SQL editor
-- ================================================================

-- 1. Add referral_earned column to profiles (tracks commission earned from referrals)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_earned NUMERIC DEFAULT 0;

-- 2. Backfill: set withdrawable_total = balance for all users (remove lock logic)
UPDATE public.profiles 
SET withdrawable_total = balance
WHERE withdrawable_total != balance;

-- 3. Update the handle_new_user trigger to include referral_earned
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    referrer_id UUID;
    user_count INTEGER;
    user_role public.user_role := 'user';
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.profiles;
    IF user_count = 0 THEN
        user_role := 'admin';
    END IF;

    IF new.raw_user_meta_data->>'referral_by_code' IS NOT NULL THEN
        SELECT id INTO referrer_id FROM public.profiles 
        WHERE referral_code = (new.raw_user_meta_data->>'referral_by_code');
    END IF;

    INSERT INTO public.profiles (
        id, first_name, last_name, username, phone_number, country,
        role, referral_code, referred_by,
        balance, withdrawable_total, invested_total, profits_total, referral_earned
    )
    VALUES (
        new.id,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'phone',
        COALESCE(new.raw_user_meta_data->>'country', 'Bangladesh'),
        user_role,
        upper(substring(md5(random()::text) from 1 for 8)),
        referrer_id,
        0, 0, 0, 0, 0
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verify columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND column_name IN ('balance', 'withdrawable_total', 'invested_total', 'profits_total', 'referral_earned')
ORDER BY column_name;

-- ================================================================
-- KEY BUSINESS LOGIC SUMMARY (enforced in application layer):
-- 
-- 1. Deposit confirmed  → balance += amount, withdrawable_total = balance
-- 2. Season closed      → for each investor:
--      profit = amount * roi / 100
--      balance += (amount + profit)             -- return principal + profit
--      withdrawable_total = balance              -- all is withdrawable
--      profits_total += profit
--      invested_total -= amount                  -- no longer invested
--      
--      if investor.referred_by:
--        commission = profit * 0.07              -- 7% of PROFIT
--        referrer.balance += commission
--        referrer.withdrawable_total = referrer.balance
--        referrer.referral_earned += commission   -- track separately
--
-- 3. Withdrawal approved → balance -= amount, withdrawable_total = balance
-- ================================================================