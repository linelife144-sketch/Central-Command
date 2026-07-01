-- Add CEO role, preserve SUPER_ADMIN permissions for CEO, and lock executive profile roles.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CEO';

DROP TRIGGER IF EXISTS trg_enforce_max_two_super_admins ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_max_two_super_admins();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = '76f09c58-c683-43ef-b4cd-2dd8b6b21b4c'::uuid
  ) THEN
    RAISE EXCEPTION 'Required CEO profile 76f09c58-c683-43ef-b4cd-2dd8b6b21b4c does not exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = 'eb7fa895-aabf-4048-b806-0224bd01fa84'::uuid
  ) THEN
    RAISE EXCEPTION 'Required SUPER_ADMIN profile eb7fa895-aabf-4048-b806-0224bd01fa84 does not exist.';
  END IF;
END;
$$;

UPDATE public.profiles
SET role = 'CEO'::public.user_role,
    updated_at = NOW()
WHERE id = '76f09c58-c683-43ef-b4cd-2dd8b6b21b4c'::uuid;

UPDATE public.profiles
SET role = 'SUPER_ADMIN'::public.user_role,
    updated_at = NOW()
WHERE id = 'eb7fa895-aabf-4048-b806-0224bd01fa84'::uuid;

CREATE OR REPLACE FUNCTION public.enforce_fixed_executive_roles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id = '76f09c58-c683-43ef-b4cd-2dd8b6b21b4c'::uuid AND NEW.role <> 'CEO'::public.user_role THEN
    RAISE EXCEPTION 'Profile 76f09c58-c683-43ef-b4cd-2dd8b6b21b4c must remain CEO.';
  END IF;

  IF NEW.id = 'eb7fa895-aabf-4048-b806-0224bd01fa84'::uuid AND NEW.role <> 'SUPER_ADMIN'::public.user_role THEN
    RAISE EXCEPTION 'Profile eb7fa895-aabf-4048-b806-0224bd01fa84 must remain SUPER_ADMIN.';
  END IF;

  IF NEW.role = 'CEO'::public.user_role AND NEW.id <> '76f09c58-c683-43ef-b4cd-2dd8b6b21b4c'::uuid THEN
    RAISE EXCEPTION 'CEO role is reserved for profile 76f09c58-c683-43ef-b4cd-2dd8b6b21b4c.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_fixed_executive_roles ON public.profiles;
CREATE TRIGGER trg_enforce_fixed_executive_roles
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_fixed_executive_roles();

DO $$
DECLARE
  super_admin_total INTEGER;
  ceo_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO super_admin_total
  FROM public.profiles
  WHERE role = 'SUPER_ADMIN'::public.user_role;

  IF super_admin_total > 1 THEN
    RAISE EXCEPTION 'Expected at most 1 SUPER_ADMIN after CEO migration; found %.', super_admin_total;
  END IF;

  SELECT COUNT(*) INTO ceo_total
  FROM public.profiles
  WHERE role = 'CEO'::public.user_role;

  IF ceo_total > 1 THEN
    RAISE EXCEPTION 'Expected at most 1 CEO profile; found %.', ceo_total;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_single_super_admin
  ON public.profiles (role)
  WHERE role = 'SUPER_ADMIN'::public.user_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_single_ceo
  ON public.profiles (role)
  WHERE role = 'CEO'::public.user_role;

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
      AND p.role IN ('CEO'::public.user_role, 'SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
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
      AND p.role IN ('CEO'::public.user_role, 'SUPER_ADMIN'::public.user_role)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;

DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND (
      role::text NOT IN ('CEO', 'SUPER_ADMIN')
      OR public.is_super_admin()
    )
  );

DROP POLICY IF EXISTS storm_events_select_admin ON public.storm_events;
CREATE POLICY storm_events_select_admin ON public.storm_events
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS storm_events_write_super_admin ON public.storm_events;
CREATE POLICY storm_events_write_super_admin ON public.storm_events
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

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
