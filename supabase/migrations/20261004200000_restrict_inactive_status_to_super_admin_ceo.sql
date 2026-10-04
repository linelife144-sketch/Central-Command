-- "Inactive" contractor status == profiles.is_active = false (already in schema).
-- Restrict changing it to SUPER_ADMIN and CEO only.
CREATE OR REPLACE FUNCTION private.guard_profile_authorization() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user='authenticated' THEN
  IF TG_OP='INSERT' AND NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'User administration permission required'; END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.id<>auth.uid() AND NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'User administration permission required'; END IF;
   IF NEW.is_active IS DISTINCT FROM OLD.is_active
      AND COALESCE((SELECT p.role::text FROM public.profiles p WHERE p.id=auth.uid()),'') NOT IN ('SUPER_ADMIN','CEO') THEN
    RAISE EXCEPTION 'Only Super Admin or CEO can change active/inactive status';
   END IF;
   IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.is_email_verified IS DISTINCT FROM OLD.is_email_verified OR NEW.must_reset_password IS DISTINCT FROM OLD.must_reset_password OR NEW.mfa_enabled IS DISTINCT FROM OLD.mfa_enabled OR NEW.mfa_secret_encrypted IS DISTINCT FROM OLD.mfa_secret_encrypted) THEN
    IF NEW.id=auth.uid() OR OLD.role::text='CEO' OR NOT private.has_permission(auth.uid(),'admin.users.edit') THEN RAISE EXCEPTION 'Authorization fields are protected'; END IF;
    PERFORM pg_advisory_xact_lock(734918206);
    IF OLD.role::text='SUPER_ADMIN' AND (NEW.role::text<>'SUPER_ADMIN' OR NOT NEW.is_active) AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id<>OLD.id AND p.role::text='SUPER_ADMIN' AND p.is_active AND private.has_permission(p.id,'admin.users.edit')) THEN RAISE EXCEPTION 'Keep one active Super Admin'; END IF;
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
