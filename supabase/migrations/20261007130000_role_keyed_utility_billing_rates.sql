-- Add schema support for storm role-keyed utility billing rates.
--
-- Existing work-type rates stay intact. Storm-specific compensation and its
-- costing trigger are installed atomically by
-- 20261008220000_storm_compensation.sql; this prerequisite intentionally
-- leaves the current costing behavior unchanged when applied by itself.

ALTER TABLE public.utility_billing_rates
  ADD COLUMN role public.contractor_role;

ALTER TABLE public.utility_billing_rates
  ALTER COLUMN work_type DROP NOT NULL;

-- A role rate row carries a role and no work type; a preserved work-type row
-- carries a work type and no role. Nothing may carry both or neither.
ALTER TABLE public.utility_billing_rates
  ADD CONSTRAINT utility_billing_rates_key_chk CHECK (
    (role IS NOT NULL AND work_type IS NULL) OR (role IS NULL AND work_type IS NOT NULL)
  );

CREATE UNIQUE INDEX utility_billing_rates_role_global_uk
  ON public.utility_billing_rates (role) WHERE role IS NOT NULL AND storm_event_id IS NULL;
CREATE UNIQUE INDEX utility_billing_rates_role_storm_uk
  ON public.utility_billing_rates (storm_event_id, role) WHERE role IS NOT NULL AND storm_event_id IS NOT NULL;

-- Keep the existing work-type costing trigger until the storm-owned rate
-- migration replaces it in the same production rollout.
