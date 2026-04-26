-- ================================================================
-- ValutX — Role Expansion Migration
-- Run this in your Supabase SQL Editor
-- ================================================================

-- Add new role values to the existing enum
-- (PostgreSQL 9.3+ supports IF NOT EXISTS for ADD VALUE)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'representative';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'moderator';

-- Verification
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'user_role'
ORDER BY enumsortorder;