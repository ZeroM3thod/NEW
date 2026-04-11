-- 1. EXTENSIONS & TYPES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'season_status') THEN
        CREATE TYPE season_status AS ENUM ('upcoming', 'open', 'running', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    username TEXT UNIQUE,
    phone_number TEXT,
    country TEXT,
    role public.user_role DEFAULT 'user',
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES public.profiles(id),
    commission_rate NUMERIC DEFAULT 7.0,
    balance NUMERIC DEFAULT 0,
    invested_total NUMERIC DEFAULT 0,
    withdrawable_total NUMERIC DEFAULT 0,
    profits_total NUMERIC DEFAULT 0,
    avg_roi NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    period TEXT,
    roi_range TEXT,
    final_roi NUMERIC,
    status public.season_status DEFAULT 'upcoming',
    pool_cap NUMERIC DEFAULT 1000000,
    current_pool NUMERIC DEFAULT 0,
    min_entry NUMERIC DEFAULT 100,
    duration_days INTEGER DEFAULT 90,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    referral_bonus NUMERIC DEFAULT 5.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    network TEXT,
    tx_hash TEXT,
    status public.request_status DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    address TEXT NOT NULL,
    network TEXT,
    tx_hash TEXT,
    status public.request_status DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_ends_at TIMESTAMP WITH TIME ZONE,
    base_referral_rate NUMERIC DEFAULT 7.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES
DO $$ 
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
    
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Public profiles are viewable" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    -- Seasons
    DROP POLICY IF EXISTS "Anyone can view seasons" ON public.seasons;
    DROP POLICY IF EXISTS "Admins can manage seasons" ON public.seasons;
    
    CREATE POLICY "Anyone can view seasons" ON public.seasons FOR SELECT USING (true);
    CREATE POLICY "Admins can manage seasons" ON public.seasons FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    -- Investments
    DROP POLICY IF EXISTS "Users can view own investments" ON public.investments;
    DROP POLICY IF EXISTS "Users can insert own investments" ON public.investments;
    DROP POLICY IF EXISTS "Admins can manage all investments" ON public.investments;
    
    CREATE POLICY "Users can view own investments" ON public.investments FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own investments" ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Admins can manage all investments" ON public.investments FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    -- Deposits
    DROP POLICY IF EXISTS "Users can view own deposits" ON public.deposits;
    DROP POLICY IF EXISTS "Users can insert own deposits" ON public.deposits;
    DROP POLICY IF EXISTS "Admins can manage all deposits" ON public.deposits;
    
    CREATE POLICY "Users can view own deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Admins can manage all deposits" ON public.deposits FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    -- Withdrawals
    DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
    DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.withdrawals;
    DROP POLICY IF EXISTS "Admins can manage all withdrawals" ON public.withdrawals;
    
    CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Admins can manage all withdrawals" ON public.withdrawals FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    -- Settings
    DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
    DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
    
    CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT USING (true);
    CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
END $$;

-- 5. FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    referrer_id UUID;
BEGIN
    IF new.raw_user_meta_data->>'referral_by_code' IS NOT NULL THEN
        SELECT id INTO referrer_id FROM public.profiles 
        WHERE referral_code = (new.raw_user_meta_data->>'referral_by_code');
    END IF;

    INSERT INTO public.profiles (id, first_name, last_name, username, referral_code, referred_by)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'username',
        upper(substring(md5(random()::text) from 1 for 8)),
        referrer_id
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. INITIAL DATA
INSERT INTO public.settings (id, maintenance_mode, base_referral_rate)
VALUES (1, false, 7.0)
ON CONFLICT (id) DO NOTHING;
