-- ================================================================
-- VaultX Migration 10: Fix Referral RLS & Status
-- ================================================================

-- 1. Update investments RLS to allow referrers to see their referrals' investments
DROP POLICY IF EXISTS "Users view own investments" ON public.investments;

CREATE POLICY "Users view own and referrals investments"
ON public.investments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = public.investments.user_id 
    AND referred_by = auth.uid()
  )
);

-- 2. Ensure all existing profiles have the 'active' status if they are not suspended
UPDATE public.profiles 
SET status = 'active' 
WHERE status IS NULL OR status = 'pending';

-- 3. Verify the policy
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'investments';
