BEGIN;

-- Fix: function_search_path_mutable WARN on the new trigger function.
CREATE OR REPLACE FUNCTION private.set_vehicle_claim_updated_at() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.set_vehicle_claim_updated_at() FROM PUBLIC,anon,authenticated;

-- Cover newly-added foreign keys that lack an index.
CREATE INDEX IF NOT EXISTS idx_role_rate_defaults_updated_by ON public.role_rate_defaults(updated_by);
CREATE INDEX IF NOT EXISTS idx_utility_billing_rates_updated_by ON public.utility_billing_rates(updated_by);
CREATE INDEX IF NOT EXISTS idx_utility_billing_rates_storm_event_id ON public.utility_billing_rates(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_claims_reviewed_by ON public.time_entry_vehicle_claims(reviewed_by);

NOTIFY pgrst,'reload schema';
COMMIT;
