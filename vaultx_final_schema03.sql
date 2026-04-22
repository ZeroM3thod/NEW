-- Run this in your Supabase SQL editor
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS note TEXT;