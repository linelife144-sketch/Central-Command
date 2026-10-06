-- Add pending contractor records without creating accounts or sending invitations.
BEGIN;
ALTER TABLE public.contractors ADD COLUMN first_name varchar(80), ADD COLUMN last_name varchar(80);
ALTER TABLE public.contractors ADD CONSTRAINT contractor_contact_name
 CHECK (profile_id IS NOT NULL OR (first_name IS NOT NULL AND last_name IS NOT NULL AND length(btrim(first_name))>0 AND length(btrim(last_name))>0));
CREATE UNIQUE INDEX contractors_contact_email_unique ON public.contractors(lower(business_email)) WHERE business_email IS NOT NULL;

CREATE FUNCTION public.add_contractor_record(p_actor_id uuid,p_first_name text,p_last_name text,p_email text,p_phone text,p_terms jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c_id uuid; agreement_id uuid; actor_role public.user_role; normalized_email text:=lower(btrim(p_email));
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server-only contractor creation' USING ERRCODE='42501'; END IF;
 SELECT role INTO actor_role FROM public.profiles WHERE id=p_actor_id AND is_active AND NOT must_reset_password;
 IF actor_role IS NULL OR actor_role::text NOT IN ('CEO','SUPER_ADMIN')
 OR NOT private.has_permission(p_actor_id,'admin.contractors.edit') OR NOT private.has_permission(p_actor_id,'admin.payroll.edit') THEN
  RAISE EXCEPTION 'Privileged contractor and payroll editing required' USING ERRCODE='42501'; END IF;
 IF p_first_name IS NULL OR p_last_name IS NULL OR length(btrim(p_first_name)) NOT BETWEEN 1 AND 80 OR length(btrim(p_last_name)) NOT BETWEEN 1 AND 80
 OR normalized_email IS NULL OR length(normalized_email)>254 OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
 OR (coalesce(p_phone,'')<>'' AND p_phone !~ '^[(][0-9]{3}[)] [0-9]{3}-[0-9]{4}$') THEN
  RAISE EXCEPTION 'Invalid contractor contact details' USING ERRCODE='23514'; END IF;
 PERFORM private.validate_compensation(p_terms);
 PERFORM pg_advisory_xact_lock(hashtextextended(normalized_email,734918206));
 IF EXISTS(SELECT 1 FROM public.profiles WHERE lower(email)=normalized_email)
 OR EXISTS(SELECT 1 FROM public.contractors WHERE lower(business_email)=normalized_email) THEN
  RAISE EXCEPTION 'A contractor or account already uses this email address' USING ERRCODE='23505'; END IF;
 INSERT INTO public.contractors(first_name,last_name,business_name,business_email,business_phone,role,onboarding_status,is_eligible_for_assignment,eligibility_reason,created_by)
 VALUES(btrim(p_first_name),btrim(p_last_name),btrim(p_first_name)||' '||btrim(p_last_name),normalized_email,nullif(p_phone,''),(p_terms->>'role')::public.contractor_role,'PENDING',false,'Onboarding approval required',p_actor_id)
 RETURNING id INTO c_id;
 INSERT INTO public.contractor_pay_agreements(contractor_id,effective_from,terms,created_by)
 VALUES(c_id,clock_timestamp(),p_terms,p_actor_id) RETURNING id INTO agreement_id;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary)
 VALUES('CONTRACTOR_ADDED','contractor',c_id,p_actor_id,actor_role,jsonb_build_object('first_name',btrim(p_first_name),'last_name',btrim(p_last_name),'email',normalized_email,'onboarding_status','PENDING','agreement_id',agreement_id),'Contractor record added without an account or invitation');
 RETURN jsonb_build_object('id',c_id,'agreement_id',agreement_id,'onboarding_status','PENDING');
END $$;
REVOKE ALL ON FUNCTION public.add_contractor_record(uuid,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.add_contractor_record(uuid,text,text,text,text,jsonb) TO service_role;

-- Abort rather than rewrite any worked shifts using removed work types.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.time_entries WHERE work_type::text IN ('ADMIN','TRAINING')) THEN
  RAISE EXCEPTION 'Admin or Training shifts exist; resolve historical work types before removal'; END IF;
END $$;
-- Retain the removed rate configuration in the audit trail for recovery.
INSERT INTO public.audit_logs(action,entity_type,old_values,change_summary)
SELECT 'WORK_TYPES_REMOVED','work_type',jsonb_build_object(
 'contractor_rates',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM public.contractor_rates r WHERE work_type::text IN ('ADMIN','TRAINING')),
 'role_rate_defaults',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM public.role_rate_defaults r WHERE work_type::text IN ('ADMIN','TRAINING')),
 'utility_billing_rates',(SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') FROM public.utility_billing_rates r WHERE work_type::text IN ('ADMIN','TRAINING'))),
 'Removed Admin and Training work types; existing shifts and immutable pay agreements preserved';
DELETE FROM public.contractor_rates WHERE work_type::text IN ('ADMIN','TRAINING');
DELETE FROM public.role_rate_defaults WHERE work_type::text IN ('ADMIN','TRAINING');
DELETE FROM public.utility_billing_rates WHERE work_type::text IN ('ADMIN','TRAINING');
ALTER TYPE public.work_type RENAME TO work_type_retired;
CREATE TYPE public.work_type AS ENUM ('STANDARD_ASSESSMENT','EMERGENCY_RESPONSE','TRAVEL','STANDBY');
ALTER TABLE public.contractor_rates ALTER COLUMN work_type TYPE public.work_type USING work_type::text::public.work_type;
ALTER TABLE public.role_rate_defaults ALTER COLUMN work_type TYPE public.work_type USING work_type::text::public.work_type;
ALTER TABLE public.utility_billing_rates ALTER COLUMN work_type TYPE public.work_type USING work_type::text::public.work_type;
ALTER TABLE public.time_entries ALTER COLUMN work_type TYPE public.work_type USING work_type::text::public.work_type;
DROP TYPE public.work_type_retired;
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
  IF wt NOT IN ('STANDARD_ASSESSMENT','EMERGENCY_RESPONSE','TRAVEL','STANDBY') OR jsonb_typeof(t)<>'number'
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

NOTIFY pgrst,'reload schema';
COMMIT;
