-- Add CEO to user_role enum in its own migration transaction.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CEO';
