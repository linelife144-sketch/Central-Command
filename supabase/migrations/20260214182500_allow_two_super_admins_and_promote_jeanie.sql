-- Allow up to two SUPER_ADMIN profiles and promote Jeanie Campbell.

DROP INDEX IF EXISTS public.idx_profiles_single_super_admin;

CREATE OR REPLACE FUNCTION public.enforce_max_two_super_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  super_admin_count INTEGER;
BEGIN
  IF NEW.role <> 'SUPER_ADMIN' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO super_admin_count
  FROM public.profiles p
  WHERE p.role = 'SUPER_ADMIN'
    AND p.id <> NEW.id;

  IF super_admin_count >= 2 THEN
    RAISE EXCEPTION 'Cannot assign SUPER_ADMIN role: limit of 2 super admins reached.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_two_super_admins ON public.profiles;
CREATE TRIGGER trg_enforce_max_two_super_admins
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_max_two_super_admins();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(email) = 'jcampbell@gridelectriccorp.com'
  ) THEN
    RAISE EXCEPTION 'Cannot promote Jeanie Campbell: profile with email jcampbell@gridelectriccorp.com was not found.';
  END IF;
END;
$$;

UPDATE public.profiles
SET role = 'SUPER_ADMIN',
    updated_at = NOW()
WHERE lower(email) = 'jcampbell@gridelectriccorp.com';

DO $$
DECLARE
  super_admin_total INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO super_admin_total
  FROM public.profiles
  WHERE role = 'SUPER_ADMIN';

  IF super_admin_total > 2 THEN
    RAISE EXCEPTION 'SUPER_ADMIN limit exceeded after migration. Expected <= 2, got %.', super_admin_total;
  END IF;
END;
$$;
