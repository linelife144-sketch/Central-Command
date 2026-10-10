-- Commit this enum extension before the authority migration uses the value.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'STORM_MANAGER';
