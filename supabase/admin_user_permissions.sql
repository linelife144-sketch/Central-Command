-- Per-user staff module access and one-person contractor invitations.
-- Existing contractor policies and role boundaries are preserved.
BEGIN;
CREATE TABLE private.permission_catalog (
 permission_key text PRIMARY KEY, admin_default boolean NOT NULL, privileged boolean NOT NULL DEFAULT false
);
REVOKE ALL ON private.permission_catalog FROM PUBLIC,anon,authenticated;
INSERT INTO private.permission_catalog VALUES
('admin.dashboard.view',true,false),
('admin.storms.view',true,false),
('admin.storms.edit',false,false),
('admin.tickets.view',true,false),
('admin.tickets.edit',false,false),
('admin.contractors.view',true,false),
('admin.contractors.edit',true,false),
('admin.assignments.view',true,false),
('admin.assignments.edit',false,false),
('admin.map.view',true,false),
('admin.time.view',true,false),
('admin.time.edit',true,false),
('admin.expenses.view',true,false),
('admin.expenses.edit',true,false),
('admin.assessments.view',true,false),
('admin.assessments.edit',true,false),
('admin.payroll.view',true,false),
('admin.payroll.edit',false,false),
('admin.reports.view',true,false),
('admin.users.view',false,true),
('admin.users.edit',false,true);
CREATE TABLE public.user_permissions (
 profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 permission_key text NOT NULL REFERENCES private.permission_catalog(permission_key),
 effect text NOT NULL CHECK(effect IN ('allow','deny')),
 updated_by uuid NOT NULL REFERENCES public.profiles(id), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(profile_id,permission_key)
);
CREATE INDEX user_permissions_updated_by_idx ON public.user_permissions(updated_by);
CREATE TABLE public.user_permission_versions (
 profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, version uuid NOT NULL DEFAULT gen_random_uuid()
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_permissions,public.user_permission_versions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.user_permissions,public.user_permission_versions TO authenticated;
GRANT ALL ON public.user_permissions,public.user_permission_versions TO service_role;

-- Private lookup avoids policy recursion. It never grants access from user-editable metadata.
CREATE FUNCTION private.has_permission(p_profile_id uuid,p_key text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r text; active boolean; def boolean; privileged boolean; effect text; permitted boolean;
BEGIN
 SELECT role::text,(is_active AND NOT must_reset_password) INTO r,active FROM public.profiles WHERE id=p_profile_id;
 IF NOT coalesce(active,false) OR r NOT IN ('CEO','SUPER_ADMIN','ADMIN') THEN RETURN false; END IF;
 SELECT admin_default,c.privileged INTO def,privileged FROM private.permission_catalog c WHERE permission_key=p_key;
 IF NOT FOUND OR (privileged AND r<>'SUPER_ADMIN') THEN RETURN false; END IF;
 SELECT u.effect INTO effect FROM public.user_permissions u WHERE profile_id=p_profile_id AND permission_key=p_key;
 permitted:=CASE WHEN effect IS NOT NULL THEN effect='allow' WHEN r IN ('CEO','SUPER_ADMIN') THEN true ELSE def END;
 IF p_key LIKE '%.edit' THEN
  permitted:=permitted AND private.has_permission(p_profile_id,regexp_replace(p_key,'\.edit$','.view'));
 END IF;
 RETURN coalesce(permitted,false);
END $$;
REVOKE ALL ON FUNCTION private.has_permission(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.has_permission(uuid,text) TO authenticated,service_role;
CREATE POLICY permissions_read ON public.user_permissions FOR SELECT TO authenticated
 USING(profile_id=(select auth.uid()) OR private.has_permission((select auth.uid()),'admin.users.view'));
CREATE POLICY versions_read ON public.user_permission_versions FOR SELECT TO authenticated
 USING(profile_id=(select auth.uid()) OR private.has_permission((select auth.uid()),'admin.users.view'));

CREATE FUNCTION public.get_my_permissions() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_object_agg(k.key,private.has_permission(auth.uid(),k.key)) FROM unnest(ARRAY['admin.dashboard.view','admin.storms.view','admin.storms.edit','admin.tickets.view','admin.tickets.edit','admin.contractors.view','admin.contractors.edit','admin.assignments.view','admin.assignments.edit','admin.map.view','admin.time.view','admin.time.edit','admin.expenses.view','admin.expenses.edit','admin.assessments.view','admin.assessments.edit','admin.reports.view','admin.users.view','admin.users.edit']::text[]) k(key);
$$;
REVOKE ALL ON FUNCTION public.get_my_permissions() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;

CREATE FUNCTION private.user_permission_settings(p_profile_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); result jsonb;
BEGIN
 IF actor IS NULL OR NOT private.has_permission(actor,'admin.users.view') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('profile',jsonb_build_object('id',p.id,'email',p.email,'first_name',p.first_name,'last_name',p.last_name,'role',p.role,'is_active',p.is_active),
  'overrides',coalesce((SELECT jsonb_object_agg(permission_key,effect) FROM public.user_permissions WHERE profile_id=p.id),'{}'::jsonb),
  'permissions',(SELECT jsonb_object_agg(permission_key,private.has_permission(p.id,permission_key)) FROM private.permission_catalog),
  'version',(SELECT version FROM public.user_permission_versions WHERE profile_id=p.id)) INTO result FROM public.profiles p WHERE p.id=p_profile_id;
 IF result IS NULL THEN RAISE EXCEPTION 'User not found' USING ERRCODE='P0002'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.user_permission_settings(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.user_permission_settings(uuid) TO authenticated;
CREATE FUNCTION public.get_user_permission_settings(p_profile_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.user_permission_settings(p_profile_id); $$;
REVOKE ALL ON FUNCTION public.get_user_permission_settings(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_user_permission_settings(uuid) TO authenticated;

CREATE FUNCTION private.set_user_permissions(p_profile_id uuid,p_overrides jsonb,p_version uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); target_role text; old_values jsonb; old_version uuid; entry record;
BEGIN
 IF actor IS NULL OR NOT private.has_permission(actor,'admin.users.edit') THEN RAISE EXCEPTION 'Super Admin permission required' USING ERRCODE='42501'; END IF;
 IF actor=p_profile_id THEN RAISE EXCEPTION 'You cannot change your own permissions' USING ERRCODE='42501'; END IF;
 -- Serialize permission and account edits, including concurrent last-admin changes.
 PERFORM pg_advisory_xact_lock(734918206);
 IF NOT private.has_permission(actor,'admin.users.edit') THEN RAISE EXCEPTION 'Super Admin permission required' USING ERRCODE='42501'; END IF;
 SELECT role::text INTO target_role FROM public.profiles WHERE id=p_profile_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found' USING ERRCODE='P0002'; END IF;
 IF target_role NOT IN ('ADMIN','SUPER_ADMIN') THEN RAISE EXCEPTION 'Contractor and executive permissions are locked' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_overrides) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Overrides must be an object' USING ERRCODE='22023'; END IF;
 FOR entry IN SELECT key,value FROM jsonb_each_text(p_overrides) LOOP
  IF NOT EXISTS(SELECT 1 FROM private.permission_catalog WHERE permission_key=entry.key) OR entry.value NOT IN ('allow','deny') OR entry.value IS NULL THEN RAISE EXCEPTION 'Unknown permission or effect' USING ERRCODE='22023'; END IF;
  IF entry.key LIKE '%.edit' AND entry.value='allow' AND p_overrides->>regexp_replace(entry.key,'\.edit$','.view')='deny' THEN RAISE EXCEPTION 'Enable View before Edit' USING ERRCODE='22023'; END IF;
  IF entry.key LIKE 'admin.users.%' AND entry.value='allow' AND target_role<>'SUPER_ADMIN' THEN RAISE EXCEPTION 'User administration requires the Super Admin role' USING ERRCODE='42501'; END IF;
 END LOOP;
 SELECT version INTO old_version FROM public.user_permission_versions WHERE profile_id=p_profile_id;
 IF old_version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Permissions changed. Reload before saving.' USING ERRCODE='40001'; END IF;
 SELECT coalesce(jsonb_object_agg(permission_key,effect),'{}'::jsonb) INTO old_values FROM public.user_permissions WHERE profile_id=p_profile_id;
 DELETE FROM public.user_permissions WHERE profile_id=p_profile_id;
 INSERT INTO public.user_permissions(profile_id,permission_key,effect,updated_by) SELECT p_profile_id,key,value,actor FROM jsonb_each_text(p_overrides);
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE role::text='SUPER_ADMIN' AND is_active AND private.has_permission(id,'admin.users.edit')) THEN RAISE EXCEPTION 'Keep at least one active Super Admin with user administration' USING ERRCODE='42501'; END IF;
 INSERT INTO public.user_permission_versions(profile_id) VALUES(p_profile_id) ON CONFLICT(profile_id) DO UPDATE SET version=gen_random_uuid();
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
 VALUES('PERMISSIONS_UPDATED','user_permissions',p_profile_id,actor,'SUPER_ADMIN',old_values,p_overrides,'Individual admin permissions updated');
 RETURN private.user_permission_settings(p_profile_id);
END $$;
REVOKE ALL ON FUNCTION private.set_user_permissions(uuid,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.set_user_permissions(uuid,jsonb,uuid) TO authenticated;
CREATE FUNCTION public.set_user_permissions(p_profile_id uuid,p_overrides jsonb,p_version uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.set_user_permissions(p_profile_id,p_overrides,p_version); $$;
REVOKE ALL ON FUNCTION public.set_user_permissions(uuid,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_user_permissions(uuid,jsonb,uuid) TO authenticated;

DO $policies$ DECLARE item record; mod text; stmt text; BEGIN
 FOR item IN SELECT * FROM pg_policies WHERE schemaname='public' AND permissive='PERMISSIVE' AND (qual ~ 'is_(super_)?admin\(\)' OR with_check ~ 'is_(super_)?admin\(\)') LOOP
 mod:=CASE item.tablename
 WHEN 'storm_events' THEN 'storms'
 WHEN 'tickets' THEN 'tickets'
 WHEN 'ticket_payloads' THEN 'tickets'
 WHEN 'ticket_status_history' THEN 'tickets'
 WHEN 'ticket_attachments' THEN 'tickets'
 WHEN 'ticket_extraction_sessions' THEN 'tickets'
 WHEN 'ticket_routes' THEN 'tickets'
 WHEN 'contractors' THEN 'contractors'
 WHEN 'contractor_rates' THEN 'payroll'
 WHEN 'role_rate_defaults' THEN 'payroll'
 WHEN 'utility_billing_rates' THEN 'payroll'
 WHEN 'time_entry_vehicle_claims' THEN 'payroll'
 WHEN 'contractor_banking' THEN 'contractors'
 WHEN 'time_entries' THEN 'time'
 WHEN 'expense_reports' THEN 'expenses'
 WHEN 'expense_items' THEN 'expenses'
 WHEN 'damage_assessments' THEN 'assessments'
 WHEN 'equipment_assessments' THEN 'assessments'
 WHEN 'storm_event_roster_members' THEN 'assignments'
 WHEN 'storm_event_roster_revisions' THEN 'assignments'
 WHEN 'storm_event_authorization_logs' THEN 'assignments'
 WHEN 'storm_event_phase_steps' THEN 'storms'
 WHEN 'storm_event_documents' THEN 'storms'
 WHEN 'storm_event_logistics_entries' THEN 'storms'
 ELSE NULL END;
 IF mod IS NULL THEN CONTINUE; END IF;
 EXECUTE format('DROP POLICY %I ON public.%I',item.policyname,item.tablename);
 IF item.cmd='ALL' THEN
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING(private.has_permission(auth.uid(),%L))',item.policyname||'_view',item.tablename,'admin.'||mod||'.view');
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK(private.has_permission(auth.uid(),%L))',item.policyname||'_insert',item.tablename,'admin.'||mod||'.edit');
  EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING(private.has_permission(auth.uid(),%L)) WITH CHECK(private.has_permission(auth.uid(),%L))',item.policyname||'_update',item.tablename,'admin.'||mod||'.edit','admin.'||mod||'.edit');
  EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING(private.has_permission(auth.uid(),%L))',item.policyname||'_delete',item.tablename,'admin.'||mod||'.edit');
 ELSE
  stmt:=format('CREATE POLICY %I ON public.%I FOR %s TO authenticated',item.policyname,item.tablename,item.cmd);
  IF item.cmd<>'INSERT' THEN stmt:=stmt||format(' USING(private.has_permission(auth.uid(),%L))','admin.'||mod||CASE WHEN item.cmd='SELECT' THEN '.view' ELSE '.edit' END); END IF;
  IF item.cmd IN ('INSERT','UPDATE') THEN stmt:=stmt||format(' WITH CHECK(private.has_permission(auth.uid(),%L))','admin.'||mod||'.edit'); END IF;
  EXECUTE stmt;
 END IF;
 END LOOP;
END $policies$;
CREATE POLICY module_view_select ON public.storm_events AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.view')));
CREATE POLICY module_edit_insert ON public.storm_events AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_edit_update ON public.storm_events AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_edit_delete ON public.storm_events AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_view_select ON public.tickets AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.view')));
CREATE POLICY module_edit_insert ON public.tickets AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_update ON public.tickets AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_delete ON public.tickets AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_view_select ON public.ticket_payloads AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.view')));
CREATE POLICY module_edit_insert ON public.ticket_payloads AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_update ON public.ticket_payloads AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_delete ON public.ticket_payloads AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_view_select ON public.ticket_status_history AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.view')));
CREATE POLICY module_edit_insert ON public.ticket_status_history AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_update ON public.ticket_status_history AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_delete ON public.ticket_status_history AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_view_select ON public.ticket_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.view')));
CREATE POLICY module_edit_insert ON public.ticket_attachments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_update ON public.ticket_attachments AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_delete ON public.ticket_attachments AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_view_select ON public.ticket_extraction_sessions AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.view')));
CREATE POLICY module_edit_insert ON public.ticket_extraction_sessions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_update ON public.ticket_extraction_sessions AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_delete ON public.ticket_extraction_sessions AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_view_select ON public.ticket_routes AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.view')));
CREATE POLICY module_edit_insert ON public.ticket_routes AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_update ON public.ticket_routes AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_edit_delete ON public.ticket_routes AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.tickets.edit')));
CREATE POLICY module_view_select ON public.contractors AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.view') OR private.has_permission((select auth.uid()),'admin.payroll.view')));
CREATE POLICY module_edit_insert ON public.contractors AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.edit')));
CREATE POLICY module_edit_update ON public.contractors AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.edit')));
CREATE POLICY module_edit_delete ON public.contractors AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.edit')));
CREATE POLICY module_view_select ON public.contractor_rates AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.view') OR private.has_permission((select auth.uid()),'admin.payroll.view')));
CREATE POLICY module_edit_insert ON public.contractor_rates AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.edit')));
CREATE POLICY module_edit_update ON public.contractor_rates AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.edit')));
CREATE POLICY module_edit_delete ON public.contractor_rates AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.edit')));
CREATE POLICY module_view_select ON public.contractor_banking AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.view')));
CREATE POLICY module_edit_insert ON public.contractor_banking AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.edit')));
CREATE POLICY module_edit_update ON public.contractor_banking AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.edit')));
CREATE POLICY module_edit_delete ON public.contractor_banking AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.contractors.edit')));
CREATE POLICY module_view_select ON public.time_entries AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.time.view') OR private.has_permission((select auth.uid()),'admin.payroll.view')));
CREATE POLICY module_edit_insert ON public.time_entries AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.time.edit')));
CREATE POLICY module_edit_update ON public.time_entries AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.time.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.time.edit')));
CREATE POLICY module_edit_delete ON public.time_entries AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.time.edit')));
CREATE POLICY module_view_select ON public.expense_reports AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.view')));
CREATE POLICY module_edit_insert ON public.expense_reports AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.edit')));
CREATE POLICY module_edit_update ON public.expense_reports AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.edit')));
CREATE POLICY module_edit_delete ON public.expense_reports AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.edit')));
CREATE POLICY module_view_select ON public.expense_items AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.view')));
CREATE POLICY module_edit_insert ON public.expense_items AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.edit')));
CREATE POLICY module_edit_update ON public.expense_items AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.edit')));
CREATE POLICY module_edit_delete ON public.expense_items AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.expenses.edit')));
CREATE POLICY module_view_select ON public.damage_assessments AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.view')));
CREATE POLICY module_edit_insert ON public.damage_assessments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.edit')));
CREATE POLICY module_edit_update ON public.damage_assessments AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.edit')));
CREATE POLICY module_edit_delete ON public.damage_assessments AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.edit')));
CREATE POLICY module_view_select ON public.equipment_assessments AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.view')));
CREATE POLICY module_edit_insert ON public.equipment_assessments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.edit')));
CREATE POLICY module_edit_update ON public.equipment_assessments AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.edit')));
CREATE POLICY module_edit_delete ON public.equipment_assessments AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assessments.edit')));
CREATE POLICY module_view_select ON public.storm_event_roster_members AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.view')));
CREATE POLICY module_edit_insert ON public.storm_event_roster_members AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit')));
CREATE POLICY module_edit_update ON public.storm_event_roster_members AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit')));
CREATE POLICY module_edit_delete ON public.storm_event_roster_members AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit')));
CREATE POLICY module_view_select ON public.storm_event_roster_revisions AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.view')));
CREATE POLICY module_edit_insert ON public.storm_event_roster_revisions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit')));
CREATE POLICY module_edit_update ON public.storm_event_roster_revisions AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit')));
CREATE POLICY module_edit_delete ON public.storm_event_roster_revisions AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit')));
CREATE POLICY module_view_select ON public.storm_event_authorization_logs AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.view')));
CREATE POLICY module_edit_insert ON public.storm_event_authorization_logs AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit')));
CREATE POLICY module_edit_update ON public.storm_event_authorization_logs AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit')));
CREATE POLICY module_edit_delete ON public.storm_event_authorization_logs AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.assignments.edit')));
CREATE POLICY module_view_select ON public.storm_event_phase_steps AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.view')));
CREATE POLICY module_edit_insert ON public.storm_event_phase_steps AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_edit_update ON public.storm_event_phase_steps AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_edit_delete ON public.storm_event_phase_steps AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_view_select ON public.storm_event_documents AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.view')));
CREATE POLICY module_edit_insert ON public.storm_event_documents AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_edit_update ON public.storm_event_documents AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_edit_delete ON public.storm_event_documents AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_view_select ON public.storm_event_logistics_entries AS RESTRICTIVE FOR SELECT TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.view')));
CREATE POLICY module_edit_insert ON public.storm_event_logistics_entries AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_edit_update ON public.storm_event_logistics_entries AS RESTRICTIVE FOR UPDATE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit'))) WITH CHECK((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));
CREATE POLICY module_edit_delete ON public.storm_event_logistics_entries AS RESTRICTIVE FOR DELETE TO authenticated USING((private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.storms.edit')));


-- Payroll owns financial edits; time reviewers may still read claim amounts.
CREATE POLICY payroll_time_read ON public.time_entries FOR SELECT TO authenticated USING(private.has_permission((select auth.uid()),'admin.payroll.view'));
CREATE POLICY payroll_contractor_read ON public.contractors FOR SELECT TO authenticated USING(private.has_permission((select auth.uid()),'admin.payroll.view'));
CREATE POLICY payroll_view_select ON public.role_rate_defaults AS RESTRICTIVE FOR SELECT TO authenticated USING(private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.view'));
CREATE POLICY payroll_edit_insert ON public.role_rate_defaults AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_edit_update ON public.role_rate_defaults AS RESTRICTIVE FOR UPDATE TO authenticated USING(private.has_permission((select auth.uid()),'admin.payroll.edit')) WITH CHECK(private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_edit_delete ON public.role_rate_defaults AS RESTRICTIVE FOR DELETE TO authenticated USING(private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_view_select ON public.utility_billing_rates AS RESTRICTIVE FOR SELECT TO authenticated USING(private.has_permission((select auth.uid()),'admin.payroll.view'));
CREATE POLICY payroll_edit_insert ON public.utility_billing_rates AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_edit_update ON public.utility_billing_rates AS RESTRICTIVE FOR UPDATE TO authenticated USING(private.has_permission((select auth.uid()),'admin.payroll.edit')) WITH CHECK(private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_edit_delete ON public.utility_billing_rates AS RESTRICTIVE FOR DELETE TO authenticated USING(private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_view_select ON public.time_entry_vehicle_claims AS RESTRICTIVE FOR SELECT TO authenticated USING(private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.view') OR private.has_permission((select auth.uid()),'admin.time.view'));
CREATE POLICY time_claim_read ON public.time_entry_vehicle_claims FOR SELECT TO authenticated USING(private.has_permission((select auth.uid()),'admin.time.view'));
CREATE POLICY payroll_edit_insert ON public.time_entry_vehicle_claims AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_edit_update ON public.time_entry_vehicle_claims AS RESTRICTIVE FOR UPDATE TO authenticated USING(private.has_permission((select auth.uid()),'admin.payroll.edit')) WITH CHECK(private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_edit_delete ON public.time_entry_vehicle_claims AS RESTRICTIVE FOR DELETE TO authenticated USING(private.has_permission((select auth.uid()),'admin.payroll.edit'));


-- Restrict staff photo access for this bucket only; existing ownership policies still apply.
CREATE POLICY payroll_photo_select ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(bucket_id<>'time-entry-photos' OR private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.view'));
CREATE POLICY payroll_photo_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id<>'time-entry-photos' OR private.active_profile_role()='CONTRACTOR' OR private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_photo_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(bucket_id<>'time-entry-photos' OR private.has_permission((select auth.uid()),'admin.payroll.edit'))
 WITH CHECK(bucket_id<>'time-entry-photos' OR private.has_permission((select auth.uid()),'admin.payroll.edit'));
CREATE POLICY payroll_photo_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
 USING(bucket_id<>'time-entry-photos' OR private.has_permission((select auth.uid()),'admin.payroll.edit'));

CREATE POLICY profile_directory_permission ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated
 USING(id=(select auth.uid()) OR private.has_permission((select auth.uid()),'admin.users.view') OR private.has_permission((select auth.uid()),'admin.contractors.view') OR private.has_permission((select auth.uid()),'admin.payroll.view') OR (private.active_profile_role()='CONTRACTOR'));
CREATE POLICY profile_creation_permission ON public.profiles AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(private.has_permission((select auth.uid()),'admin.users.edit'));
CREATE POLICY profile_deletion_permission ON public.profiles AS RESTRICTIVE FOR DELETE TO authenticated USING(private.has_permission((select auth.uid()),'admin.users.edit') AND id<>(select auth.uid()));
CREATE OR REPLACE FUNCTION private.guard_profile_authorization() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user='authenticated' THEN
  IF TG_OP='INSERT' AND NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'User administration permission required'; END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.id<>auth.uid() AND NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'User administration permission required'; END IF;
   IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.is_email_verified IS DISTINCT FROM OLD.is_email_verified OR NEW.must_reset_password IS DISTINCT FROM OLD.must_reset_password OR NEW.mfa_enabled IS DISTINCT FROM OLD.mfa_enabled OR NEW.mfa_secret_encrypted IS DISTINCT FROM OLD.mfa_secret_encrypted) THEN
    IF NEW.id=auth.uid() OR OLD.role::text='CEO' OR NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'Authorization fields are protected'; END IF;
    PERFORM pg_advisory_xact_lock(734918206);
    IF OLD.role::text='SUPER_ADMIN' AND (NEW.role::text<>'SUPER_ADMIN' OR NOT NEW.is_active) AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id<>OLD.id AND p.role::text='SUPER_ADMIN' AND p.is_active AND private.has_permission(p.id,'admin.users.edit')) THEN RAISE EXCEPTION 'Keep one active Super Admin'; END IF;
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION private.guard_profile_deletion() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user='authenticated' THEN
  IF OLD.id=auth.uid() OR OLD.role::text='CEO' OR NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'Protected account cannot be deleted'; END IF;
  PERFORM pg_advisory_xact_lock(734918206);
  IF OLD.role::text='SUPER_ADMIN' AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id<>OLD.id AND p.role::text='SUPER_ADMIN' AND p.is_active AND private.has_permission(p.id,'admin.users.edit')) THEN RAISE EXCEPTION 'Keep one active Super Admin'; END IF;
 END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION private.guard_profile_deletion() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_profile_deletion BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.guard_profile_deletion();

-- Patch invoker RPC role gates without changing their transactional business logic.
DO $$ DECLARE item record; definition text; key text; BEGIN
 FOR item IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('create_storm_ticket','assign_contractor_to_storm') LOOP
  key:=CASE item.proname WHEN 'create_storm_ticket' THEN 'admin.tickets.edit' ELSE 'admin.assignments.edit' END;
  definition:=replace(pg_get_functiondef(item.oid),'NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role::text IN (''CEO'',''SUPER_ADMIN''))',format('NOT private.has_permission(auth.uid(),%L)',key));
  EXECUTE definition;
 END LOOP;
END $$;

CREATE TABLE public.contractor_invitations (
 profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 email text NOT NULL, invited_by uuid NOT NULL REFERENCES public.profiles(id),
 first_name text NOT NULL DEFAULT '',last_name text NOT NULL DEFAULT '',
 sent_at timestamptz NOT NULL DEFAULT clock_timestamp(), last_result text NOT NULL CHECK(last_result IN ('sent','failed')),
 send_count integer NOT NULL DEFAULT 1
);
CREATE INDEX contractor_invitations_actor_idx ON public.contractor_invitations(invited_by);
ALTER TABLE public.contractor_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contractor_invitations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.contractor_invitations TO authenticated;
GRANT ALL ON public.contractor_invitations TO service_role;
CREATE POLICY invitation_read ON public.contractor_invitations FOR SELECT TO authenticated
 USING(private.has_permission((select auth.uid()),'admin.contractors.view') OR private.has_permission((select auth.uid()),'admin.users.view'));
CREATE FUNCTION public.finalize_contractor_invite(p_actor_id uuid,p_profile_id uuid,p_first_name text,p_last_name text,p_email text,p_phone text,p_resend boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE contractor_id uuid;
BEGIN
 IF NOT private.has_permission(p_actor_id,'admin.users.edit') THEN RAISE EXCEPTION 'Invitation permission required'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_profile_id AND role::text='CONTRACTOR' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contractor profile required'; END IF;
 UPDATE public.profiles SET first_name=p_first_name,last_name=p_last_name,phone=p_phone,must_reset_password=true WHERE id=p_profile_id;
 SELECT id INTO contractor_id FROM public.contractors WHERE profile_id=p_profile_id;
 IF contractor_id IS NULL THEN
  INSERT INTO public.contractors(profile_id,business_name,business_email,business_phone,onboarding_status,is_eligible_for_assignment)
  VALUES(p_profile_id,p_first_name||' '||p_last_name,p_email,p_phone,'PENDING',false) RETURNING id INTO contractor_id;
 END IF;
 INSERT INTO public.contractor_invitations(profile_id,email,first_name,last_name,invited_by,last_result)
 VALUES(p_profile_id,p_email,p_first_name,p_last_name,p_actor_id,'sent') ON CONFLICT(profile_id) DO UPDATE SET first_name=p_first_name,last_name=p_last_name,sent_at=clock_timestamp(),last_result='sent',invited_by=p_actor_id,send_count=public.contractor_invitations.send_count+1;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary)
 VALUES(CASE WHEN p_resend THEN 'INVITE_RESENT' ELSE 'INVITE_SENT' END,'contractor_invitation',p_profile_id,p_actor_id,'SUPER_ADMIN',jsonb_build_object('email',p_email,'contractor_id',contractor_id,'result','sent'),'Contractor invitation sent');
 RETURN jsonb_build_object('profile_id',p_profile_id,'contractor_id',contractor_id,'email',p_email,'state','invited');
END $$;
REVOKE ALL ON FUNCTION public.finalize_contractor_invite(uuid,uuid,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_contractor_invite(uuid,uuid,text,text,text,text,boolean) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
