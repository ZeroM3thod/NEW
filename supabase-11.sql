-- ================================================================
-- VaultX Migration 11: Fix Season Pool Updates
-- ================================================================

-- 1. Function to increment season pool (SECURITY DEFINER so users can call it)
CREATE OR REPLACE FUNCTION public.increment_season_pool(p_season_id UUID, p_amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE public.seasons 
  SET current_pool = COALESCE(current_pool, 0) + p_amount
  WHERE id = p_season_id
    AND status IN ('open', 'running');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_season_pool(UUID, NUMERIC) TO authenticated;

-- 3. Backfill current_pool from actual active investments (fixes existing data)
UPDATE public.seasons s
SET current_pool = COALESCE((
  SELECT SUM(i.amount)
  FROM public.investments i
  WHERE i.season_id = s.id
    AND i.status IN ('active', 'completed')
), 0)
WHERE s.status IN ('open', 'running', 'closed');

-- 4. Verify
SELECT id, name, status, current_pool 
FROM public.seasons 
ORDER BY created_at DESC;
