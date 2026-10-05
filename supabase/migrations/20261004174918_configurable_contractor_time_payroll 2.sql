-- Configurable contractor time/payroll. Supersedes the unapplied fixed-weekly proposal.
BEGIN;
CREATE TABLE public.payroll_configuration (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), flat_multiplier numeric NOT NULL CHECK(flat_multiplier>0),
 week_start_day integer NOT NULL CHECK(week_start_day BETWEEN 0 AND 6), timezone text NOT NULL,
 legacy_vehicle_hourly_rate numeric NOT NULL CHECK(legacy_vehicle_hourly_rate>=0), multiplier_options jsonb NOT NULL
);
-- Migration seeds preserve the previous explicit defaults. Runtime logic reads saved data.
INSERT INTO public.payroll_configuration VALUES(true,1,1,'America/Chicago',5,
 '[{"label":"Straight time","value":1},{"label":"Time and a half","value":1.5},{"label":"Double time","value":2}]');
ALTER TABLE public.payroll_configuration ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payroll_configuration FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON public.payroll_configuration TO authenticated;
GRANT ALL ON public.payroll_configuration TO service_role;
CREATE POLICY payroll_config_read ON public.payroll_configuration FOR SELECT TO authenticated USING(auth.uid() IS NOT NULL);
CREATE POLICY payroll_config_write ON public.payroll_configuration FOR UPDATE TO authenticated
 USING(private.active_profile_role() IN ('CEO','SUPER_ADMIN')) WITH CHECK(private.active_profile_role() IN ('CEO','SUPER_ADMIN'));

CREATE TABLE public.contractor_pay_agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contractor_id uuid NOT NULL REFERENCES public.contractors(id),
 effective_from timestamptz NOT NULL, terms jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), created_by uuid REFERENCES public.profiles(id),
 UNIQUE(contractor_id,effective_from)
);
CREATE INDEX contractor_agreement_lookup ON public.contractor_pay_agreements(contractor_id,effective_from DESC);
ALTER TABLE public.contractor_pay_agreements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contractor_pay_agreements FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.contractor_pay_agreements TO authenticated;
GRANT ALL ON public.contractor_pay_agreements TO service_role;
CREATE POLICY agreement_read ON public.contractor_pay_agreements FOR SELECT TO authenticated
 USING(private.has_permission(auth.uid(),'admin.contractors.view') OR contractor_id IN(SELECT id FROM public.contractors WHERE profile_id=auth.uid()));
CREATE POLICY agreement_create ON public.contractor_pay_agreements FOR INSERT TO authenticated
 WITH CHECK(private.has_permission(auth.uid(),'admin.payroll.edit'));

CREATE FUNCTION private.validate_compensation(p jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
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
  IF wt NOT IN ('STANDARD_ASSESSMENT','EMERGENCY_RESPONSE','TRAVEL','STANDBY','ADMIN','TRAINING') OR jsonb_typeof(t)<>'number'
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
END $$;
REVOKE ALL ON FUNCTION private.validate_compensation(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.validate_compensation(jsonb) TO service_role;

CREATE FUNCTION private.pay_week_start(at_time timestamptz,p jsonb) RETURNS timestamptz LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT (date_trunc('day',at_time AT TIME ZONE (p->>'timezone'))-
  (((extract(dow FROM at_time AT TIME ZONE (p->>'timezone'))::integer-(p->>'week_start_day')::integer+7)%7)*interval '1 day')) AT TIME ZONE (p->>'timezone');
$$;
CREATE FUNCTION private.guard_pay_agreement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous jsonb; actor_id uuid:=auth.uid(); actor text;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Pay agreements are immutable; create a new effective version' USING ERRCODE='23514'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.contractor_id::text,0));
 IF actor_id IS NULL AND current_setting('role',true)='service_role' THEN actor_id:=NEW.created_by; END IF;
 SELECT role::text INTO actor FROM public.profiles WHERE id=actor_id;
 IF actor_id IS NULL OR actor NOT IN ('CEO','SUPER_ADMIN') OR NOT private.has_permission(actor_id,'admin.payroll.edit') THEN
  RAISE EXCEPTION 'Privileged payroll editing required' USING ERRCODE='42501'; END IF;
 PERFORM private.validate_compensation(NEW.terms);
 IF NOT isfinite(NEW.effective_from) OR NEW.effective_from<clock_timestamp()-interval '1 minute' OR EXISTS(SELECT 1 FROM public.time_entries WHERE contractor_id=NEW.contractor_id AND clock_out_at>=NEW.effective_from) THEN
  RAISE EXCEPTION 'Use a current or future effective time outside closed payroll' USING ERRCODE='23514'; END IF;
 SELECT terms INTO previous FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from<NEW.effective_from ORDER BY effective_from DESC LIMIT 1;
 IF previous IS NOT NULL AND ROW(previous->>'timezone',previous->>'week_start_day') IS DISTINCT FROM ROW(NEW.terms->>'timezone',NEW.terms->>'week_start_day') THEN
  IF private.pay_week_start(NEW.effective_from,previous)<>NEW.effective_from THEN
   RAISE EXCEPTION 'Workweek changes require the current workweek boundary' USING ERRCODE='23514'; END IF;
 END IF;
 NEW.created_by:=actor_id; NEW.created_at:=clock_timestamp();
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
 VALUES('PAY_AGREEMENT_CREATED','contractor',NEW.contractor_id,actor_id,actor::public.user_role,previous,to_jsonb(NEW),'Effective contractor pay agreement saved');
 RETURN NEW;
END $$;

-- Backfill forward-use agreements before the immutable/audit guard is installed.
-- Existing money snapshots are not recalculated. Missing wages remain blocked.
INSERT INTO public.contractor_pay_agreements(contractor_id,effective_from,terms)
 SELECT c.id,clock_timestamp(),jsonb_build_object('role',c.role,'base_hourly_rate',r.rates->>'STANDARD_ASSESSMENT',
 'work_type_rates',r.rates,'policy',jsonb_build_object('mode','FLAT','multiplier',cfg.flat_multiplier),
 'driver_eligible',c.role::text='DRIVER','vehicle_allowance_enabled',c.role::text='DRIVER',
 'vehicle_hourly_rate',CASE WHEN c.role::text='DRIVER' THEN cfg.legacy_vehicle_hourly_rate ELSE 0 END,
 'week_start_day',cfg.week_start_day,'timezone',cfg.timezone)
 FROM public.contractors c CROSS JOIN public.payroll_configuration cfg CROSS JOIN LATERAL (
 SELECT jsonb_object_agg(w.work_type,coalesce((SELECT cr.hourly_rate FROM public.contractor_rates cr WHERE cr.contractor_id=c.id AND cr.work_type=w.work_type AND cr.effective_from<=current_date AND (cr.effective_to IS NULL OR cr.effective_to>=current_date) ORDER BY cr.effective_from DESC LIMIT 1),w.hourly_rate)) rates
 FROM public.role_rate_defaults w WHERE w.role=c.role) r WHERE c.is_deleted IS NOT TRUE AND (r.rates->>'STANDARD_ASSESSMENT')::numeric>0;
-- Ensure JSON wages are numbers, not strings from ->> during the legacy seed.
UPDATE public.contractor_pay_agreements SET terms=jsonb_set(terms,'{base_hourly_rate}',to_jsonb((terms->>'base_hourly_rate')::numeric));
CREATE TRIGGER agreement_immutable BEFORE INSERT OR UPDATE OR DELETE ON public.contractor_pay_agreements FOR EACH ROW EXECUTE FUNCTION private.guard_pay_agreement();

ALTER TABLE public.time_entries
 ADD COLUMN calculation_version text NOT NULL DEFAULT 'LEGACY',
 ADD COLUMN activity_intervals jsonb NOT NULL DEFAULT '[]',
 ADD COLUMN pay_segments jsonb NOT NULL DEFAULT '[]',
 ADD COLUMN legacy_vehicle_rate_applied numeric DEFAULT 5,
 ADD COLUMN paid_minutes_exact numeric,
 ADD COLUMN vehicle_minutes numeric,
 ADD COLUMN vehicle_allowance_amount numeric(12,2),
 ADD COLUMN regular_minutes numeric, ADD COLUMN overtime_minutes numeric,
 ADD COLUMN regular_pay_amount numeric(12,2), ADD COLUMN overtime_pay_amount numeric(12,2),
 ADD COLUMN overtime_rate_applied numeric, ADD COLUMN weekly_allocations jsonb NOT NULL DEFAULT '[]';
-- A migration-only constant seeds the previous allowance without firing UPDATE triggers
-- or changing any closed record timestamp. New entries use agreement intervals.
ALTER TABLE public.time_entries ALTER COLUMN legacy_vehicle_rate_applied DROP DEFAULT;
CREATE UNIQUE INDEX time_entries_one_open_per_worker ON public.time_entries(contractor_id) WHERE clock_out_at IS NULL AND is_deleted IS NOT TRUE;
CREATE INDEX time_entries_worker_closed_clock ON public.time_entries(contractor_id,clock_out_at) WHERE clock_out_at IS NOT NULL;
-- Restrictive policies compose with existing permissive module permissions.
CREATE POLICY worker_time_isolation ON public.time_entries AS RESTRICTIVE FOR ALL TO authenticated
 USING (private.active_profile_role() <> 'CONTRACTOR' OR contractor_id IN (SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid())))
 WITH CHECK (private.active_profile_role() <> 'CONTRACTOR' OR contractor_id IN (SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid())));
CREATE POLICY worker_ticket_isolation ON public.tickets AS RESTRICTIVE FOR ALL TO authenticated
 USING (private.active_profile_role() <> 'CONTRACTOR' OR assigned_to IN (SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid())))
 WITH CHECK (private.active_profile_role() <> 'CONTRACTOR' OR assigned_to IN (SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid())));
CREATE POLICY worker_ticket_no_create ON public.tickets AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (private.active_profile_role() <> 'CONTRACTOR');
CREATE POLICY worker_ticket_no_delete ON public.tickets AS RESTRICTIVE FOR DELETE TO authenticated
 USING (private.active_profile_role() <> 'CONTRACTOR');
CREATE POLICY worker_time_no_delete ON public.time_entries AS RESTRICTIVE FOR DELETE TO authenticated
 USING (private.active_profile_role() <> 'CONTRACTOR');


-- Role ceiling is enforced before permission overrides are consulted.
CREATE OR REPLACE FUNCTION private.has_permission(p_profile_id uuid,p_key text) RETURNS boolean
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r text; active boolean; def boolean; privileged boolean; effect text; permitted boolean;
BEGIN
 SELECT role::text,(is_active AND NOT must_reset_password) INTO r,active FROM public.profiles WHERE id=p_profile_id;
 IF NOT coalesce(active,false) OR r NOT IN ('CEO','SUPER_ADMIN','ADMIN') OR (r='ADMIN' AND p_key LIKE '%.edit') THEN RETURN false; END IF;
 SELECT admin_default,c.privileged INTO def,privileged FROM private.permission_catalog c WHERE permission_key=p_key;
 IF NOT FOUND OR (privileged AND r NOT IN ('CEO','SUPER_ADMIN')) THEN RETURN false; END IF;
 SELECT u.effect INTO effect FROM public.user_permissions u WHERE profile_id=p_profile_id AND permission_key=p_key;
 permitted:=CASE WHEN effect IS NOT NULL THEN effect='allow' WHEN r IN ('CEO','SUPER_ADMIN') THEN true ELSE def END;
 IF p_key LIKE '%.edit' THEN permitted:=permitted AND private.has_permission(p_profile_id,regexp_replace(p_key,'\.edit$','.view')); END IF;
 RETURN coalesce(permitted,false);
END $$;
UPDATE private.permission_catalog SET admin_default=false WHERE permission_key LIKE '%.edit';

-- A restrictive write ceiling also covers older permissive role policies.
DO $ceiling$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND tablename NOT IN ('profiles','user_permissions','user_permission_versions','payroll_configuration','contractor_pay_agreements') LOOP
  EXECUTE format('CREATE POLICY payroll_admin_no_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (private.active_profile_role() IS DISTINCT FROM %L)',t,'ADMIN');
  EXECUTE format('CREATE POLICY payroll_admin_no_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (private.active_profile_role() IS DISTINCT FROM %L) WITH CHECK (private.active_profile_role() IS DISTINCT FROM %L)',t,'ADMIN','ADMIN');
  EXECUTE format('CREATE POLICY payroll_admin_no_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (private.active_profile_role() IS DISTINCT FROM %L)',t,'ADMIN');
 END LOOP;
END $ceiling$;
CREATE POLICY admin_profile_no_update ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(private.active_profile_role() IS DISTINCT FROM 'ADMIN') WITH CHECK(private.active_profile_role() IS DISTINCT FROM 'ADMIN');

CREATE FUNCTION private.validate_time_intervals(p jsonb,shift_start timestamptz,shift_end timestamptz) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE i jsonb; s timestamptz; e timestamptz;
BEGIN
 IF jsonb_typeof(p) IS DISTINCT FROM 'array' OR jsonb_array_length(p)>1000 THEN RAISE EXCEPTION 'Invalid time intervals' USING ERRCODE='23514'; END IF;
 FOR i IN SELECT value FROM jsonb_array_elements(p) LOOP
  s:=(i->>'start_at')::timestamptz; e:=(i->>'end_at')::timestamptz;
  IF jsonb_typeof(i->'kind') IS DISTINCT FROM 'string' OR i->>'kind' NOT IN ('BREAK','VEHICLE_USE') OR NOT i ?& ARRAY['id','kind','start_at','end_at'] OR (i->>'id')::uuid IS NULL OR s IS NULL OR NOT isfinite(s) OR (e IS NOT NULL AND NOT isfinite(e))
   OR s<shift_start OR s>coalesce(shift_end,clock_timestamp()+interval '1 minute') OR e<s OR e>coalesce(shift_end,clock_timestamp()+interval '1 minute') OR (shift_end IS NOT NULL AND e IS NULL) THEN
   RAISE EXCEPTION 'Intervals must be within their shift and ordered' USING ERRCODE='23514'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p) a JOIN jsonb_array_elements(p) b ON a->>'id'<b->>'id'
 WHERE tstzrange((a->>'start_at')::timestamptz,(a->>'end_at')::timestamptz,'[)') && tstzrange((b->>'start_at')::timestamptz,(b->>'end_at')::timestamptz,'[)'))
 OR (SELECT count(*) FROM jsonb_array_elements(p))<>(SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p)) THEN
  RAISE EXCEPTION 'Time intervals cannot overlap or duplicate IDs' USING ERRCODE='23514'; END IF;
END $$;

CREATE OR REPLACE FUNCTION private.guard_time_entry_input() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor text:=private.active_profile_role(); i jsonb; newer jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.contractor_id::text,0));
 IF auth.uid() IS NOT NULL AND actor IS NULL THEN RAISE EXCEPTION 'Active account setup required' USING ERRCODE='42501'; END IF;
 IF actor='CONTRACTOR' AND NOT EXISTS(SELECT 1 FROM public.contractors WHERE id=NEW.contractor_id AND profile_id=auth.uid() AND is_eligible_for_assignment AND onboarding_status::text='APPROVED' AND is_deleted IS NOT TRUE) THEN
  RAISE EXCEPTION 'Approved eligible contractor required' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN NEW.calculation_version:='AGREEMENT'; END IF;
 IF NOT isfinite(NEW.clock_in_at) OR (NEW.clock_out_at IS NOT NULL AND NOT isfinite(NEW.clock_out_at)) THEN RAISE EXCEPTION 'Finite clock timestamps required' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND NEW.calculation_version IS DISTINCT FROM OLD.calculation_version THEN RAISE EXCEPTION 'Calculation version is server-owned' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' OR OLD.clock_out_at IS NULL THEN
  IF NEW.clock_out_at IS NOT NULL AND (NEW.clock_out_at<NEW.clock_in_at OR NEW.clock_out_at-NEW.clock_in_at>interval '24 hours') THEN
   RAISE EXCEPTION 'Invalid shift duration; full 16-hour days are allowed, up to 24 hours' USING ERRCODE='23514'; END IF;
  IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.time_entries t WHERE t.contractor_id=NEW.contractor_id AND t.is_deleted IS NOT TRUE AND (t.clock_out_at IS NULL OR t.clock_out_at>NEW.clock_in_at)) THEN
   RAISE EXCEPTION 'Overlapping or out-of-order shift; sync earlier shifts first' USING ERRCODE='23514'; END IF;
  IF NEW.ticket_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tickets WHERE id=NEW.ticket_id AND assigned_to=NEW.contractor_id AND storm_event_id=NEW.storm_event_id AND is_deleted IS NOT TRUE) THEN
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
END $$;
CREATE TRIGGER aa_guard_time_entry_input BEFORE INSERT OR UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION private.guard_time_entry_input();

CREATE FUNCTION private.paid_seconds(s timestamptz,e timestamptz,activities jsonb,lo timestamptz,hi timestamptz) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT greatest(0,extract(epoch FROM least(e,hi)-greatest(s,lo))-coalesce((SELECT sum(greatest(0,extract(epoch FROM least((i->>'end_at')::timestamptz,hi,e)-greatest((i->>'start_at')::timestamptz,lo,s)))) FROM jsonb_array_elements(activities) i WHERE i->>'kind'='BREAK'),0));
$$;

CREATE OR REPLACE FUNCTION private.apply_time_entry_costing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.contractor_pay_agreements; p jsonb; tier jsonb; cursor_at timestamptz; finish timestamptz; next_change timestamptz;
 week_at timestamptz; week_end timestamptz; prior_seconds numeric; local_seconds numeric; segment_seconds numeric;
 base_rate numeric; mult numeric; first_mult numeric; threshold numeric; amount numeric; vehicle_seconds numeric; vehicle_rate numeric;
 sum_wage numeric:=0; sum_vehicle numeric:=0; regular_sum numeric:=0; elapsed numeric; legacy_rate numeric;
BEGIN
 IF TG_OP='UPDATE' AND OLD.clock_out_at IS NOT NULL THEN
  IF ROW(NEW.contractor_id,NEW.ticket_id,NEW.storm_event_id,NEW.clock_in_at,NEW.clock_out_at,NEW.work_type,NEW.break_minutes,NEW.is_deleted,NEW.activity_intervals,NEW.calculation_version)
   IS DISTINCT FROM ROW(OLD.contractor_id,OLD.ticket_id,OLD.storm_event_id,OLD.clock_in_at,OLD.clock_out_at,OLD.work_type,OLD.break_minutes,OLD.is_deleted,OLD.activity_intervals,OLD.calculation_version) THEN RAISE EXCEPTION 'Closed shift inputs are immutable' USING ERRCODE='23514'; END IF;
  NEW:=jsonb_populate_record(NEW,(SELECT jsonb_object_agg(key,value) FROM jsonb_each(to_jsonb(OLD)) WHERE key=ANY(ARRAY['contractor_role','work_type_rate','pay_rate_applied','payroll_amount','utility_bill_rate_applied','utility_bill_amount','regular_minutes','overtime_minutes','regular_pay_amount','overtime_pay_amount','overtime_rate_applied','weekly_allocations','paid_minutes_exact','pay_segments','vehicle_minutes','vehicle_allowance_amount','legacy_vehicle_rate_applied'])));
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' THEN NEW.utility_bill_rate_applied:=OLD.utility_bill_rate_applied; ELSE
  SELECT hourly_rate INTO NEW.utility_bill_rate_applied FROM public.utility_billing_rates WHERE work_type=NEW.work_type AND (storm_event_id=NEW.storm_event_id OR storm_event_id IS NULL) ORDER BY (storm_event_id IS NOT NULL) DESC LIMIT 1;
 END IF;
 IF NEW.calculation_version='AGREEMENT' AND NEW.utility_bill_rate_applied IS NULL THEN RAISE EXCEPTION 'Time configuration is incomplete; contact a Super Admin' USING ERRCODE='23514'; END IF;
 IF NEW.calculation_version='LEGACY' THEN
  NEW.pay_rate_applied:=OLD.pay_rate_applied; NEW.work_type_rate:=OLD.work_type_rate; NEW.contractor_role:=OLD.contractor_role;
  NEW.payroll_amount:=round(greatest(0,extract(epoch FROM coalesce(NEW.clock_out_at,NEW.clock_in_at)-NEW.clock_in_at)/60-NEW.break_minutes)/60*NEW.pay_rate_applied,2);
  NEW.utility_bill_amount:=round(greatest(0,extract(epoch FROM coalesce(NEW.clock_out_at,NEW.clock_in_at)-NEW.clock_in_at)/60-NEW.break_minutes)/60*NEW.utility_bill_rate_applied,2);
  RETURN NEW;
 END IF;
 SELECT * INTO a FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from<=NEW.clock_in_at ORDER BY effective_from DESC LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save an effective contractor pay agreement before clock-in' USING ERRCODE='23514'; END IF;
 p:=a.terms; NEW.contractor_role:=(p->>'role')::public.contractor_role;
 NEW.pay_rate_applied:=coalesce((p->'work_type_rates'->>NEW.work_type::text)::numeric,(p->>'base_hourly_rate')::numeric); NEW.work_type_rate:=NEW.pay_rate_applied;
 NEW.pay_segments:='[]'; NEW.weekly_allocations:='[]'; NEW.paid_minutes_exact:=0; NEW.vehicle_minutes:=0;
 NEW.regular_minutes:=0; NEW.overtime_minutes:=0; NEW.regular_pay_amount:=0; NEW.overtime_pay_amount:=0; NEW.overtime_rate_applied:=NULL;
 -- No paid interval exists until clock-out. Open activities cannot create wages.
 IF NEW.clock_out_at IS NULL THEN NEW.payroll_amount:=0; NEW.vehicle_allowance_amount:=0; NEW.utility_bill_amount:=0; RETURN NEW; END IF;
 NEW.break_minutes:=round(coalesce((SELECT sum(extract(epoch FROM (i->>'end_at')::timestamptz-(i->>'start_at')::timestamptz)/60) FROM jsonb_array_elements(NEW.activity_intervals) i WHERE i->>'kind'='BREAK'),0));
 cursor_at:=NEW.clock_in_at;
 WHILE cursor_at<NEW.clock_out_at LOOP
  SELECT * INTO a FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from<=cursor_at ORDER BY effective_from DESC LIMIT 1;
  p:=a.terms; base_rate:=coalesce((p->'work_type_rates'->>NEW.work_type::text)::numeric,(p->>'base_hourly_rate')::numeric);
  week_at:=private.pay_week_start(cursor_at,p); week_end:=((week_at AT TIME ZONE (p->>'timezone'))+interval '7 days') AT TIME ZONE (p->>'timezone');
  SELECT min(effective_from) INTO next_change FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from>cursor_at;
  finish:=least(NEW.clock_out_at,week_end,coalesce(next_change,NEW.clock_out_at));
  -- Every interval boundary creates a segment; no proportional allocation of new breaks.
  SELECT least(finish,coalesce(min(boundary),finish)) INTO finish FROM (
   SELECT (value->>'start_at')::timestamptz boundary FROM jsonb_array_elements(NEW.activity_intervals)
   UNION ALL SELECT (value->>'end_at')::timestamptz FROM jsonb_array_elements(NEW.activity_intervals)) b WHERE boundary>cursor_at;
  SELECT coalesce(sum(CASE WHEN t.calculation_version='AGREEMENT' THEN private.paid_seconds(t.clock_in_at,t.clock_out_at,t.activity_intervals,week_at,week_end)
   ELSE greatest(0,extract(epoch FROM least(t.clock_out_at,week_end)-greatest(t.clock_in_at,week_at)))*(1-least(coalesce(t.break_minutes,0)*60/greatest(extract(epoch FROM t.clock_out_at-t.clock_in_at),1),1)) END),0)
   INTO prior_seconds FROM public.time_entries t WHERE t.contractor_id=NEW.contractor_id AND t.id<>NEW.id AND t.is_deleted IS NOT TRUE AND t.clock_out_at IS NOT NULL AND t.clock_in_at<week_end AND t.clock_out_at>week_at;
  local_seconds:=private.paid_seconds(NEW.clock_in_at,cursor_at,NEW.activity_intervals,week_at,week_end);
  segment_seconds:=private.paid_seconds(cursor_at,finish,NEW.activity_intervals,cursor_at,finish);
  IF p#>>'{policy,mode}'='FLAT' THEN mult:=(p#>>'{policy,multiplier}')::numeric; first_mult:=mult;
  ELSE
   SELECT value INTO tier FROM jsonb_array_elements(p#>'{policy,tiers}') WHERE (value->>'after_hours')::numeric*3600<=prior_seconds+local_seconds ORDER BY (value->>'after_hours')::numeric DESC LIMIT 1;
   mult:=(tier->>'multiplier')::numeric; first_mult:=(p#>>'{policy,tiers,0,multiplier}')::numeric;
   SELECT min((value->>'after_hours')::numeric*3600) INTO threshold FROM jsonb_array_elements(p#>'{policy,tiers}') WHERE (value->>'after_hours')::numeric*3600>prior_seconds+local_seconds;
   IF threshold IS NOT NULL AND segment_seconds>threshold-prior_seconds-local_seconds THEN finish:=cursor_at+((threshold-prior_seconds-local_seconds)*interval '1 second'); segment_seconds:=threshold-prior_seconds-local_seconds; END IF;
  END IF;
  vehicle_seconds:=0; vehicle_rate:=0;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.activity_intervals) i WHERE i->>'kind'='VEHICLE_USE' AND (i->>'start_at')::timestamptz<=cursor_at AND (i->>'end_at')::timestamptz>=finish) THEN
   IF (p->>'driver_eligible')::boolean AND (p->>'vehicle_allowance_enabled')::boolean THEN vehicle_seconds:=segment_seconds; vehicle_rate:=(p->>'vehicle_hourly_rate')::numeric; END IF;
  END IF;
  amount:=segment_seconds/3600*base_rate*mult; sum_wage:=sum_wage+amount; sum_vehicle:=sum_vehicle+vehicle_seconds/3600*vehicle_rate;
  IF mult=first_mult THEN NEW.regular_minutes:=NEW.regular_minutes+segment_seconds/60; regular_sum:=regular_sum+amount;
  ELSE NEW.overtime_minutes:=NEW.overtime_minutes+segment_seconds/60; NULL; NEW.overtime_rate_applied:=base_rate*mult; END IF;
  NEW.paid_minutes_exact:=NEW.paid_minutes_exact+segment_seconds/60; NEW.vehicle_minutes:=NEW.vehicle_minutes+vehicle_seconds/60;
  NEW.pay_segments:=NEW.pay_segments||jsonb_build_array(jsonb_build_object('agreement_id',a.id,'start_at',cursor_at,'end_at',finish,'week_start_at',week_at,'paid_minutes',segment_seconds/60,'base_rate',base_rate,'multiplier',mult,'wage_amount',amount,'vehicle_minutes',vehicle_seconds/60,'vehicle_rate',vehicle_rate,'vehicle_amount',vehicle_seconds/3600*vehicle_rate));
  cursor_at:=finish;
 END LOOP;
 NEW.payroll_amount:=round(sum_wage,2); NEW.vehicle_allowance_amount:=round(sum_vehicle,2);
 NEW.regular_pay_amount:=round(regular_sum,2); NEW.overtime_pay_amount:=NEW.payroll_amount-NEW.regular_pay_amount;
 NEW.utility_bill_amount:=round(NEW.paid_minutes_exact/60*NEW.utility_bill_rate_applied,2);
 -- Reconcile cent-rounded segment displays to the final rounded subtotals.
 IF jsonb_array_length(NEW.pay_segments)>0 THEN
  SELECT jsonb_agg(value||jsonb_build_object('wage_amount',round((value->>'wage_amount')::numeric,2),'vehicle_amount',round((value->>'vehicle_amount')::numeric,2)) ORDER BY ord) INTO NEW.pay_segments FROM jsonb_array_elements(NEW.pay_segments) WITH ORDINALITY s(value,ord);
  NEW.pay_segments:=jsonb_set(NEW.pay_segments,ARRAY[(jsonb_array_length(NEW.pay_segments)-1)::text,'wage_amount'],to_jsonb((NEW.pay_segments->-1->>'wage_amount')::numeric+NEW.payroll_amount-(SELECT sum((value->>'wage_amount')::numeric) FROM jsonb_array_elements(NEW.pay_segments))));
  NEW.pay_segments:=jsonb_set(NEW.pay_segments,ARRAY[(jsonb_array_length(NEW.pay_segments)-1)::text,'vehicle_amount'],to_jsonb((NEW.pay_segments->-1->>'vehicle_amount')::numeric+NEW.vehicle_allowance_amount-(SELECT sum((value->>'vehicle_amount')::numeric) FROM jsonb_array_elements(NEW.pay_segments))));
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION private.guard_worker_ticket_update() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF private.active_profile_role()='CONTRACTOR' THEN
  IF (to_jsonb(NEW)-ARRAY['status','updated_at','updated_by']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','updated_at','updated_by']) THEN
   RAISE EXCEPTION 'Worker ticket changes are limited to status updates' USING ERRCODE='42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
   (OLD.status='ASSIGNED' AND NEW.status='IN_ROUTE') OR (OLD.status='IN_ROUTE' AND NEW.status='ON_SITE')
   OR (OLD.status='ON_SITE' AND NEW.status='IN_PROGRESS') OR (OLD.status='IN_PROGRESS' AND NEW.status='COMPLETE')
   OR (OLD.status='COMPLETE' AND NEW.status='PENDING_REVIEW')
   OR (OLD.status='NEEDS_REWORK' AND NEW.status='IN_PROGRESS')) THEN
   RAISE EXCEPTION 'Invalid worker ticket status transition' USING ERRCODE='23514';
  END IF;
  NEW.updated_by:=auth.uid();
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_worker_ticket_update() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER aa_guard_worker_ticket_update BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION private.guard_worker_ticket_update();
-- History is trigger-created only for assigned workers.
GRANT SELECT,INSERT ON public.ticket_status_history TO authenticated;
CREATE POLICY worker_history_read ON public.ticket_status_history FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.tickets t WHERE t.id=ticket_id AND t.assigned_to IN(SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid()))));
CREATE POLICY worker_history_trigger_insert ON public.ticket_status_history FOR INSERT TO authenticated
 WITH CHECK (pg_trigger_depth()>0 AND changed_by=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.tickets t WHERE t.id=ticket_id AND t.assigned_to IN(SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid()))));
CREATE POLICY worker_history_isolation ON public.ticket_status_history AS RESTRICTIVE FOR SELECT TO authenticated
 USING (private.active_profile_role()<>'CONTRACTOR' OR EXISTS(SELECT 1 FROM public.tickets t WHERE t.id=ticket_id AND t.assigned_to IN(SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid()))));
CREATE POLICY worker_history_guard ON public.ticket_status_history AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (private.active_profile_role()<>'CONTRACTOR' OR pg_trigger_depth()>0);

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


-- Restrictive worker ownership composes with every historical permissive policy.
CREATE POLICY worker_contractor_isolation ON public.contractors AS RESTRICTIVE FOR ALL TO authenticated
 USING(private.active_profile_role()<>'CONTRACTOR' OR profile_id=auth.uid()) WITH CHECK(private.active_profile_role()<>'CONTRACTOR' OR profile_id=auth.uid());
DO $owned$ DECLARE t text; BEGIN
 FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='contractor_id' AND table_name NOT IN ('time_entries','contractor_pay_agreements') LOOP
  EXECUTE format('CREATE POLICY payroll_worker_ownership ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (private.active_profile_role()<>%L OR contractor_id IN(SELECT id FROM public.contractors WHERE profile_id=auth.uid())) WITH CHECK (private.active_profile_role()<>%L OR contractor_id IN(SELECT id FROM public.contractors WHERE profile_id=auth.uid()))',t,'CONTRACTOR','CONTRACTOR');
 END LOOP;
END $owned$;
CREATE POLICY worker_profile_isolation ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING(private.active_profile_role()<>'CONTRACTOR' OR id=auth.uid());
CREATE POLICY time_photo_read_ownership ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(bucket_id<>'time-entry-photos' OR private.has_permission(auth.uid(),'admin.time.view') OR private.has_permission(auth.uid(),'admin.payroll.view') OR EXISTS(SELECT 1 FROM public.contractors WHERE profile_id=auth.uid() AND split_part(name,'/',1)=id::text));
CREATE POLICY time_photo_insert_ownership ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id<>'time-entry-photos' OR private.has_permission(auth.uid(),'admin.payroll.edit') OR EXISTS(SELECT 1 FROM public.contractors WHERE profile_id=auth.uid() AND split_part(name,'/',1)=id::text));
CREATE POLICY admin_storage_no_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(private.active_profile_role() IS DISTINCT FROM 'ADMIN') WITH CHECK(private.active_profile_role() IS DISTINCT FROM 'ADMIN');
CREATE POLICY admin_storage_no_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(private.active_profile_role() IS DISTINCT FROM 'ADMIN');

CREATE FUNCTION private.audit_payroll_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor text:=private.active_profile_role();
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL THEN
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
  VALUES('PAYROLL_REVIEW',TG_TABLE_NAME,NEW.id,auth.uid(),actor::public.user_role,
   jsonb_build_object('status',OLD.status),jsonb_build_object('status',NEW.status,'reviewed_by',NEW.reviewed_by,'reviewed_at',NEW.reviewed_at,'rejection_reason',NEW.rejection_reason),'Payroll review decision saved');
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.audit_payroll_review() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER payroll_review_audit AFTER UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION private.audit_payroll_review();
CREATE TRIGGER vehicle_review_audit AFTER UPDATE ON public.time_entry_vehicle_claims FOR EACH ROW EXECUTE FUNCTION private.audit_payroll_review();

-- Raw audit snapshots can contain the same confidential billing values.
CREATE POLICY confidential_audit_rows ON public.audit_logs AS RESTRICTIVE FOR SELECT TO authenticated
 USING(private.active_profile_role() IN ('CEO','SUPER_ADMIN') OR (
  coalesce(entity_type,'') !~* 'utility.?billing' AND
  coalesce(old_values::text,'') !~* '"(utility_bill|utilityBill|margin|profit)' AND
  coalesce(new_values::text,'') !~* '"(utility_bill|utilityBill|margin|profit)'));

-- Confidential rate card rows are privileged. No public/unconditional SELECT policy survives.
DO $billing$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='utility_billing_rates' LOOP
  EXECUTE format('DROP POLICY %I ON public.utility_billing_rates',p.policyname);
 END LOOP;
END $billing$;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.utility_billing_rates TO authenticated;
CREATE POLICY billing_privileged ON public.utility_billing_rates FOR ALL TO authenticated
 USING(private.active_profile_role() IN ('CEO','SUPER_ADMIN') AND private.has_permission(auth.uid(),'admin.payroll.view'))
 WITH CHECK(private.active_profile_role() IN ('CEO','SUPER_ADMIN') AND private.has_permission(auth.uid(),'admin.payroll.edit'));
CREATE POLICY role_default_insert_ceiling ON public.role_rate_defaults AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(private.has_permission(auth.uid(),'admin.payroll.edit'));
CREATE POLICY role_default_update_ceiling ON public.role_rate_defaults AS RESTRICTIVE FOR UPDATE TO authenticated USING(private.has_permission(auth.uid(),'admin.payroll.edit')) WITH CHECK(private.has_permission(auth.uid(),'admin.payroll.edit'));
CREATE POLICY role_default_delete_ceiling ON public.role_rate_defaults AS RESTRICTIVE FOR DELETE TO authenticated USING(private.has_permission(auth.uid(),'admin.payroll.edit'));
-- Existing agreement edits replace rate overwrites; old rows remain readable as history.
REVOKE INSERT,UPDATE,DELETE ON public.contractor_rates FROM authenticated;

REVOKE SELECT,INSERT,UPDATE ON public.time_entries FROM PUBLIC,anon,authenticated;
DO $columns$ DECLARE columns text; BEGIN
 SELECT string_agg(quote_ident(column_name),',') INTO columns FROM information_schema.columns
 WHERE table_schema='public' AND table_name='time_entries' AND column_name NOT IN ('utility_bill_rate_applied','utility_bill_amount');
 EXECUTE 'GRANT SELECT('||columns||') ON public.time_entries TO authenticated';
END $columns$;
GRANT INSERT(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_at,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,work_type,work_type_rate,break_minutes,status,sync_status,created_at,updated_at,activity_intervals)
 ON public.time_entries TO authenticated;
GRANT UPDATE(clock_out_at,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,break_minutes,status,reviewed_by,reviewed_at,rejection_reason,sync_status,updated_at,activity_intervals)
 ON public.time_entries TO authenticated;
CREATE FUNCTION private.privileged_payroll_entries(p_from timestamptz,p_to timestamptz,p_storm uuid,p_contractor uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR private.active_profile_role() NOT IN ('CEO','SUPER_ADMIN') OR NOT private.has_permission(auth.uid(),'admin.payroll.view') THEN RAISE EXCEPTION 'Confidential payroll access denied' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'contractor_id',contractor_id,'status',status,'total_minutes',extract(epoch FROM clock_out_at-clock_in_at)/60,'billable_minutes',coalesce(paid_minutes_exact,billable_minutes),'payroll_amount',payroll_amount,'utility_bill_amount',utility_bill_amount)),'[]') INTO result FROM public.time_entries
 WHERE is_deleted IS NOT TRUE AND clock_out_at IS NOT NULL AND status<>'REJECTED' AND (p_from IS NULL OR clock_in_at>=p_from) AND (p_to IS NULL OR clock_in_at<=p_to) AND (p_storm IS NULL OR storm_event_id=p_storm) AND (p_contractor IS NULL OR contractor_id=p_contractor);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.privileged_payroll_entries(timestamptz,timestamptz,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.privileged_payroll_entries(timestamptz,timestamptz,uuid,uuid) TO authenticated;
CREATE FUNCTION public.get_privileged_payroll_entries(p_from timestamptz DEFAULT NULL,p_to timestamptz DEFAULT NULL,p_storm uuid DEFAULT NULL,p_contractor uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.privileged_payroll_entries(p_from,p_to,p_storm,p_contractor); $$;
REVOKE ALL ON FUNCTION public.get_privileged_payroll_entries(timestamptz,timestamptz,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_privileged_payroll_entries(timestamptz,timestamptz,uuid,uuid) TO authenticated;
DO $realtime$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='time_entries') THEN ALTER PUBLICATION supabase_realtime DROP TABLE public.time_entries; END IF;
END $realtime$;

CREATE TABLE public.contractor_invitation_pay_setups (
 email text PRIMARY KEY, actor_id uuid NOT NULL REFERENCES public.profiles(id), terms jsonb NOT NULL,
 contractor_id uuid REFERENCES public.contractors(id), created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.contractor_invitation_pay_setups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contractor_invitation_pay_setups FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.contractor_invitation_pay_setups TO service_role;
CREATE FUNCTION public.complete_invitation_pay_setup(p_actor uuid,p_profile uuid,p_email text) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE setup public.contractor_invitation_pay_setups; c_id uuid; agreement_id uuid;
BEGIN
 IF NOT private.has_permission(p_actor,'admin.payroll.edit') THEN RAISE EXCEPTION 'Privileged invitation setup required' USING ERRCODE='42501'; END IF;
 SELECT * INTO setup FROM public.contractor_invitation_pay_setups WHERE email=p_email FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save compensation before sending an invitation'; END IF;
 SELECT id INTO c_id FROM public.contractors WHERE profile_id=p_profile;
 IF c_id IS NULL THEN RAISE EXCEPTION 'Finalize the contractor record first'; END IF;
 IF setup.contractor_id IS NOT NULL THEN
  IF setup.contractor_id<>c_id THEN RAISE EXCEPTION 'Invitation is bound to another contractor'; END IF;
  SELECT id INTO agreement_id FROM public.contractor_pay_agreements WHERE contractor_id=c_id ORDER BY effective_from LIMIT 1; RETURN agreement_id;
 END IF;
 PERFORM private.validate_compensation(setup.terms);
 UPDATE public.contractors SET role=(setup.terms->>'role')::public.contractor_role WHERE id=c_id;
 INSERT INTO public.contractor_pay_agreements(contractor_id,effective_from,terms,created_by) VALUES(c_id,clock_timestamp(),setup.terms,p_actor) RETURNING id INTO agreement_id;
 UPDATE public.contractor_invitation_pay_setups SET contractor_id=c_id WHERE email=p_email;
 RETURN agreement_id;
END $$;
REVOKE ALL ON FUNCTION public.complete_invitation_pay_setup(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_invitation_pay_setup(uuid,uuid,text) TO service_role;
-- All internal trigger/calculation functions are non-public; wrappers retain explicit guards.
REVOKE ALL ON FUNCTION private.guard_pay_agreement(),private.guard_time_entry_input(),private.validate_time_intervals(jsonb,timestamptz,timestamptz),private.paid_seconds(timestamptz,timestamptz,jsonb,timestamptz,timestamptz),private.pay_week_start(timestamptz,jsonb),private.guard_worker_ticket_update() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
