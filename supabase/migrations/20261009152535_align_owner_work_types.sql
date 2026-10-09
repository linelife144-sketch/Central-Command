-- Align work_type with the only operational types: Working, MOB, DE-MOB, Stand-by.
-- Existing dollars are remapped, not repriced. Emergency rows have no shifts and are archived.

BEGIN;

INSERT INTO public.audit_logs(action, entity_type, old_values, change_summary)
SELECT 'WORK_TYPES_ALIGNED', 'work_type', jsonb_build_object(
  'removed_role_rate_defaults', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.role_rate_defaults r WHERE r.work_type::text = 'EMERGENCY_RESPONSE'),
  'removed_utility_billing_rates', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.utility_billing_rates r WHERE r.work_type::text = 'EMERGENCY_RESPONSE'),
  'removed_contractor_rates', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.contractor_rates r WHERE r.work_type::text = 'EMERGENCY_RESPONSE'),
  'agreement_work_type_keys', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'work_type_rates', a.terms->'work_type_rates')), '[]'::jsonb) FROM public.contractor_pay_agreements a)
), 'Replaced retired work types with Working, MOB, DE-MOB, and Stand-by. Emergency rates archived; no shifts used them.';

-- The deferred storm rate-card trigger blocks ALTER TABLE in the same transaction.
ALTER TABLE public.utility_billing_rates DISABLE TRIGGER storm_bill_rate_card_complete;
ALTER TABLE public.utility_billing_rates DISABLE TRIGGER storm_bill_rate_guard;

DELETE FROM public.role_rate_defaults WHERE work_type::text = 'EMERGENCY_RESPONSE';
DELETE FROM public.utility_billing_rates WHERE work_type::text = 'EMERGENCY_RESPONSE';
DELETE FROM public.contractor_rates WHERE work_type::text = 'EMERGENCY_RESPONSE';

ALTER TABLE public.contractor_pay_agreements DISABLE TRIGGER USER;
UPDATE public.contractor_pay_agreements AS agreement
SET terms = jsonb_set(
  agreement.terms,
  '{work_type_rates}',
  (
    SELECT coalesce(jsonb_object_agg(mapped.label, mapped.rate), '{}'::jsonb)
    FROM (
      SELECT 'Working'::text AS label, agreement.terms->'work_type_rates'->'STANDARD_ASSESSMENT' AS rate
      UNION ALL SELECT 'MOB', agreement.terms->'work_type_rates'->'TRAVEL'
      UNION ALL SELECT 'DE-MOB', agreement.terms->'work_type_rates'->'TRAVEL'
      UNION ALL SELECT 'Stand-by', agreement.terms->'work_type_rates'->'STANDBY'
    ) AS mapped
    WHERE mapped.rate IS NOT NULL
  )
)
WHERE agreement.terms ? 'work_type_rates';
ALTER TABLE public.contractor_pay_agreements ENABLE TRIGGER USER;

ALTER TYPE public.work_type RENAME TO work_type_retired;
CREATE TYPE public.work_type AS ENUM ('Working', 'MOB', 'DE-MOB', 'Stand-by');

ALTER TABLE public.contractor_rates
  ALTER COLUMN work_type TYPE public.work_type
  USING (
    CASE work_type::text
      WHEN 'STANDARD_ASSESSMENT' THEN 'Working'
      WHEN 'TRAVEL' THEN 'DE-MOB'
      WHEN 'STANDBY' THEN 'Stand-by'
    END
  )::public.work_type;

ALTER TABLE public.role_rate_defaults
  ALTER COLUMN work_type TYPE public.work_type
  USING (
    CASE work_type::text
      WHEN 'STANDARD_ASSESSMENT' THEN 'Working'
      WHEN 'TRAVEL' THEN 'DE-MOB'
      WHEN 'STANDBY' THEN 'Stand-by'
    END
  )::public.work_type;

ALTER TABLE public.utility_billing_rates
  ALTER COLUMN work_type TYPE public.work_type
  USING (
    CASE work_type::text
      WHEN 'STANDARD_ASSESSMENT' THEN 'Working'
      WHEN 'TRAVEL' THEN 'DE-MOB'
      WHEN 'STANDBY' THEN 'Stand-by'
      ELSE NULL
    END
  )::public.work_type;

ALTER TABLE public.time_entries
  ALTER COLUMN work_type TYPE public.work_type
  USING (
    CASE work_type::text
      WHEN 'STANDARD_ASSESSMENT' THEN 'Working'
      WHEN 'TRAVEL' THEN 'DE-MOB'
      WHEN 'STANDBY' THEN 'Stand-by'
    END
  )::public.work_type;

DROP TYPE public.work_type_retired;

INSERT INTO public.role_rate_defaults (role, work_type, hourly_rate, currency, updated_at)
SELECT role, 'MOB'::public.work_type, hourly_rate, currency, now()
FROM public.role_rate_defaults
WHERE work_type = 'DE-MOB'
ON CONFLICT DO NOTHING;

INSERT INTO public.utility_billing_rates (storm_event_id, role, work_type, hourly_rate, currency, updated_at)
SELECT storm_event_id, role, 'MOB'::public.work_type, hourly_rate, currency, now()
FROM public.utility_billing_rates
WHERE work_type = 'DE-MOB';

ALTER TABLE public.utility_billing_rates ENABLE TRIGGER storm_bill_rate_guard;
ALTER TABLE public.utility_billing_rates ENABLE TRIGGER storm_bill_rate_card_complete;

CREATE OR REPLACE FUNCTION private.validate_compensation(p jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE t jsonb; prior numeric:=-1; rate numeric; wt text;
BEGIN
 IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR jsonb_typeof(p->'role') IS DISTINCT FROM 'string' OR p->>'role' NOT IN ('STORM_MANAGER','TEAM_LEAD','SR_DAMAGE_ASSESSER','DAMAGE_ASSESSER','DRIVER')
   OR NOT p ?& ARRAY['role','base_hourly_rate','work_type_rates','policy','driver_eligible','vehicle_allowance_enabled','vehicle_hourly_rate','week_start_day','timezone']
   OR (p->>'base_hourly_rate')::numeric NOT BETWEEN 0.01 AND 999999 OR jsonb_typeof(p->'base_hourly_rate')<>'number'
   OR jsonb_typeof(p->'work_type_rates')<>'object' OR jsonb_typeof(p->'driver_eligible')<>'boolean'
   OR jsonb_typeof(p->'vehicle_allowance_enabled')<>'boolean' OR jsonb_typeof(p->'vehicle_hourly_rate')<>'number'
   OR (p->>'vehicle_hourly_rate')::numeric NOT BETWEEN 0 AND 999999
   OR jsonb_typeof(p->'week_start_day') IS DISTINCT FROM 'number' OR (p->>'week_start_day')::numeric NOT BETWEEN 0 AND 6 OR trunc((p->>'week_start_day')::numeric)<>(p->>'week_start_day')::numeric
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p->>'timezone') THEN
  RAISE EXCEPTION 'Invalid compensation settings' USING ERRCODE='23514';
 END IF;
 IF round((p->>'base_hourly_rate')::numeric,2)<>(p->>'base_hourly_rate')::numeric OR round((p->>'vehicle_hourly_rate')::numeric,2)<>(p->>'vehicle_hourly_rate')::numeric THEN
  RAISE EXCEPTION 'Rates require at most two decimal places' USING ERRCODE='23514'; END IF;
 FOR wt,t IN SELECT key,value FROM jsonb_each(p->'work_type_rates') LOOP
  IF wt NOT IN ('Working','MOB','DE-MOB','Stand-by') OR jsonb_typeof(t)<>'number'
   OR t::numeric NOT BETWEEN 0.01 AND 999999 OR round(t::numeric,2)<>t::numeric THEN RAISE EXCEPTION 'Invalid work-type rate' USING ERRCODE='23514'; END IF;
 END LOOP;
 IF (p->>'vehicle_allowance_enabled')::boolean AND (NOT (p->>'driver_eligible')::boolean OR (p->>'vehicle_hourly_rate')::numeric<=0) THEN
  RAISE EXCEPTION 'Vehicle allowance requires driver eligibility and a positive rate' USING ERRCODE='23514'; END IF;
 IF p#>>'{policy,mode}'='FLAT' THEN
  IF jsonb_typeof(p#>'{policy,multiplier}') IS DISTINCT FROM 'number' OR (p#>>'{policy,multiplier}')::numeric NOT BETWEEN 0.000001 AND 100 THEN
   RAISE EXCEPTION 'Invalid flat multiplier' USING ERRCODE='23514'; END IF;
 ELSIF p#>>'{policy,mode}'='WEEKLY_TIERS' THEN
  IF jsonb_typeof(p#>'{policy,tiers}') IS DISTINCT FROM 'array' OR jsonb_array_length(p#>'{policy,tiers}') NOT BETWEEN 1 AND 10 THEN
   RAISE EXCEPTION 'Weekly tiers required' USING ERRCODE='23514'; END IF;
  FOR t IN SELECT value FROM jsonb_array_elements(p#>'{policy,tiers}') LOOP
   IF jsonb_typeof(t->'after_hours') IS DISTINCT FROM 'number' OR jsonb_typeof(t->'multiplier') IS DISTINCT FROM 'number'
    OR (t->>'after_hours')::numeric NOT BETWEEN 0 AND 168 OR (t->>'after_hours')::numeric<=prior
    OR (prior=-1 AND (t->>'after_hours')::numeric<>0) OR (t->>'multiplier')::numeric NOT BETWEEN 0.000001 AND 100 THEN
    RAISE EXCEPTION 'Weekly tiers must start at zero and increase' USING ERRCODE='23514'; END IF;
   prior:=(t->>'after_hours')::numeric;
  END LOOP;
 ELSE RAISE EXCEPTION 'Select a pay policy' USING ERRCODE='23514'; END IF;
END $function$;

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
  IF (NEW.calculation_version='AGREEMENT' OR NEW.work_type = 'Working') AND NEW.ticket_id IS NULL THEN RAISE EXCEPTION 'Assigned ticket required' USING ERRCODE='23514'; END IF;
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

NOTIFY pgrst, 'reload schema';
COMMIT;
