-- Contractor-requested email verification, minimal onboarding, and active-only access.
-- LOCAL ONLY: apply separately after review. No mail is sent by this migration.
BEGIN;
ALTER TABLE public.contractors
 ADD COLUMN vehicle_registration_photo_path text,
 ADD COLUMN account_setup_requested_at timestamptz;

-- Existing linked accounts retain access; new account setups start incomplete.
UPDATE public.contractors c SET onboarding_completed_at=coalesce(c.onboarding_completed_at,clock_timestamp())
FROM public.profiles p WHERE p.id=c.profile_id AND NOT p.must_reset_password;

CREATE FUNCTION public.claim_contractor_account_setup(p_email text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c public.contractors; u auth.users; normalized text:=lower(btrim(p_email));
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(normalized,734918206));
 SELECT * INTO c FROM public.contractors WHERE lower(business_email)=normalized AND is_deleted IS NOT TRUE FOR UPDATE;
 IF c.id IS NULL OR c.onboarding_completed_at IS NOT NULL THEN RETURN NULL; END IF;
 SELECT * INTO u FROM auth.users WHERE lower(email)=normalized;
 IF u.id IS NOT NULL AND (u.raw_app_meta_data->>'contractor_record_id' IS DISTINCT FROM c.id::text
   OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=u.id AND role::text='CONTRACTOR' AND is_active AND must_reset_password)
   OR (c.profile_id IS NOT NULL AND c.profile_id<>u.id)) THEN RETURN NULL; END IF;
 IF c.profile_id IS NOT NULL AND u.id IS NULL THEN RETURN NULL; END IF;
 IF c.account_setup_requested_at>clock_timestamp()-interval '2 minutes' THEN RETURN NULL; END IF;
 UPDATE public.contractors SET account_setup_requested_at=clock_timestamp() WHERE id=c.id;
 RETURN jsonb_build_object('id',c.id,'email',normalized,'first_name',c.first_name,'last_name',c.last_name,'auth_user_id',u.id);
END $$;
REVOKE ALL ON FUNCTION public.claim_contractor_account_setup(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_contractor_account_setup(text) TO service_role;

-- Public signup cannot supply server-managed app metadata. Even a direct Auth
-- signup must match a recently requested, internally added, unlinked record.
CREATE FUNCTION private.guard_internal_account_creation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.contractors;
BEGIN
 IF NEW.raw_app_meta_data->>'role' IN ('CEO','SUPER_ADMIN','ADMIN') THEN RETURN NEW; END IF;
 IF NEW.email IS NULL OR NEW.raw_app_meta_data->>'role' IS DISTINCT FROM 'CONTRACTOR' THEN
  RAISE EXCEPTION 'Internally added contractor required' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.contractors WHERE id::text=NEW.raw_app_meta_data->>'contractor_record_id' FOR UPDATE;
 IF c.id IS NULL OR c.profile_id IS NOT NULL OR c.is_deleted OR lower(c.business_email) IS DISTINCT FROM lower(NEW.email)
  OR c.account_setup_requested_at IS NULL OR c.account_setup_requested_at<clock_timestamp()-interval '10 minutes' THEN
  RAISE EXCEPTION 'Valid contractor setup request required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE lower(email)=lower(NEW.email)) THEN
  RAISE EXCEPTION 'Account already exists' USING ERRCODE='23505'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_internal_account_creation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER internal_account_creation BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.guard_internal_account_creation();

-- Provision an active profile, but attach the record only after Auth verifies
-- the mailbox. The record ID comes exclusively from server-managed metadata.
CREATE OR REPLACE FUNCTION private.provision_auth_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE profile_role public.user_role; c public.contractors;
BEGIN
 IF NEW.email IS NULL THEN RETURN NEW; END IF;
 profile_role:=CASE WHEN NEW.raw_app_meta_data->>'role' IN ('CEO','SUPER_ADMIN','ADMIN','CONTRACTOR')
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
END $$;

CREATE FUNCTION public.complete_account_password_setup(p_profile_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id WHERE u.id=p_profile_id AND p.is_active
   AND u.email_confirmed_at IS NOT NULL AND coalesce(u.encrypted_password,'')<>''
   AND (p.role::text<>'CONTRACTOR' OR EXISTS(SELECT 1 FROM public.contractors c WHERE c.profile_id=u.id AND c.is_deleted IS NOT TRUE AND lower(c.business_email)=lower(u.email)))) THEN
  RAISE EXCEPTION 'Verified active account and password required' USING ERRCODE='42501'; END IF;
 UPDATE public.profiles SET must_reset_password=false WHERE id=p_profile_id;
END $$;
REVOKE ALL ON FUNCTION public.complete_account_password_setup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_account_password_setup(uuid) TO service_role;

CREATE FUNCTION public.complete_contractor_onboarding(p_profile_id uuid,p_details jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c public.contractors; driver boolean; photo text:=nullif(p_details->>'vehicle_registration_photo_path','');
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 SELECT c1.* INTO c FROM public.contractors c1 JOIN public.profiles p ON p.id=c1.profile_id JOIN auth.users u ON u.id=p.id
 WHERE c1.profile_id=p_profile_id AND c1.is_deleted IS NOT TRUE AND p.role::text='CONTRACTOR' AND p.is_active AND NOT p.must_reset_password
 AND u.email_confirmed_at IS NOT NULL AND coalesce(u.encrypted_password,'')<>'' AND lower(c1.business_email)=lower(u.email) FOR UPDATE OF c1,p;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Verified active contractor required' USING ERRCODE='42501'; END IF;
 IF c.onboarding_completed_at IS NOT NULL THEN RAISE EXCEPTION 'Onboarding already completed' USING ERRCODE='23514'; END IF;
 IF jsonb_typeof(p_details) IS DISTINCT FROM 'object'
  OR length(btrim(coalesce(p_details->>'first_name',''))) NOT BETWEEN 1 AND 80
  OR length(btrim(coalesce(p_details->>'last_name',''))) NOT BETWEEN 1 AND 80
  OR length(btrim(coalesce(p_details->>'address_line1',''))) NOT BETWEEN 1 AND 255
  OR length(coalesce(p_details->>'address_line2',''))>255
  OR length(btrim(coalesce(p_details->>'city',''))) NOT BETWEEN 1 AND 100
  OR coalesce(p_details->>'state','') !~ '^[A-Z]{2}$' OR coalesce(p_details->>'zip_code','') !~ '^[0-9]{5}(-[0-9]{4})?$' THEN
  RAISE EXCEPTION 'Names and full starting address required' USING ERRCODE='23514'; END IF;
 -- Lock the contractor before reading its immutable pay agreements; admin pay
 -- changes use the same contractor lock, so the driver requirement cannot race.
 SELECT coalesce((terms->>'driver_eligible')::boolean,false) INTO driver FROM public.contractor_pay_agreements
 WHERE contractor_id=c.id AND effective_from<=clock_timestamp() ORDER BY effective_from DESC LIMIT 1;
 IF driver AND photo IS NULL THEN RAISE EXCEPTION 'Vehicle registration tag photo required' USING ERRCODE='23514'; END IF;
 IF photo IS NOT NULL AND (split_part(photo,'/',1)<>c.id::text OR photo !~ '^[0-9a-f-]+/[0-9a-f-]+[.](jpg|png|webp)$'
  OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='contractor-registration-tags' AND name=photo)) THEN
  RAISE EXCEPTION 'Upload your own vehicle registration tag photo' USING ERRCODE='23514'; END IF;
 UPDATE public.profiles SET first_name=btrim(p_details->>'first_name'),last_name=btrim(p_details->>'last_name') WHERE id=p_profile_id;
 UPDATE public.contractors SET first_name=btrim(p_details->>'first_name'),last_name=btrim(p_details->>'last_name'),
  address_line1=btrim(p_details->>'address_line1'),address_line2=nullif(btrim(p_details->>'address_line2'),''),city=btrim(p_details->>'city'),
  state=p_details->>'state',zip_code=p_details->>'zip_code',vehicle_registration_photo_path=CASE WHEN driver THEN photo ELSE NULL END,
  onboarding_completed_at=clock_timestamp() WHERE id=c.id;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary)
 VALUES('CONTRACTOR_ONBOARDING_COMPLETED','contractor',c.id,p_profile_id,'CONTRACTOR',jsonb_build_object('onboarding_complete',true,'driver',coalesce(driver,false)),'Contractor completed account onboarding');
END $$;
REVOKE ALL ON FUNCTION public.complete_contractor_onboarding(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_contractor_onboarding(uuid,jsonb) TO service_role;

-- Never let a direct client update bypass the onboarding endpoint.
CREATE FUNCTION private.guard_contractor_setup_fields() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user='authenticated' AND (TG_OP='INSERT' OR
  ROW(NEW.profile_id,NEW.onboarding_completed_at,NEW.vehicle_registration_photo_path,NEW.account_setup_requested_at)
   IS DISTINCT FROM ROW(OLD.profile_id,OLD.onboarding_completed_at,OLD.vehicle_registration_photo_path,OLD.account_setup_requested_at)) THEN
  RAISE EXCEPTION 'Contractor account setup fields are server managed' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_contractor_setup_fields() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_contractor_setup BEFORE INSERT OR UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION private.guard_contractor_setup_fields();

CREATE FUNCTION private.contractor_portal_ready() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid()) AND p.is_active AND NOT p.must_reset_password
 AND (p.role::text<>'CONTRACTOR' OR (p.is_email_verified AND EXISTS(SELECT 1 FROM public.contractors c WHERE c.profile_id=p.id AND c.is_deleted IS NOT TRUE AND c.onboarding_completed_at IS NOT NULL))));
$$;
REVOKE ALL ON FUNCTION private.contractor_portal_ready() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.contractor_portal_ready() TO authenticated,service_role;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')
 AND c.relname NOT IN ('profiles','contractors','contractor_pay_agreements','user_permissions','permission_catalog') LOOP
  EXECUTE format('CREATE POLICY contractor_onboarding_gate ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (private.contractor_portal_ready()) WITH CHECK (private.contractor_portal_ready())',t.relname);
 END LOOP;
END $$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('contractor-registration-tags','contractor-registration-tags',false,10485760,ARRAY['image/jpeg','image/png','image/webp']);
CREATE FUNCTION private.owns_registration_tag(object_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id
 WHERE c.id::text=split_part(object_name,'/',1) AND p.id=(SELECT auth.uid()) AND p.role::text='CONTRACTOR' AND p.is_active AND p.is_email_verified AND NOT p.must_reset_password AND c.is_deleted IS NOT TRUE);
$$;
REVOKE ALL ON FUNCTION private.owns_registration_tag(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.owns_registration_tag(text) TO authenticated;
CREATE POLICY registration_tag_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='contractor-registration-tags' AND (private.owns_registration_tag(name) OR private.active_profile_role() IN ('CEO','SUPER_ADMIN')));
CREATE POLICY registration_tag_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='contractor-registration-tags' AND private.owns_registration_tag(name) AND name ~ '^[0-9a-f-]+/[0-9a-f-]+[.](jpg|png|webp)$');
-- Restrictive policies prevent other permissive bucket policies granting access.
CREATE POLICY registration_tag_read_boundary ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(bucket_id<>'contractor-registration-tags' OR private.owns_registration_tag(name) OR private.active_profile_role() IN ('CEO','SUPER_ADMIN'));
CREATE POLICY registration_tag_upload_boundary ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id<>'contractor-registration-tags' OR (private.owns_registration_tag(name) AND name ~ '^[0-9a-f-]+/[0-9a-f-]+[.](jpg|png|webp)$'));
CREATE POLICY registration_tag_no_replace ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(bucket_id<>'contractor-registration-tags') WITH CHECK(bucket_id<>'contractor-registration-tags');
CREATE POLICY registration_tag_no_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'contractor-registration-tags');
CREATE POLICY storage_onboarding_gate ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
 USING(bucket_id='contractor-registration-tags' OR private.contractor_portal_ready()) WITH CHECK(bucket_id='contractor-registration-tags' OR private.contractor_portal_ready());

-- Profile deactivation also blocks new Supabase Auth sessions. Existing sessions
-- are denied immediately by active-profile RLS and middleware. No history changes.
CREATE FUNCTION private.sync_contractor_auth_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.role::text='CONTRACTOR' AND NEW.is_active IS DISTINCT FROM OLD.is_active THEN
  UPDATE auth.users SET banned_until=CASE WHEN NEW.is_active THEN NULL ELSE '9999-12-31 00:00:00+00'::timestamptz END WHERE id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.sync_contractor_auth_access() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER contractor_auth_access AFTER UPDATE OF is_active ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.sync_contractor_auth_access();
UPDATE auth.users u SET banned_until='9999-12-31 00:00:00+00'::timestamptz FROM public.profiles p WHERE p.id=u.id AND p.role::text='CONTRACTOR' AND NOT p.is_active;

CREATE OR REPLACE FUNCTION public.assign_contractor_to_storm(p_storm_id uuid,p_contractor_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE revision uuid;
BEGIN
  IF NOT private.has_permission(auth.uid(),'admin.assignments.edit') THEN RAISE EXCEPTION 'Only authorized users can assign contractors'; END IF;
  PERFORM 1 FROM public.storm_events WHERE id=p_storm_id AND NOT is_deleted FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Create a storm first'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id WHERE c.id=p_contractor_id AND c.is_deleted IS NOT TRUE AND p.is_active AND p.role::text='CONTRACTOR') THEN RAISE EXCEPTION 'Select an active contractor'; END IF;
  SELECT id INTO revision FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id AND NOT is_locked ORDER BY revision_number DESC LIMIT 1;
  IF revision IS NULL THEN
    IF EXISTS(SELECT 1 FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id) THEN RAISE EXCEPTION 'The storm roster is locked. Create an unlocked roster revision first'; END IF;
    INSERT INTO public.storm_event_roster_revisions(storm_event_id,revision_number,revision_label,created_by) VALUES(p_storm_id,0,'Initial roster',auth.uid()) RETURNING id INTO revision;
  END IF;
  IF EXISTS(SELECT 1 FROM public.storm_event_roster_members WHERE roster_revision_id=revision AND contractor_id=p_contractor_id AND member_status<>'REMOVED') THEN RETURN; END IF;
  INSERT INTO public.storm_event_roster_members(roster_revision_id,contractor_id,member_status,created_by) VALUES(revision,p_contractor_id,'CONFIRMED',auth.uid());
END $$;
CREATE OR REPLACE FUNCTION public.list_assignable_storm_contractors(p_storm_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('contractorId',c.id,'displayName',p.first_name||' '||p.last_name) ORDER BY p.last_name,p.first_name),'[]'::jsonb)
  FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id
  JOIN public.storm_event_roster_members m ON m.contractor_id=c.id
  JOIN public.storm_event_roster_revisions r ON r.id=m.roster_revision_id
  WHERE r.storm_event_id=p_storm_id AND m.member_status='CONFIRMED'
    AND c.is_deleted IS NOT TRUE AND p.is_active AND p.role::text='CONTRACTOR'
    AND r.revision_number=(SELECT max(revision_number) FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id);
$$;
CREATE OR REPLACE FUNCTION public.list_storm_contractors(p_storm_id uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('contractorId',c.id,'displayName',p.first_name||' '||p.last_name) ORDER BY p.last_name),'[]'::jsonb)
  FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id
  JOIN public.storm_event_roster_members m ON m.contractor_id=c.id
  JOIN public.storm_event_roster_revisions r ON r.id=m.roster_revision_id
  WHERE r.storm_event_id=p_storm_id AND m.member_status<>'REMOVED' AND p.is_active AND c.is_deleted IS NOT TRUE
    AND r.revision_number=(SELECT max(revision_number) FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id);
$$;
CREATE OR REPLACE FUNCTION public.enforce_ticket_roster_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to AND NEW.storm_event_id IS NOT DISTINCT FROM OLD.storm_event_id THEN RETURN NEW; END IF;
  IF NEW.assigned_to IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id WHERE c.id=NEW.assigned_to AND p.is_active AND c.is_deleted IS NOT TRUE) THEN RAISE EXCEPTION 'Select an active contractor'; END IF;
  IF NEW.assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.storm_event_roster_members m JOIN public.storm_event_roster_revisions r ON r.id=m.roster_revision_id
    WHERE r.storm_event_id=NEW.storm_event_id AND m.contractor_id=NEW.assigned_to AND m.member_status='CONFIRMED'
      AND r.revision_number=(SELECT max(revision_number) FROM public.storm_event_roster_revisions WHERE storm_event_id=NEW.storm_event_id)
  ) THEN RAISE EXCEPTION 'Assign the contractor to this storm roster first'; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION private.guard_time_entry_input() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
NOTIFY pgrst,'reload schema';
COMMIT;
