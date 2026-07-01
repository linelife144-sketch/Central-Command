-- Add RLS policies for storm SOP workflow tables and code masters.

BEGIN;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_phase_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_roster_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_roster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_authorization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_logistics_entries ENABLE ROW LEVEL SECURITY;

-- Customer/utility code masters: admin read, super admin write.
DROP POLICY IF EXISTS customers_select_admin ON public.customers;
CREATE POLICY customers_select_admin ON public.customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS customers_write_super_admin ON public.customers;
CREATE POLICY customers_write_super_admin ON public.customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS utilities_select_admin ON public.utilities;
CREATE POLICY utilities_select_admin ON public.utilities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS utilities_write_super_admin ON public.utilities;
CREATE POLICY utilities_write_super_admin ON public.utilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'SUPER_ADMIN'
    )
  );

-- Storm workflow tables: admin read/write, preserving storm_events super-admin-only creation policy.
DROP POLICY IF EXISTS storm_event_phase_steps_admin ON public.storm_event_phase_steps;
CREATE POLICY storm_event_phase_steps_admin ON public.storm_event_phase_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS storm_event_roster_revisions_admin ON public.storm_event_roster_revisions;
CREATE POLICY storm_event_roster_revisions_admin ON public.storm_event_roster_revisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS storm_event_roster_members_admin ON public.storm_event_roster_members;
CREATE POLICY storm_event_roster_members_admin ON public.storm_event_roster_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS storm_event_authorization_logs_admin ON public.storm_event_authorization_logs;
CREATE POLICY storm_event_authorization_logs_admin ON public.storm_event_authorization_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS storm_event_documents_admin ON public.storm_event_documents;
CREATE POLICY storm_event_documents_admin ON public.storm_event_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS storm_event_logistics_entries_admin ON public.storm_event_logistics_entries;
CREATE POLICY storm_event_logistics_entries_admin ON public.storm_event_logistics_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

COMMIT;
