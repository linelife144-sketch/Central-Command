BEGIN;

CREATE TABLE public.time_entry_vehicle_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL UNIQUE REFERENCES public.time_entries(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id),
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('PERSONAL','RENTAL')),
  declared_hours numeric(6,2) NOT NULL CHECK (declared_hours > 0),
  notes text NOT NULL CHECK (length(btrim(notes)) >= 3),
  vehicle_photo_url text NOT NULL,
  license_plate_photo_url text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  capped boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_claims_contractor ON public.time_entry_vehicle_claims(contractor_id);
CREATE INDEX idx_vehicle_claims_pending ON public.time_entry_vehicle_claims(created_at)
  WHERE status = 'PENDING';
ALTER TABLE public.time_entry_vehicle_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.compute_vehicle_claim_amount() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  shift_hours numeric;
  rate numeric(10,2) := 5.00;
BEGIN
  SELECT GREATEST(EXTRACT(epoch FROM (COALESCE(clock_out_at, clock_in_at) - clock_in_at))/3600.0
                  - COALESCE(break_minutes,0)/60.0, 0)
    INTO shift_hours FROM public.time_entries
    WHERE id = NEW.time_entry_id AND clock_out_at IS NOT NULL;

  IF shift_hours IS NULL THEN
    RAISE EXCEPTION 'Vehicle reimbursement can only be finalized after the time entry is closed.';
  END IF;

  IF NEW.declared_hours > shift_hours THEN
    NEW.declared_hours := shift_hours;
    NEW.capped := true;
  ELSE
    NEW.capped := false;
  END IF;

  NEW.amount := ROUND(NEW.declared_hours * rate, 2);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION private.compute_vehicle_claim_amount() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS tr_compute_vehicle_claim_amount ON public.time_entry_vehicle_claims;
CREATE TRIGGER tr_compute_vehicle_claim_amount
BEFORE INSERT OR UPDATE OF declared_hours ON public.time_entry_vehicle_claims
FOR EACH ROW EXECUTE FUNCTION private.compute_vehicle_claim_amount();

CREATE OR REPLACE FUNCTION private.set_vehicle_claim_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.set_vehicle_claim_updated_at() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER tr_vehicle_claim_updated_at
BEFORE UPDATE ON public.time_entry_vehicle_claims
FOR EACH ROW EXECUTE FUNCTION private.set_vehicle_claim_updated_at();

CREATE POLICY vehicle_claims_own ON public.time_entry_vehicle_claims
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = time_entry_vehicle_claims.contractor_id AND c.profile_id = auth.uid()));
CREATE POLICY vehicle_claims_insert_own ON public.time_entry_vehicle_claims
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = time_entry_vehicle_claims.contractor_id AND c.profile_id = auth.uid()));
CREATE POLICY vehicle_claims_admin ON public.time_entry_vehicle_claims
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY vehicle_claims_active_profile ON public.time_entry_vehicle_claims
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.active_profile_role() IS NOT NULL)
  WITH CHECK (private.active_profile_role() IS NOT NULL);

GRANT SELECT,INSERT ON public.time_entry_vehicle_claims TO authenticated;
GRANT UPDATE ON public.time_entry_vehicle_claims TO authenticated;

INSERT INTO storage.buckets (id, name, public) VALUES ('time-entry-photos', 'time-entry-photos', false)
  ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst,'reload schema';
COMMIT;
