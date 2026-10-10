-- Add narrow lifecycle guards while preserving all activated authority guards.
-- No existing function, trigger, grant, policy, or business row is replaced.
CREATE FUNCTION private.guard_last_storm_manager_setup()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user='authenticated'
 AND NEW.must_reset_password AND NOT OLD.must_reset_password
 AND OLD.is_active AND private.authority_role(OLD.role::text)='SUPER_ADMIN' THEN
  -- The existing authorization trigger independently protects actor, CEO and self.
  PERFORM pg_advisory_xact_lock(734918206);
  IF NOT EXISTS(
   SELECT 1 FROM public.profiles p WHERE p.id<>OLD.id
    AND private.authority_role(p.role::text)='SUPER_ADMIN' AND p.is_active
    AND private.has_permission(p.id,'admin.users.edit')
  ) THEN RAISE EXCEPTION 'Keep one active Storm Manager'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_last_storm_manager_setup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_last_storm_manager_setup BEFORE UPDATE OF must_reset_password ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.guard_last_storm_manager_setup();

CREATE FUNCTION private.guard_storm_manager_reactivation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); candidate public.profiles;
BEGIN
 -- Only reactivation/restoration of a configured operational storm needs this check.
 -- Closed history and unchanged null compatibility remain covered by existing guards.
 IF NEW.responsible_manager_id IS NULL OR NEW.status='CLOSED' OR coalesce(NEW.is_deleted,false)
 OR NOT (OLD.status='CLOSED' OR coalesce(OLD.is_deleted,false)) THEN RETURN NEW; END IF;
 IF actor IS NULL OR NOT private.has_permission(actor,'admin.storms.edit') THEN
  RAISE EXCEPTION 'Storm management permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO candidate FROM public.profiles WHERE id=NEW.responsible_manager_id FOR SHARE;
 IF candidate.id IS NULL OR candidate.role::text NOT IN ('STORM_MANAGER','SUPER_ADMIN')
 OR NOT candidate.is_active OR candidate.must_reset_password
 OR NOT private.has_permission(candidate.id,'admin.storms.edit') THEN
  RAISE EXCEPTION 'Select an active, setup-complete Storm Manager with storm management access' USING ERRCODE='23514'; END IF;
 -- The assignment is unchanged, so do not write an assignment audit event.
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_storm_manager_reactivation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_storm_manager_reactivation BEFORE UPDATE OF status,is_deleted ON public.storm_events FOR EACH ROW EXECUTE FUNCTION private.guard_storm_manager_reactivation();
