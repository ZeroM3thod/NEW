-- Create investments table
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.seasons(id),
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Drop first, then recreate
DROP POLICY IF EXISTS "Users view own investments" ON public.investments;
DROP POLICY IF EXISTS "Users insert own investments" ON public.investments;
DROP POLICY IF EXISTS "Admins manage investments" ON public.investments;

CREATE POLICY "Users view own investments" ON public.investments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own investments" ON public.investments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage investments" ON public.investments
    FOR ALL USING (public.is_admin());