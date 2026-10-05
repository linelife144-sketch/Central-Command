BEGIN;

CREATE TYPE contractor_role AS ENUM (
  'STORM_MANAGER','TEAM_LEAD','SR_DAMAGE_ASSESSER','DAMAGE_ASSESSER','DRIVER');

ALTER TABLE public.contractors
  ADD COLUMN role contractor_role NOT NULL DEFAULT 'DAMAGE_ASSESSER';

CREATE TABLE public.role_rate_defaults (
  role contractor_role NOT NULL,
  work_type work_type NOT NULL,
  hourly_rate numeric(10,2) NOT NULL CHECK (hourly_rate >= 0),
  currency varchar(3) NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  PRIMARY KEY (role, work_type)
);
ALTER TABLE public.role_rate_defaults ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.utility_billing_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id uuid REFERENCES public.storm_events(id) ON DELETE CASCADE,
  work_type work_type NOT NULL,
  hourly_rate numeric(10,2) NOT NULL CHECK (hourly_rate >= 0),
  currency varchar(3) NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.utility_billing_rates ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX utility_billing_rates_global_uk
  ON public.utility_billing_rates (work_type) WHERE storm_event_id IS NULL;
CREATE UNIQUE INDEX utility_billing_rates_storm_uk
  ON public.utility_billing_rates (storm_event_id, work_type) WHERE storm_event_id IS NOT NULL;

-- Starting placeholder rates — admin is expected to overwrite via RoleRateEditor.
INSERT INTO public.role_rate_defaults (role, work_type, hourly_rate) VALUES
  ('STORM_MANAGER','STANDARD_ASSESSMENT',115),('STORM_MANAGER','EMERGENCY_RESPONSE',150),
  ('STORM_MANAGER','TRAVEL',65),('STORM_MANAGER','STANDBY',55),('STORM_MANAGER','ADMIN',75),('STORM_MANAGER','TRAINING',50),
  ('TEAM_LEAD','STANDARD_ASSESSMENT',105),('TEAM_LEAD','EMERGENCY_RESPONSE',140),
  ('TEAM_LEAD','TRAVEL',60),('TEAM_LEAD','STANDBY',50),('TEAM_LEAD','ADMIN',70),('TEAM_LEAD','TRAINING',45),
  ('SR_DAMAGE_ASSESSER','STANDARD_ASSESSMENT',95),('SR_DAMAGE_ASSESSER','EMERGENCY_RESPONSE',135),
  ('SR_DAMAGE_ASSESSER','TRAVEL',55),('SR_DAMAGE_ASSESSER','STANDBY',45),('SR_DAMAGE_ASSESSER','ADMIN',65),('SR_DAMAGE_ASSESSER','TRAINING',40),
  ('DAMAGE_ASSESSER','STANDARD_ASSESSMENT',85),('DAMAGE_ASSESSER','EMERGENCY_RESPONSE',120),
  ('DAMAGE_ASSESSER','TRAVEL',50),('DAMAGE_ASSESSER','STANDBY',40),('DAMAGE_ASSESSER','ADMIN',55),('DAMAGE_ASSESSER','TRAINING',35),
  ('DRIVER','STANDARD_ASSESSMENT',65),('DRIVER','EMERGENCY_RESPONSE',90),
  ('DRIVER','TRAVEL',45),('DRIVER','STANDBY',35),('DRIVER','ADMIN',45),('DRIVER','TRAINING',30)
ON CONFLICT DO NOTHING;

ALTER TABLE public.time_entries
  ADD COLUMN contractor_role contractor_role,
  ADD COLUMN pay_rate_applied numeric(10,2),
  ADD COLUMN payroll_amount numeric(12,2),
  ADD COLUMN utility_bill_rate_applied numeric(10,2),
  ADD COLUMN utility_bill_amount numeric(12,2);

CREATE INDEX idx_time_entries_role ON public.time_entries(contractor_role);
CREATE INDEX idx_time_entries_payroll ON public.time_entries(clock_in_at, contractor_id)
  WHERE is_deleted IS NOT TRUE;

CREATE OR REPLACE FUNCTION private.apply_time_entry_costing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  mins numeric;
  c_role public.contractor_role;
  bill_rate numeric(10,2);
  pay_rate numeric(10,2);
BEGIN
  SELECT role INTO c_role FROM public.contractors
    WHERE id = NEW.contractor_id AND is_deleted IS NOT TRUE;

  SELECT r.hourly_rate INTO pay_rate FROM public.contractor_rates r
   WHERE r.contractor_id = NEW.contractor_id AND r.work_type = NEW.work_type
     AND r.effective_from <= (NEW.clock_in_at)::date
     AND (r.effective_to IS NULL OR r.effective_to >= (NEW.clock_in_at)::date)
   ORDER BY r.effective_from DESC LIMIT 1;
  IF pay_rate IS NULL THEN
    SELECT hourly_rate INTO pay_rate FROM public.role_rate_defaults
     WHERE role = c_role AND work_type = NEW.work_type;
  END IF;
  IF pay_rate IS NULL THEN
    RAISE EXCEPTION 'No wage configured for role % and work type %. Assign a rate before clocking in.', c_role, NEW.work_type;
  END IF;

  NEW.contractor_role  := c_role;
  NEW.work_type_rate   := pay_rate;
  NEW.pay_rate_applied := pay_rate;

  mins := GREATEST(EXTRACT(epoch FROM (COALESCE(NEW.clock_out_at, NEW.clock_in_at) - NEW.clock_in_at))/60.0
                    - COALESCE(NEW.break_minutes, 0), 0);

  SELECT hourly_rate INTO bill_rate FROM public.utility_billing_rates
   WHERE work_type = NEW.work_type
     AND (storm_event_id = NEW.storm_event_id OR storm_event_id IS NULL)
   ORDER BY (storm_event_id IS NOT NULL) DESC LIMIT 1;

  NEW.payroll_amount            := ROUND((mins/60.0) * pay_rate, 2);
  NEW.utility_bill_rate_applied := bill_rate;
  NEW.utility_bill_amount       := CASE WHEN bill_rate IS NULL THEN NULL
                                        ELSE ROUND((mins/60.0) * bill_rate, 2) END;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION private.apply_time_entry_costing() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS tr_apply_time_entry_costing ON public.time_entries;
CREATE TRIGGER tr_apply_time_entry_costing
BEFORE INSERT OR UPDATE OF clock_in_at, clock_out_at, break_minutes, work_type, contractor_id, storm_event_id
ON public.time_entries FOR EACH ROW EXECUTE FUNCTION private.apply_time_entry_costing();

-- Guard extension: a contractor cannot grant themselves a different wage tier.
CREATE OR REPLACE FUNCTION private.guard_contractor_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF current_user='authenticated' AND NOT public.is_admin() AND
    (NEW.profile_id IS DISTINCT FROM OLD.profile_id OR NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status OR
     NEW.is_eligible_for_assignment IS DISTINCT FROM OLD.is_eligible_for_assignment OR NEW.approved_by IS DISTINCT FROM OLD.approved_by OR
     NEW.approved_at IS DISTINCT FROM OLD.approved_at OR NEW.eligibility_reason IS DISTINCT FROM OLD.eligibility_reason OR
     NEW.role IS DISTINCT FROM OLD.role) THEN
    RAISE EXCEPTION 'Only authorized administrators can approve contractor eligibility';
  END IF;
  RETURN NEW;
END $function$;

CREATE POLICY role_rate_defaults_select ON public.role_rate_defaults
  FOR SELECT USING (true);
CREATE POLICY role_rate_defaults_admin_write ON public.role_rate_defaults
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY role_rate_defaults_admin_update ON public.role_rate_defaults
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY role_rate_defaults_admin_delete ON public.role_rate_defaults
  FOR DELETE USING (public.is_admin());

CREATE POLICY utility_billing_rates_select ON public.utility_billing_rates
  FOR SELECT USING (true);
CREATE POLICY utility_billing_rates_admin_write ON public.utility_billing_rates
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY utility_billing_rates_admin_update ON public.utility_billing_rates
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY utility_billing_rates_admin_delete ON public.utility_billing_rates
  FOR DELETE USING (public.is_admin());

CREATE POLICY role_rate_defaults_active_profile ON public.role_rate_defaults
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.active_profile_role() IS NOT NULL)
  WITH CHECK (private.active_profile_role() IS NOT NULL);
CREATE POLICY utility_billing_rates_active_profile ON public.utility_billing_rates
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (private.active_profile_role() IS NOT NULL)
  WITH CHECK (private.active_profile_role() IS NOT NULL);

GRANT SELECT ON public.role_rate_defaults, public.utility_billing_rates TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.role_rate_defaults, public.utility_billing_rates TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
