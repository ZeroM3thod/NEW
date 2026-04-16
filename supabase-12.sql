-- ================================================================
-- VaultX Migration 11: Deposit Lock Feature (5-minute security hold)
-- ================================================================

-- 1. Add locked_until and unlock_email_sent to deposits
ALTER TABLE public.deposits 
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unlock_email_sent BOOLEAN DEFAULT FALSE;

-- 2. Backfill: all existing deposits get locked_until = created_at + 5 min
--    (for old records this is already expired, so they're unlocked immediately)
UPDATE public.deposits 
SET locked_until = created_at + INTERVAL '5 minutes'
WHERE locked_until IS NULL;

-- 3. Verify
SELECT 
  id,
  amount,
  status,
  created_at,
  locked_until,
  unlock_email_sent,
  CASE 
    WHEN locked_until > NOW() THEN 'LOCKED'
    ELSE 'UNLOCKED'
  END AS lock_status
FROM public.deposits 
ORDER BY created_at DESC
LIMIT 10;