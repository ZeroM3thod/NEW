-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with email from auth.users (if possible, but usually restricted in migration scripts if not using service role)
-- Actually, a better way to sync for existing users is to run a one-time update if we have access, 
-- but the trigger will handle new users.

-- Update the handle_new_user trigger to include email
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
        id, first_name, last_name, username, email, phone_number, country,
        role, referral_code, referred_by,
        balance, withdrawable_total, invested_total, profits_total, referral_earned
    )
    VALUES (
        new.id,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'username',
        new.email, -- email from auth.users
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
