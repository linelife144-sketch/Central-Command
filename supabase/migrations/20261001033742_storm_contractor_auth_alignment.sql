BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Role lookup is internal, tied to auth.uid(), and cannot expose another user's profile.
CREATE OR REPLACE FUNCTION private.active_profile_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT role::text FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE LIMIT 1;
$$;
REVOKE ALL ON FUNCTION private.active_profile_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.active_profile_role() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.active_profile_role(); $$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT coalesce(private.active_profile_role() IN ('CEO','SUPER_ADMIN','ADMIN'),false); $$;
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT coalesce(private.active_profile_role() IN ('CEO','SUPER_ADMIN'),false); $$;
REVOKE ALL ON FUNCTION public.current_user_role(),public.is_admin(),public.is_super_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_user_role(),public.is_admin(),public.is_super_admin() TO authenticated,service_role;

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'CONTRACTOR'::public.user_role;
CREATE OR REPLACE FUNCTION private.provision_auth_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE profile_role public.user_role;
BEGIN
  IF NEW.email IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    profile_role:=CASE WHEN NEW.raw_app_meta_data->>'role' IN ('CEO','SUPER_ADMIN','ADMIN','CONTRACTOR')
      THEN (NEW.raw_app_meta_data->>'role')::public.user_role ELSE 'CONTRACTOR'::public.user_role END;
    INSERT INTO public.profiles(id,email,first_name,last_name,role,is_active,is_email_verified)
    VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'first_name',''),coalesce(NEW.raw_user_meta_data->>'last_name',''),profile_role,true,NEW.email_confirmed_at IS NOT NULL)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    UPDATE public.profiles SET email=NEW.email,is_email_verified=(NEW.email_confirmed_at IS NOT NULL)
      WHERE id=NEW.id AND (email IS DISTINCT FROM NEW.email OR is_email_verified IS DISTINCT FROM (NEW.email_confirmed_at IS NOT NULL));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.provision_auth_profile() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER provision_contractor_auth_profile AFTER INSERT OR UPDATE OF email,email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.provision_auth_profile();

-- Repair profiles for existing Auth accounts without accepting user-editable role metadata.
INSERT INTO public.profiles(id,email,first_name,last_name,role,is_active,is_email_verified)
SELECT u.id,u.email,coalesce(u.raw_user_meta_data->>'first_name',''),coalesce(u.raw_user_meta_data->>'last_name',''),
  CASE WHEN u.raw_app_meta_data->>'role' IN ('CEO','SUPER_ADMIN','ADMIN','CONTRACTOR') THEN (u.raw_app_meta_data->>'role')::public.user_role ELSE 'CONTRACTOR'::public.user_role END,
  true,u.email_confirmed_at IS NOT NULL
FROM auth.users u WHERE u.email IS NOT NULL ON CONFLICT(id) DO NOTHING;

-- The user requested Super Admin auth for the existing company login. Resolve its ID
-- from the verified login; no generated Auth IDs are embedded in the migration.
UPDATE public.profiles p SET role='SUPER_ADMIN',first_name='David',last_name='McCarty',is_active=true
FROM auth.users u WHERE p.id=u.id AND lower(u.email)='dmccarty@gridelectriccorp.com' AND u.email_confirmed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION private.sync_profile_managed_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE auth.users SET raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('role',NEW.role::text)
    WHERE id=NEW.id AND raw_app_meta_data->>'role' IS DISTINCT FROM NEW.role::text;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.sync_profile_managed_role() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_contractor_managed_role AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.sync_profile_managed_role();
UPDATE auth.users u SET raw_app_meta_data=coalesce(u.raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('role',p.role::text)
FROM public.profiles p WHERE p.id=u.id AND u.raw_app_meta_data->>'role' IS DISTINCT FROM p.role::text;

CREATE OR REPLACE FUNCTION private.guard_profile_authorization() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF current_user='authenticated' AND NOT public.is_super_admin() AND NEW.role::text <> 'CONTRACTOR' THEN
      RAISE EXCEPTION 'Only Super Admin can grant elevated account roles';
    END IF;
    RETURN NEW;
  END IF;
  IF current_user='authenticated' AND NOT public.is_super_admin() AND
    (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active OR
     NEW.is_email_verified IS DISTINCT FROM OLD.is_email_verified OR NEW.must_reset_password IS DISTINCT FROM OLD.must_reset_password OR
     NEW.mfa_enabled IS DISTINCT FROM OLD.mfa_enabled OR NEW.mfa_secret_encrypted IS DISTINCT FROM OLD.mfa_secret_encrypted) THEN
    RAISE EXCEPTION 'Only authorized account administrators can change authorization fields';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_profile_authorization() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_profile_authorization BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.guard_profile_authorization();
CREATE OR REPLACE FUNCTION private.guard_contractor_eligibility() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF current_user='authenticated' AND NOT public.is_admin() AND
    (NEW.profile_id IS DISTINCT FROM OLD.profile_id OR NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status OR
     NEW.is_eligible_for_assignment IS DISTINCT FROM OLD.is_eligible_for_assignment OR NEW.approved_by IS DISTINCT FROM OLD.approved_by OR
     NEW.approved_at IS DISTINCT FROM OLD.approved_at OR NEW.eligibility_reason IS DISTINCT FROM OLD.eligibility_reason) THEN
    RAISE EXCEPTION 'Only authorized administrators can approve contractor eligibility';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_contractor_eligibility() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_contractor_eligibility BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION private.guard_contractor_eligibility();

-- Require an active app profile before any authenticated Data API access.
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND roles='{public}' LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated',item.policyname,item.tablename);
  END LOOP;
  FOR item IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item.relname);
    EXECUTE format('CREATE POLICY active_profile_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (private.active_profile_role() IS NOT NULL) WITH CHECK (private.active_profile_role() IS NOT NULL)',item.relname);
  END LOOP;
END $$;

-- Assigned contractors can read their utility payload, never another contractor's tickets.
CREATE POLICY ticket_payloads_select_assigned ON public.ticket_payloads FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.tickets t JOIN public.contractors c ON c.id=t.assigned_to WHERE t.id=ticket_payloads.ticket_id AND c.profile_id=(SELECT auth.uid()) AND NOT t.is_deleted));

-- Return only the utility context needed for an assigned ticket, excluding contract
-- terms, operational notes, billing details and other members' information.
CREATE OR REPLACE FUNCTION private.assigned_storm_ticket_context(p_storm_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE context jsonb;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE) THEN RETURN NULL; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.tickets t JOIN public.contractors c ON c.id=t.assigned_to
    WHERE t.storm_event_id=p_storm_id AND c.profile_id=(SELECT auth.uid()) AND NOT t.is_deleted) THEN RETURN NULL; END IF;
  SELECT jsonb_build_object('id',id,'event_code',event_code,'name',name,'utility_client',utility_client,
    'ticket_template_key',ticket_template_key,'config_snapshot',config_snapshot,'status',status,'region',region,
    'contract_reference',NULL,'start_date',start_date,'end_date',end_date,'notes',NULL,'created_at',created_at)
  INTO context FROM public.storm_events WHERE id=p_storm_id AND NOT is_deleted;
  RETURN context;
END $$;
REVOKE ALL ON FUNCTION private.assigned_storm_ticket_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.assigned_storm_ticket_context(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_assigned_storm_ticket_context(p_storm_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.assigned_storm_ticket_context(p_storm_id); $$;
REVOKE ALL ON FUNCTION public.get_assigned_storm_ticket_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_assigned_storm_ticket_context(uuid) TO authenticated;

-- Pin the search path on application routines; preserve signatures and permissions.
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT p.proname,pg_get_function_identity_arguments(p.oid) args FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' AND p.proname IN (
    'update_updated_at_column','log_ticket_status_change','update_expense_report_total','generate_ticket_number',
    'enforce_ticket_storm_utility_match','set_storm_event_ticket_template_key','inherit_ticket_template_key_from_storm_event',
    'generate_storm_event_code_from_sop','prevent_storm_event_code_update','enforce_time_entry_storm_scope','enforce_expense_report_storm_scope','enforce_invoice_storm_scope',
    'freeze_storm_utility_context','validate_storm_ticket_payload','enforce_storm_payload','prevent_ticket_storm_move','enforce_invoice_line_storm',
    'enforce_ticket_roster_assignment','freeze_invoice_storm','enforce_expense_item_storm') LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path=public,pg_temp',item.proname,item.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC,anon',item.proname,item.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated,service_role',item.proname,item.args);
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
