-- Native Storm Manager authority with compatible legacy helper contracts.
-- Existing test storms retain null responsibility; new storms require selection.
CREATE OR REPLACE FUNCTION private.authority_role(p_role text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN p_role='STORM_MANAGER' THEN 'SUPER_ADMIN' ELSE p_role END;
$$;
REVOKE ALL ON FUNCTION private.authority_role(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.authority_role(text) TO authenticated,service_role;


CREATE OR REPLACE FUNCTION private.active_profile_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT private.authority_role(role::text) FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE AND NOT must_reset_password LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION private.has_permission(p_profile_id uuid, p_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r text; active boolean; def boolean; privileged boolean; effect text; permitted boolean;
BEGIN
 SELECT private.authority_role(role::text),(is_active AND NOT must_reset_password) INTO r,active FROM public.profiles WHERE id=p_profile_id;
 IF NOT coalesce(active,false) OR r NOT IN ('CEO','SUPER_ADMIN','ADMIN') THEN RETURN false; END IF;
 IF r='ADMIN' AND p_key NOT IN ('admin.tickets.view','admin.tickets.edit','admin.assessments.view','admin.assessments.edit') THEN RETURN false; END IF;
 SELECT admin_default,c.privileged INTO def,privileged FROM private.permission_catalog c WHERE permission_key=p_key;
 IF NOT FOUND OR (privileged AND r NOT IN ('CEO','SUPER_ADMIN')) THEN RETURN false; END IF;
 SELECT u.effect INTO effect FROM public.user_permissions u WHERE profile_id=p_profile_id AND permission_key=p_key;
 permitted:=CASE WHEN effect IS NOT NULL THEN effect='allow' WHEN r IN ('CEO','SUPER_ADMIN','ADMIN') THEN true ELSE def END;
 IF p_key LIKE '%.edit' THEN permitted:=permitted AND private.has_permission(p_profile_id,regexp_replace(p_key,'\.edit$','.view')); END IF;
 RETURN coalesce(permitted,false);
END $function$
;

CREATE OR REPLACE FUNCTION private.guard_profile_authorization()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 IF current_user='authenticated' THEN
  IF TG_OP='INSERT' AND NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'User administration permission required'; END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.id<>auth.uid() AND NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'User administration permission required'; END IF;
   IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.is_email_verified IS DISTINCT FROM OLD.is_email_verified OR NEW.must_reset_password IS DISTINCT FROM OLD.must_reset_password OR NEW.mfa_enabled IS DISTINCT FROM OLD.mfa_enabled OR NEW.mfa_secret_encrypted IS DISTINCT FROM OLD.mfa_secret_encrypted) THEN
    IF NEW.id=auth.uid() OR private.authority_role(OLD.role::text)='CEO' OR NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'Authorization fields are protected'; END IF;
    PERFORM pg_advisory_xact_lock(734918206);
    IF private.authority_role(OLD.role::text)='SUPER_ADMIN' AND (private.authority_role(NEW.role::text)<>'SUPER_ADMIN' OR NOT NEW.is_active) AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id<>OLD.id AND private.authority_role(p.role::text)='SUPER_ADMIN' AND p.is_active AND private.has_permission(p.id,'admin.users.edit')) THEN RAISE EXCEPTION 'Keep one active Storm Manager'; END IF;
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION private.guard_profile_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 IF current_user='authenticated' THEN
  IF OLD.id=auth.uid() OR private.authority_role(OLD.role::text)='CEO' OR NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'Protected account cannot be deleted'; END IF;
  PERFORM pg_advisory_xact_lock(734918206);
  IF private.authority_role(OLD.role::text)='SUPER_ADMIN' AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id<>OLD.id AND private.authority_role(p.role::text)='SUPER_ADMIN' AND p.is_active AND private.has_permission(p.id,'admin.users.edit')) THEN RAISE EXCEPTION 'Keep one active Storm Manager'; END IF;
 END IF;
 RETURN OLD;
END $function$
;

CREATE OR REPLACE FUNCTION private.set_user_permissions(p_profile_id uuid, p_overrides jsonb, p_version uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE actor uuid:=auth.uid(); target_role text; old_values jsonb; old_version uuid; entry record;
BEGIN
 IF actor IS NULL OR NOT private.has_permission(actor,'admin.users.edit') THEN RAISE EXCEPTION 'Storm Manager permission required' USING ERRCODE='42501'; END IF;
 IF actor=p_profile_id THEN RAISE EXCEPTION 'You cannot change your own permissions' USING ERRCODE='42501'; END IF;
 -- Serialize permission and account edits, including concurrent last-admin changes.
 PERFORM pg_advisory_xact_lock(734918206);
 IF NOT private.has_permission(actor,'admin.users.edit') THEN RAISE EXCEPTION 'Storm Manager permission required' USING ERRCODE='42501'; END IF;
 SELECT private.authority_role(role::text) INTO target_role FROM public.profiles WHERE id=p_profile_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found' USING ERRCODE='P0002'; END IF;
 IF target_role NOT IN ('ADMIN','SUPER_ADMIN') THEN RAISE EXCEPTION 'Contractor and executive permissions are locked' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_overrides) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Overrides must be an object' USING ERRCODE='22023'; END IF;
 FOR entry IN SELECT key,value FROM jsonb_each_text(p_overrides) LOOP
  IF NOT EXISTS(SELECT 1 FROM private.permission_catalog WHERE permission_key=entry.key) OR entry.value NOT IN ('allow','deny') OR entry.value IS NULL THEN RAISE EXCEPTION 'Unknown permission or effect' USING ERRCODE='22023'; END IF;
  IF entry.key LIKE '%.edit' AND entry.value='allow' AND p_overrides->>regexp_replace(entry.key,'\.edit$','.view')='deny' THEN RAISE EXCEPTION 'Enable View before Edit' USING ERRCODE='22023'; END IF;
  IF entry.key LIKE 'admin.users.%' AND entry.value='allow' AND target_role<>'SUPER_ADMIN' THEN RAISE EXCEPTION 'User administration requires the Storm Manager role' USING ERRCODE='42501'; END IF;
 END LOOP;
 SELECT version INTO old_version FROM public.user_permission_versions WHERE profile_id=p_profile_id;
 IF old_version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Permissions changed. Reload before saving.' USING ERRCODE='40001'; END IF;
 SELECT coalesce(jsonb_object_agg(permission_key,effect),'{}'::jsonb) INTO old_values FROM public.user_permissions WHERE profile_id=p_profile_id;
 DELETE FROM public.user_permissions WHERE profile_id=p_profile_id;
 INSERT INTO public.user_permissions(profile_id,permission_key,effect,updated_by) SELECT p_profile_id,key,value,actor FROM jsonb_each_text(p_overrides);
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE private.authority_role(role::text)='SUPER_ADMIN' AND is_active AND private.has_permission(id,'admin.users.edit')) THEN RAISE EXCEPTION 'Keep at least one active Storm Manager with user administration' USING ERRCODE='42501'; END IF;
 INSERT INTO public.user_permission_versions(profile_id) VALUES(p_profile_id) ON CONFLICT(profile_id) DO UPDATE SET version=gen_random_uuid();
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
 VALUES('PERMISSIONS_UPDATED','user_permissions',p_profile_id,actor,(SELECT role FROM public.profiles WHERE id=actor),old_values,p_overrides,'Individual admin permissions updated');
 RETURN private.user_permission_settings(p_profile_id);
END $function$
;

CREATE OR REPLACE FUNCTION private.provision_auth_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE profile_role public.user_role; c public.contractors;
BEGIN
 IF NEW.email IS NULL THEN RETURN NEW; END IF;
 profile_role:=CASE WHEN NEW.raw_app_meta_data->>'role' IN ('CEO','STORM_MANAGER','SUPER_ADMIN','ADMIN','CONTRACTOR')
  THEN (NEW.raw_app_meta_data->>'role')::public.user_role ELSE 'CONTRACTOR'::public.user_role END;
 IF TG_OP='INSERT' THEN
  INSERT INTO public.profiles(id,email,first_name,last_name,role,is_active,is_email_verified,must_reset_password)
  VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'first_name',''),coalesce(NEW.raw_user_meta_data->>'last_name',''),profile_role,true,NEW.email_confirmed_at IS NOT NULL,profile_role::text='CONTRACTOR')
  ON CONFLICT(id) DO NOTHING;
 ELSE
  UPDATE public.profiles SET email=NEW.email,is_email_verified=(NEW.email_confirmed_at IS NOT NULL)
  WHERE id=NEW.id AND (email IS DISTINCT FROM NEW.email OR is_email_verified IS DISTINCT FROM (NEW.email_confirmed_at IS NOT NULL));
 END IF;
 IF profile_role::text='CONTRACTOR' AND NEW.raw_app_meta_data ? 'contractor_record_id' THEN
  SELECT * INTO c FROM public.contractors WHERE id::text=NEW.raw_app_meta_data->>'contractor_record_id' FOR UPDATE;
  IF c.id IS NULL OR c.is_deleted OR lower(c.business_email) IS DISTINCT FROM lower(NEW.email)
   OR (c.profile_id IS NOT NULL AND c.profile_id<>NEW.id) THEN
   RAISE EXCEPTION 'Account does not match the contractor record' USING ERRCODE='42501'; END IF;
  IF NEW.email_confirmed_at IS NOT NULL AND c.profile_id IS NULL THEN
   UPDATE public.contractors SET profile_id=NEW.id WHERE id=c.id;
   UPDATE public.profiles SET first_name=c.first_name,last_name=c.last_name,phone=c.business_phone WHERE id=NEW.id;
   INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary)
   VALUES('CONTRACTOR_ACCOUNT_VERIFIED','contractor',c.id,NEW.id,'CONTRACTOR',jsonb_build_object('profile_id',NEW.id),'Contractor verified email ownership');
  END IF;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION private.guard_internal_account_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE c public.contractors; setup_claim private.contractor_account_setup_claims;
BEGIN
 IF NEW.raw_app_meta_data->>'role' IN ('CEO','STORM_MANAGER','SUPER_ADMIN','ADMIN') THEN RETURN NEW; END IF;
 IF NEW.email IS NULL THEN RAISE EXCEPTION 'Internally added contractor required' USING ERRCODE='42501'; END IF;
 -- Supabase Auth may insert a user before persisting server-only app_metadata.
 -- A high-entropy, one-use claim from the protected setup RPC authorizes only
 -- this exact pre-added email/contractor pair for a short window.
 IF NEW.raw_user_meta_data ? 'contractor_setup_claim_token' THEN
  SELECT sc.* INTO setup_claim FROM private.contractor_account_setup_claims sc
  JOIN public.contractors co ON co.id=sc.contractor_id
  WHERE sc.claim_token::text=NEW.raw_user_meta_data->>'contractor_setup_claim_token'
   AND sc.contractor_id::text=NEW.raw_user_meta_data->>'contractor_record_id'
   AND sc.consumed_at IS NULL AND sc.expires_at>clock_timestamp()
   AND co.profile_id IS NULL AND co.is_deleted IS NOT TRUE
   AND lower(co.business_email)=lower(NEW.email)
  FOR UPDATE OF sc,co;
  IF setup_claim.contractor_id IS NULL THEN RAISE EXCEPTION 'Valid contractor setup request required' USING ERRCODE='42501'; END IF;
  UPDATE private.contractor_account_setup_claims SET consumed_at=clock_timestamp() WHERE contractor_id=setup_claim.contractor_id;
  RETURN NEW;
 END IF;
 -- Preserve service-created contractor accounts whose trusted app metadata is
 -- already present during INSERT.
 IF NEW.raw_app_meta_data->>'role' IS DISTINCT FROM 'CONTRACTOR' THEN
  RAISE EXCEPTION 'Internally added contractor required' USING ERRCODE='42501';
 END IF;
 SELECT * INTO c FROM public.contractors WHERE id::text=NEW.raw_app_meta_data->>'contractor_record_id' FOR UPDATE;
 IF c.id IS NULL OR c.profile_id IS NOT NULL OR c.is_deleted OR lower(c.business_email) IS DISTINCT FROM lower(NEW.email)
  OR c.account_setup_requested_at IS NULL OR c.account_setup_requested_at<clock_timestamp()-interval '10 minutes' THEN
  RAISE EXCEPTION 'Valid contractor setup request required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE lower(email)=lower(NEW.email)) THEN
  RAISE EXCEPTION 'Account already exists' USING ERRCODE='23505'; END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION private.guard_pay_agreement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE previous jsonb; actor_id uuid:=auth.uid(); actor text;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Pay agreements are immutable; create a new effective version' USING ERRCODE='23514'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.contractor_id::text,0));
 IF actor_id IS NULL AND current_setting('role',true)='service_role' THEN actor_id:=NEW.created_by; END IF;
 SELECT role::text INTO actor FROM public.profiles WHERE id=actor_id;
 IF actor_id IS NULL OR actor NOT IN ('CEO','STORM_MANAGER','SUPER_ADMIN') OR NOT private.has_permission(actor_id,'admin.payroll.edit') THEN
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
END $function$
;

CREATE OR REPLACE FUNCTION public.add_contractor_record(p_actor_id uuid, p_first_name text, p_last_name text, p_email text, p_phone text, p_terms jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE c_id uuid; agreement_id uuid; actor_role public.user_role; normalized_email text:=lower(btrim(p_email));
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server-only contractor creation' USING ERRCODE='42501'; END IF;
 SELECT role INTO actor_role FROM public.profiles WHERE id=p_actor_id AND is_active AND NOT must_reset_password;
 IF actor_role IS NULL OR actor_role::text NOT IN ('CEO','STORM_MANAGER','SUPER_ADMIN')
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
END $function$
;

ALTER TABLE public.storm_events ADD COLUMN responsible_manager_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT;
CREATE INDEX storm_events_responsible_manager_idx ON public.storm_events(responsible_manager_id);
COMMENT ON COLUMN public.storm_events.responsible_manager_id IS 'One explicitly selected responsible management profile. Nullable only for existing unconfigured test storms; not an access boundary.';

CREATE OR REPLACE FUNCTION private.guard_storm_manager()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); candidate public.profiles; previous uuid;
BEGIN
 IF TG_OP='UPDATE' AND NEW.responsible_manager_id IS NOT DISTINCT FROM OLD.responsible_manager_id THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.status='CLOSED' THEN RAISE EXCEPTION 'Closed storm manager history is fixed' USING ERRCODE='23514'; END IF;
 IF actor IS NULL OR NOT private.has_permission(actor,'admin.storms.edit') THEN RAISE EXCEPTION 'Storm management permission required' USING ERRCODE='42501'; END IF;
 IF NEW.responsible_manager_id IS NULL THEN RAISE EXCEPTION 'Select a responsible Storm Manager' USING ERRCODE='23514'; END IF;
 SELECT * INTO candidate FROM public.profiles WHERE id=NEW.responsible_manager_id FOR SHARE;
 IF candidate.id IS NULL OR candidate.role::text NOT IN ('STORM_MANAGER','SUPER_ADMIN') OR NOT candidate.is_active OR candidate.must_reset_password OR NOT private.has_permission(candidate.id,'admin.storms.edit') THEN
  RAISE EXCEPTION 'Select an active, setup-complete Storm Manager with storm management access' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN previous:=OLD.responsible_manager_id; END IF;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
 VALUES('STORM_MANAGER_ASSIGNED','storm_event',NEW.id,actor,(SELECT role FROM public.profiles WHERE id=actor),jsonb_build_object('responsible_manager_id',previous),jsonb_build_object('responsible_manager_id',NEW.responsible_manager_id),'Responsible Storm Manager explicitly assigned');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_storm_manager() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_storm_manager BEFORE INSERT OR UPDATE OF responsible_manager_id ON public.storm_events FOR EACH ROW EXECUTE FUNCTION private.guard_storm_manager();

CREATE OR REPLACE FUNCTION private.guard_storm_manager_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF (NOT NEW.is_active OR NEW.must_reset_password OR NEW.role::text NOT IN ('STORM_MANAGER','SUPER_ADMIN')) AND EXISTS(SELECT 1 FROM public.storm_events WHERE responsible_manager_id=OLD.id AND NOT coalesce(is_deleted,false) AND status<>'CLOSED') THEN
  RAISE EXCEPTION 'Reassign active storms before changing their responsible manager access' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_storm_manager_profile() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_storm_manager_profile BEFORE UPDATE OF role,is_active,must_reset_password ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.guard_storm_manager_profile();

CREATE OR REPLACE FUNCTION private.guard_storm_manager_permissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.effect='deny' AND NEW.permission_key IN ('admin.storms.view','admin.storms.edit') AND EXISTS(SELECT 1 FROM public.storm_events WHERE responsible_manager_id=NEW.profile_id AND NOT coalesce(is_deleted,false) AND status<>'CLOSED') THEN
  RAISE EXCEPTION 'Reassign active storms before restricting their manager access' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_storm_manager_permissions() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_storm_manager_permissions BEFORE INSERT OR UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION private.guard_storm_manager_permissions();

CREATE OR REPLACE FUNCTION private.list_storm_manager_options(p_storm_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.has_permission(auth.uid(),'admin.storms.view') THEN RAISE EXCEPTION 'Storm view permission required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',coalesce(nullif(btrim(concat_ws(' ',first_name,last_name)),''),email),'role',role,
  'eligible',is_active AND NOT must_reset_password AND role::text IN ('STORM_MANAGER','SUPER_ADMIN') AND private.has_permission(id,'admin.storms.edit')) ORDER BY last_name,first_name,id),'[]'::jsonb)
 FROM public.profiles WHERE (role::text IN ('STORM_MANAGER','SUPER_ADMIN') AND is_active AND NOT must_reset_password AND private.has_permission(id,'admin.storms.edit'))
 OR id=(SELECT responsible_manager_id FROM public.storm_events WHERE id=p_storm_id AND NOT coalesce(is_deleted,false)));
END $$;
REVOKE ALL ON FUNCTION private.list_storm_manager_options(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.list_storm_manager_options(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.list_storm_manager_options(p_storm_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.list_storm_manager_options(p_storm_id); $$;
REVOKE ALL ON FUNCTION public.list_storm_manager_options(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_storm_manager_options(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_storm_manager(p_storm_id uuid,p_manager_id uuid,p_expected_manager_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE event_row public.storm_events;
BEGIN
 IF auth.uid() IS NULL OR NOT private.has_permission(auth.uid(),'admin.storms.edit') THEN RAISE EXCEPTION 'Storm management permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO event_row FROM public.storm_events WHERE id=p_storm_id AND NOT coalesce(is_deleted,false) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Storm not found' USING ERRCODE='P0002'; END IF;
 IF event_row.status='CLOSED' THEN RAISE EXCEPTION 'Closed storm manager history is fixed' USING ERRCODE='23514'; END IF;
 IF event_row.responsible_manager_id IS DISTINCT FROM p_expected_manager_id THEN RAISE EXCEPTION 'Responsible manager changed. Reload before saving.' USING ERRCODE='40001'; END IF;
 UPDATE public.storm_events SET responsible_manager_id=p_manager_id,updated_by=auth.uid() WHERE id=p_storm_id RETURNING * INTO event_row;
 RETURN to_jsonb(event_row);
END $$;
REVOKE ALL ON FUNCTION public.set_storm_manager(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_storm_manager(uuid,uuid,uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.create_storm_event_with_rates(p_event jsonb, p_role_rates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE actor uuid:=auth.uid(); event_row public.storm_events; item jsonb; initial_status text;
BEGIN
 IF actor IS NULL OR NOT private.has_permission(actor,'admin.storms.edit') OR NOT private.has_permission(actor,'admin.payroll.view') OR NOT private.has_permission(actor,'admin.payroll.edit') THEN
  RAISE EXCEPTION 'Storm and payroll editing permissions are required' USING ERRCODE='42501';
 END IF;
 PERFORM private.validate_storm_role_rates(p_role_rates);
 IF jsonb_typeof(p_event) IS DISTINCT FROM 'object' OR nullif(btrim(p_event->>'event_code'),'') IS NULL
   OR nullif(btrim(p_event->>'name'),'') IS NULL OR nullif(btrim(p_event->>'utility_client'),'') IS NULL THEN
  RAISE EXCEPTION 'Storm code, name, and utility are required' USING ERRCODE='23514';
 END IF;
 initial_status:=coalesce(nullif(p_event->>'status',''),'MOB');
 IF initial_status NOT IN ('MOB','ACTIVE','DE-MOB','RELEASED','BILLING','CLOSED') THEN
  RAISE EXCEPTION 'Invalid storm status' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.storm_events(event_code,name,utility_client,status,region,contract_reference,start_date,end_date,notes,created_by,updated_by,responsible_manager_id)
 VALUES(upper(btrim(p_event->>'event_code')),btrim(p_event->>'name'),upper(btrim(p_event->>'utility_client')),
   CASE WHEN initial_status='CLOSED' THEN 'MOB' ELSE initial_status END,
   nullif(btrim(p_event->>'region'),''),nullif(btrim(p_event->>'contract_reference'),''),
   nullif(p_event->>'start_date','')::date,nullif(p_event->>'end_date','')::date,nullif(p_event->>'notes',''),actor,actor,nullif(p_event->>'responsible_manager_id','')::uuid)
 RETURNING * INTO event_row;
 FOR item IN SELECT value FROM jsonb_array_elements(p_role_rates) LOOP
  INSERT INTO public.storm_role_pay_rates(storm_event_id,role,hourly_rate,updated_by)
   VALUES(event_row.id,(item->>'role')::public.contractor_role,(item->>'pay_rate')::numeric,actor);
  INSERT INTO public.utility_billing_rates(storm_event_id,role,work_type,hourly_rate,currency,updated_by)
   VALUES(event_row.id,(item->>'role')::public.contractor_role,NULL,(item->>'bill_rate')::numeric,'USD',actor);
 END LOOP;
 IF initial_status='CLOSED' THEN UPDATE public.storm_events SET status='CLOSED' WHERE id=event_row.id RETURNING * INTO event_row; END IF;
 RETURN to_jsonb(event_row);
END $function$
;

NOTIFY pgrst, 'reload schema';
