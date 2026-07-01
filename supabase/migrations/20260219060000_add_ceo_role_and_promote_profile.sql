-- Add CEO to user roles and promote designated profile.
-- Also align policy helpers so CEO has admin + super-admin-equivalent access.

UPDATE public.profiles
SET role = 'CEO'::public.user_role,
    updated_at = NOW()
WHERE id = '76f09c58-c683-43ef-b4cd-2dd8b6b21b4c'
  AND role::text <> 'CEO';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('SUPER_ADMIN', 'CEO', 'ADMIN')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('SUPER_ADMIN', 'CEO')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;

-- storm_events
DROP POLICY IF EXISTS storm_events_select_admin ON public.storm_events;
CREATE POLICY storm_events_select_admin ON public.storm_events
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS storm_events_write_super_admin ON public.storm_events;
CREATE POLICY storm_events_write_super_admin ON public.storm_events
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ticket ingestion/scaffold tables
DROP POLICY IF EXISTS ticket_attachments_select_admin ON public.ticket_attachments;
CREATE POLICY ticket_attachments_select_admin ON public.ticket_attachments
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS ticket_attachments_write_super_admin ON public.ticket_attachments;
CREATE POLICY ticket_attachments_write_super_admin ON public.ticket_attachments
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS ticket_payloads_select_admin ON public.ticket_payloads;
CREATE POLICY ticket_payloads_select_admin ON public.ticket_payloads
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS ticket_payloads_write_super_admin ON public.ticket_payloads;
CREATE POLICY ticket_payloads_write_super_admin ON public.ticket_payloads
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS ticket_extraction_sessions_select_admin ON public.ticket_extraction_sessions;
CREATE POLICY ticket_extraction_sessions_select_admin ON public.ticket_extraction_sessions
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS ticket_extraction_sessions_write_super_admin ON public.ticket_extraction_sessions;
CREATE POLICY ticket_extraction_sessions_write_super_admin ON public.ticket_extraction_sessions
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS ticket_templates_select_admin ON public.ticket_templates;
CREATE POLICY ticket_templates_select_admin ON public.ticket_templates
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS ticket_templates_write_super_admin ON public.ticket_templates;
CREATE POLICY ticket_templates_write_super_admin ON public.ticket_templates
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- storm SOP code masters + workflow tables
DROP POLICY IF EXISTS customers_select_admin ON public.customers;
CREATE POLICY customers_select_admin ON public.customers
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS customers_write_super_admin ON public.customers;
CREATE POLICY customers_write_super_admin ON public.customers
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS utilities_select_admin ON public.utilities;
CREATE POLICY utilities_select_admin ON public.utilities
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS utilities_write_super_admin ON public.utilities;
CREATE POLICY utilities_write_super_admin ON public.utilities
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS storm_event_phase_steps_admin ON public.storm_event_phase_steps;
CREATE POLICY storm_event_phase_steps_admin ON public.storm_event_phase_steps
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS storm_event_roster_revisions_admin ON public.storm_event_roster_revisions;
CREATE POLICY storm_event_roster_revisions_admin ON public.storm_event_roster_revisions
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS storm_event_roster_members_admin ON public.storm_event_roster_members;
CREATE POLICY storm_event_roster_members_admin ON public.storm_event_roster_members
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS storm_event_authorization_logs_admin ON public.storm_event_authorization_logs;
CREATE POLICY storm_event_authorization_logs_admin ON public.storm_event_authorization_logs
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS storm_event_documents_admin ON public.storm_event_documents;
CREATE POLICY storm_event_documents_admin ON public.storm_event_documents
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS storm_event_logistics_entries_admin ON public.storm_event_logistics_entries;
CREATE POLICY storm_event_logistics_entries_admin ON public.storm_event_logistics_entries
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());
