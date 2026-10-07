-- Both assigned crew actors may record their own shifts. Retain every other input/costing/review guard.
-- New vehicle claims require two distinct uploaded objects; historical claims keep their saved evidence and amounts.
BEGIN;

CREATE OR REPLACE FUNCTION private.guard_time_entry_input()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE actor text:=private.active_profile_role(); i jsonb; newer jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.contractor_id::text,0));
 IF auth.uid() IS NOT NULL AND actor IS NULL THEN RAISE EXCEPTION 'Active account setup required' USING ERRCODE='42501'; END IF;
 IF actor='CONTRACTOR' AND NOT EXISTS(SELECT 1 FROM public.contractors WHERE id=NEW.contractor_id AND profile_id=auth.uid() AND is_deleted IS NOT TRUE) THEN
  RAISE EXCEPTION 'Active contractor required' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN NEW.calculation_version:='AGREEMENT'; END IF;
 IF NOT isfinite(NEW.clock_in_at) OR (NEW.clock_out_at IS NOT NULL AND NOT isfinite(NEW.clock_out_at)) THEN RAISE EXCEPTION 'Finite clock timestamps required' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND NEW.calculation_version IS DISTINCT FROM OLD.calculation_version THEN RAISE EXCEPTION 'Calculation version is server-owned' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' OR OLD.clock_out_at IS NULL THEN
  IF NEW.clock_out_at IS NOT NULL AND (NEW.clock_out_at<NEW.clock_in_at OR NEW.clock_out_at-NEW.clock_in_at>interval '24 hours') THEN
   RAISE EXCEPTION 'Invalid shift duration; full 16-hour days are allowed, up to 24 hours' USING ERRCODE='23514'; END IF;
  IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.time_entries t WHERE t.contractor_id=NEW.contractor_id AND t.is_deleted IS NOT TRUE AND (t.clock_out_at IS NULL OR t.clock_out_at>NEW.clock_in_at)) THEN
   RAISE EXCEPTION 'Overlapping or out-of-order shift; sync earlier shifts first' USING ERRCODE='23514'; END IF;
  IF NEW.ticket_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tickets WHERE id=NEW.ticket_id AND NEW.contractor_id IN (assigned_to,assigned_driver_id) AND storm_event_id=NEW.storm_event_id AND is_deleted IS NOT TRUE) THEN
   RAISE EXCEPTION 'Select an assigned ticket in this storm' USING ERRCODE='23514'; END IF;
  IF (NEW.calculation_version='AGREEMENT' OR NEW.work_type IN ('STANDARD_ASSESSMENT','EMERGENCY_RESPONSE')) AND NEW.ticket_id IS NULL THEN RAISE EXCEPTION 'Assigned ticket required' USING ERRCODE='23514'; END IF;
  IF TG_OP='INSERT' AND (NEW.clock_in_latitude IS NULL OR NEW.clock_in_longitude IS NULL OR NEW.clock_in_accuracy IS NULL OR NEW.clock_in_latitude NOT BETWEEN -90 AND 90 OR NEW.clock_in_longitude NOT BETWEEN -180 AND 180 OR NEW.clock_in_accuracy NOT BETWEEN 0 AND 100) THEN RAISE EXCEPTION 'Valid clock-in GPS required' USING ERRCODE='23514'; END IF;
  IF NEW.clock_out_at IS NOT NULL AND (NEW.clock_out_latitude IS NULL OR NEW.clock_out_longitude IS NULL OR NEW.clock_out_accuracy IS NULL OR NEW.clock_out_latitude NOT BETWEEN -90 AND 90 OR NEW.clock_out_longitude NOT BETWEEN -180 AND 180 OR NEW.clock_out_accuracy NOT BETWEEN 0 AND 100) THEN RAISE EXCEPTION 'Valid clock-out GPS required' USING ERRCODE='23514'; END IF;
  IF NEW.calculation_version='AGREEMENT' THEN
   PERFORM private.validate_time_intervals(NEW.activity_intervals,NEW.clock_in_at,NEW.clock_out_at);
   IF NEW.clock_in_photo_url IS NULL OR NEW.clock_in_photo_url NOT LIKE NEW.contractor_id::text||'/time-entries/'||NEW.id::text||'/%'
    OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='time-entry-photos' AND name=NEW.clock_in_photo_url) THEN
    RAISE EXCEPTION 'Upload the owned clock-in photo before recording the shift' USING ERRCODE='23514'; END IF;
   IF NEW.clock_out_at IS NOT NULL AND (NEW.clock_out_photo_url IS NULL OR NEW.clock_out_photo_url NOT LIKE NEW.contractor_id::text||'/time-entries/'||NEW.id::text||'/%'
    OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='time-entry-photos' AND name=NEW.clock_out_photo_url)) THEN
    RAISE EXCEPTION 'Upload the owned clock-out photo before closing the shift' USING ERRCODE='23514'; END IF;
   FOR i IN SELECT value FROM jsonb_array_elements(NEW.activity_intervals) WHERE value->>'kind'='VEHICLE_USE' LOOP
    SELECT terms INTO newer FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from<=(i->>'start_at')::timestamptz ORDER BY effective_from DESC LIMIT 1;
    IF newer IS NULL OR NOT (newer->>'driver_eligible')::boolean OR NOT (newer->>'vehicle_allowance_enabled')::boolean THEN
     RAISE EXCEPTION 'Vehicle use requires driver eligibility and enabled allowance' USING ERRCODE='23514'; END IF;
   END LOOP;
   IF TG_OP='UPDATE' THEN
    IF NEW.calculation_version<>OLD.calculation_version THEN RAISE EXCEPTION 'Calculation version is server-owned' USING ERRCODE='23514'; END IF;
    FOR i IN SELECT value FROM jsonb_array_elements(OLD.activity_intervals) LOOP
     SELECT value INTO newer FROM jsonb_array_elements(NEW.activity_intervals) WHERE value->>'id'=i->>'id';
     IF newer IS NULL OR (i->>'end_at' IS NOT NULL AND newer<>i) OR (i->>'end_at' IS NULL AND newer-'end_at'<>i-'end_at') THEN
      RAISE EXCEPTION 'Recorded activities are immutable except stopping an open interval' USING ERRCODE='23514'; END IF;
    END LOOP;
   END IF;
  ELSIF NEW.break_minutes NOT BETWEEN 0 AND 120 THEN RAISE EXCEPTION 'Invalid legacy break' USING ERRCODE='23514'; END IF;
 END IF;
 IF actor='CONTRACTOR' THEN
  IF TG_OP='INSERT' AND (NEW.status IS DISTINCT FROM 'PENDING' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL) THEN RAISE EXCEPTION 'New shifts await privileged review' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND ROW(NEW.contractor_id,NEW.ticket_id,NEW.storm_event_id,NEW.clock_in_at,NEW.work_type,NEW.status,NEW.reviewed_by,NEW.reviewed_at,NEW.rejection_reason,NEW.is_deleted)
   IS DISTINCT FROM ROW(OLD.contractor_id,OLD.ticket_id,OLD.storm_event_id,OLD.clock_in_at,OLD.work_type,OLD.status,OLD.reviewed_by,OLD.reviewed_at,OLD.rejection_reason,OLD.is_deleted) THEN RAISE EXCEPTION 'Assignment and review require privileged staff' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
  IF NEW.clock_out_at IS NULL OR NOT private.has_permission(auth.uid(),'admin.time.edit') THEN RAISE EXCEPTION 'Completed shift and privileged review required' USING ERRCODE='42501'; END IF;
  IF NEW.status NOT IN ('APPROVED','REJECTED') OR OLD.status<>'PENDING' OR (NEW.status='REJECTED' AND length(trim(coalesce(NEW.rejection_reason,'')))=0) THEN RAISE EXCEPTION 'Invalid review decision' USING ERRCODE='23514'; END IF;
  NEW.reviewed_by:=auth.uid(); NEW.reviewed_at:=clock_timestamp();
 END IF;
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
  rate numeric(10,2); shift_record public.time_entries;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.time_entries t
    WHERE t.id=NEW.time_entry_id AND t.contractor_id=NEW.contractor_id
      AND (t.contractor_role='DRIVER' OR t.vehicle_minutes>0)) THEN
    RAISE EXCEPTION 'Vehicle claim requires the same contractor and a driver shift';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.vehicle_photo_url IS NULL OR NEW.license_plate_photo_url IS NULL
       OR NEW.vehicle_photo_url NOT LIKE NEW.contractor_id::text||'/time-entries/'||NEW.time_entry_id::text||'/%'
       OR NEW.license_plate_photo_url NOT LIKE NEW.contractor_id::text||'/time-entries/'||NEW.time_entry_id::text||'/%' THEN
      RAISE EXCEPTION 'Vehicle photos must belong to this contractor shift';
    END IF;
    IF NEW.vehicle_photo_url = NEW.license_plate_photo_url THEN
      RAISE EXCEPTION 'Upload distinct vehicle and license-plate photos';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='time-entry-photos' AND name=NEW.vehicle_photo_url)
       OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='time-entry-photos' AND name=NEW.license_plate_photo_url) THEN
      RAISE EXCEPTION 'Upload both vehicle and license-plate photos before submitting the claim';
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
      IF private.active_profile_role() NOT IN ('SUPER_ADMIN','CEO') OR private.active_profile_role() IS NULL OR NOT private.has_permission(auth.uid(),'admin.payroll.edit') THEN
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
  SELECT * INTO shift_record FROM public.time_entries WHERE id=NEW.time_entry_id AND clock_out_at IS NOT NULL;
  IF shift_record.calculation_version='AGREEMENT' THEN
    shift_hours:=shift_record.vehicle_minutes/60;
    IF shift_hours IS NULL OR shift_hours<=0 THEN RAISE EXCEPTION 'Record vehicle-use intervals before claiming an allowance'; END IF;
    NEW.declared_hours:=shift_hours; NEW.amount:=shift_record.vehicle_allowance_amount; NEW.capped:=false;
    RETURN NEW;
  END IF;
  shift_hours:=greatest(extract(epoch FROM shift_record.clock_out_at-shift_record.clock_in_at)/3600-coalesce(shift_record.break_minutes,0)/60,0);
  rate:=shift_record.legacy_vehicle_rate_applied;
  IF rate IS NULL THEN RAISE EXCEPTION 'No historical vehicle allowance is configured'; END IF;
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

REVOKE ALL ON FUNCTION private.guard_time_entry_input(),private.compute_vehicle_claim_amount() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
