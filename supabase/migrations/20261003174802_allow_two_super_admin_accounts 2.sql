-- Permit the explicitly requested second Super Admin while retaining a limit of two.
DROP INDEX IF EXISTS public.idx_profiles_single_super_admin;

CREATE OR REPLACE FUNCTION private.enforce_max_two_super_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role::text = 'SUPER_ADMIN' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(734918205);
    IF (SELECT count(*) FROM public.profiles
        WHERE role::text = 'SUPER_ADMIN' AND id <> NEW.id) >= 2 THEN
      RAISE EXCEPTION 'Cannot assign SUPER_ADMIN role: limit of two reached.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_max_two_super_admins() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enforce_max_two_super_admins ON public.profiles;
CREATE TRIGGER trg_enforce_max_two_super_admins
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.enforce_max_two_super_admins();
