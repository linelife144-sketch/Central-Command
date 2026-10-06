-- Existing single-contractor assignments must pass through team/crew dispatch before fieldwork.
CREATE FUNCTION private.guard_dispatched_fieldwork() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text IN ('IN_ROUTE','ON_SITE','IN_PROGRESS') AND NOT EXISTS(
  SELECT 1 FROM public.field_crews c WHERE c.id=NEW.crew_id AND c.is_active AND c.storm_event_id=NEW.storm_event_id
   AND c.team_lead_id=NEW.team_lead_id AND c.assessor_id=NEW.assigned_to AND c.driver_id=NEW.assigned_driver_id
 ) THEN RAISE EXCEPTION 'A storm manager must assign a team lead and driver/assessor crew before fieldwork starts' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_dispatched_fieldwork() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_dispatched_fieldwork BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION private.guard_dispatched_fieldwork();
NOTIFY pgrst,'reload schema';
