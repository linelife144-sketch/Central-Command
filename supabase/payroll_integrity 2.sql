-- Payroll integrity repair approved by the user on 2026-10-03.
-- Contains no grants or role promotions. Deployment is recorded in the plan.
BEGIN;
CREATE OR REPLACE FUNCTION private.apply_time_entry_costing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  mins numeric;
  c_role public.contractor_role;
  bill_rate numeric(10,2);
  pay_rate numeric(10,2);
BEGIN
  -- Review updates must never resolve today's rates over a closed shift.
  IF TG_OP='UPDATE' AND OLD.clock_out_at IS NOT NULL THEN
    IF ROW(NEW.contractor_id,NEW.storm_event_id,NEW.clock_in_at,NEW.clock_out_at,NEW.work_type,NEW.break_minutes)
       IS DISTINCT FROM ROW(OLD.contractor_id,OLD.storm_event_id,OLD.clock_in_at,OLD.clock_out_at,OLD.work_type,OLD.break_minutes) THEN
      RAISE EXCEPTION 'Closed shift time and costing inputs are immutable';
    END IF;
    NEW.contractor_role := OLD.contractor_role;
    NEW.work_type_rate := OLD.work_type_rate;
    NEW.pay_rate_applied := OLD.pay_rate_applied;
    NEW.payroll_amount := OLD.payroll_amount;
    NEW.utility_bill_rate_applied := OLD.utility_bill_rate_applied;
    NEW.utility_bill_amount := OLD.utility_bill_amount;
    RETURN NEW;
  END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION private.compute_vehicle_claim_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  shift_hours numeric;
  rate numeric(10,2) := 5.00;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.time_entries t
    WHERE t.id=NEW.time_entry_id AND t.contractor_id=NEW.contractor_id
      AND t.contractor_role='DRIVER') THEN
    RAISE EXCEPTION 'Vehicle claim requires the same contractor and a driver shift';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.vehicle_photo_url NOT LIKE NEW.contractor_id::text||'/time-entries/'||NEW.time_entry_id::text||'/%'
       OR NEW.license_plate_photo_url NOT LIKE NEW.contractor_id::text||'/time-entries/'||NEW.time_entry_id::text||'/%' THEN
      RAISE EXCEPTION 'Vehicle photos must belong to this contractor shift';
    END IF;
    IF NEW.status <> 'PENDING' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL OR NEW.rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'New vehicle claims must await administrator review';
    END IF;
  ELSE
    IF ROW(NEW.time_entry_id,NEW.contractor_id,NEW.vehicle_type,NEW.declared_hours,NEW.notes,NEW.vehicle_photo_url,NEW.license_plate_photo_url)
       IS DISTINCT FROM ROW(OLD.time_entry_id,OLD.contractor_id,OLD.vehicle_type,OLD.declared_hours,OLD.notes,OLD.vehicle_photo_url,OLD.license_plate_photo_url) THEN
      RAISE EXCEPTION 'Submitted vehicle claim details are immutable';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF private.active_profile_role() NOT IN ('ADMIN','SUPER_ADMIN','CEO') OR private.active_profile_role() IS NULL THEN
        RAISE EXCEPTION 'Administrator review required';
      END IF;
      IF OLD.status <> 'PENDING' OR NEW.status NOT IN ('APPROVED','REJECTED') THEN
        RAISE EXCEPTION 'Vehicle claim has already been reviewed';
      END IF;
      IF NEW.status='REJECTED' AND length(trim(coalesce(NEW.rejection_reason,'')))=0 THEN
        RAISE EXCEPTION 'Rejection reason required';
      END IF;
      NEW.reviewed_by := auth.uid();
      NEW.reviewed_at := clock_timestamp();
    ELSE
      NEW.reviewed_by := OLD.reviewed_by;
      NEW.reviewed_at := OLD.reviewed_at;
      NEW.rejection_reason := OLD.rejection_reason;
    END IF;
    NEW.amount := OLD.amount;
    NEW.capped := OLD.capped;
    RETURN NEW;
  END IF;
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
END $function$;

-- Both guards must run on review and snapshot-only updates as well as hours.
-- The previous UPDATE OF lists skipped status, amount, and reviewer changes.
DROP TRIGGER IF EXISTS tr_apply_time_entry_costing ON public.time_entries;
CREATE TRIGGER tr_apply_time_entry_costing
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION private.apply_time_entry_costing();

DROP TRIGGER IF EXISTS tr_compute_vehicle_claim_amount ON public.time_entry_vehicle_claims;
CREATE TRIGGER tr_compute_vehicle_claim_amount
  BEFORE INSERT OR UPDATE ON public.time_entry_vehicle_claims
  FOR EACH ROW EXECUTE FUNCTION private.compute_vehicle_claim_amount();

COMMIT;
