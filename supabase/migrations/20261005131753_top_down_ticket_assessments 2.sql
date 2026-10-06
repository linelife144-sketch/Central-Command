-- Required top-down field assessments. Historical records stay readable.
ALTER TABLE public.damage_assessments ADD COLUMN field_assessment jsonb, ADD COLUMN photo_evidence jsonb;
-- Retain assessment history when a ticket needs rework; retries reuse the row ID.
DO $$DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.damage_assessments'::regclass AND contype='u' AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.damage_assessments'::regclass AND attname='ticket_id')]::smallint[] LOOP
 EXECUTE format('ALTER TABLE public.damage_assessments DROP CONSTRAINT %I', c.conname);
 END LOOP;
END$$;
CREATE INDEX IF NOT EXISTS damage_assessments_ticket_created_idx ON public.damage_assessments(ticket_id,created_at DESC);
ALTER TABLE public.damage_assessments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.damage_assessments TO authenticated;
-- Existing restrictive active-profile, onboarding, module and ownership policies remain.
DROP POLICY IF EXISTS payroll_admin_no_update ON public.damage_assessments;
CREATE POLICY field_assessment_reviewer_update ON public.damage_assessments AS RESTRICTIVE
 FOR UPDATE TO authenticated USING(private.has_permission((SELECT auth.uid()),'admin.assessments.edit'))
 WITH CHECK(private.has_permission((SELECT auth.uid()),'admin.assessments.edit'));

CREATE OR REPLACE FUNCTION private.validate_field_assessment(payload jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $fn$
DECLARE defs jsonb := $defs$[{"key":"phases","label":"Number of phases","kind":"select","options":["1","2","3"]},{"key":"framing","label":"Framing type","kind":"select","options":["TANGENT","DOUBLE_DEAD_END","ANGLE","DEAD_END"]},{"key":"hasTap","label":"Is there a tap?","kind":"boolean"},{"key":"tapPhases","label":"Tap phases","kind":"select","options":["1","2","3"],"when":{"key":"hasTap","value":true}},{"key":"treeCrewsNeeded","label":"Are tree crews needed?","kind":"boolean"},{"key":"treeWorkload","label":"Tree crew workload","kind":"select","options":["LIGHT","MODERATE","HEAVY"],"when":{"key":"treeCrewsNeeded","value":true}},{"key":"treeDamage","label":"Describe vegetation damage","kind":"text","when":{"key":"treeCrewsNeeded","value":true}},{"key":"poleBroken","label":"Is the pole broken?","kind":"boolean"},{"key":"poleHeight","label":"Pole height (feet)","kind":"select","options":["35","40","45","50","55","60","65"],"when":{"key":"poleBroken","value":true}},{"key":"poleAccessible","label":"Is the pole accessible?","kind":"boolean","when":{"key":"poleBroken","value":true}},{"key":"poleDamage","label":"Describe pole damage and access","kind":"text","when":{"key":"poleBroken","value":true}},{"key":"conductorBroken","label":"Is the conductor broken?","kind":"boolean"},{"key":"conductorSize","label":"Conductor size","kind":"select","options":["#6","#4","#2","#1","1/0","2/0","4/0","336","556","795"],"when":{"key":"conductorBroken","value":true}},{"key":"spansDown","label":"Spans down","kind":"select","options":["1","2","3","4","5","6","7","8","9","10"],"when":{"key":"conductorBroken","value":true}},{"key":"conductorDamage","label":"Describe conductor damage","kind":"text","when":{"key":"conductorBroken","value":true}},{"key":"transformerDown","label":"Is a transformer down?","kind":"boolean"},{"key":"transformerKva","label":"Transformer size (kVA)","kind":"select","options":["5","10","15","25","37.5","50","75","100"],"when":{"key":"transformerDown","value":true}},{"key":"transformerCount","label":"Transformers down","kind":"select","options":["1","2","3"],"when":{"key":"transformerDown","value":true}},{"key":"transformerDamage","label":"Describe transformer damage","kind":"text","when":{"key":"transformerDown","value":true}},{"key":"servicesDamaged","label":"Are any services damaged?","kind":"boolean"},{"key":"serviceCount","label":"Number of damaged services","kind":"count","when":{"key":"servicesDamaged","value":true},"minimum":1},{"key":"serviceSize","label":"Service conductor size","kind":"select","options":["4/0","2/0","1/0","#2","#4","#6"],"when":{"key":"servicesDamaged","value":true}},{"key":"serviceConfiguration","label":"Service configuration","kind":"select","options":["DUPLEX","TRIPLEX","QUADRUPLEX"],"when":{"key":"servicesDamaged","value":true}},{"key":"serviceDamage","label":"Describe service damage","kind":"text","when":{"key":"servicesDamaged","value":true}},{"key":"hasCrossArm","label":"Does the pole have a cross arm?","kind":"boolean"},{"key":"crossArmMaterial","label":"Cross arm material","kind":"select","options":["WOOD","METAL","FIBER"],"when":{"key":"hasCrossArm","value":true}},{"key":"crossArmsDamaged","label":"Are any cross arms damaged?","kind":"boolean","when":{"key":"hasCrossArm","value":true}},{"key":"crossArmCount","label":"Number of damaged cross arms","kind":"count","when":{"key":"crossArmsDamaged","value":true},"minimum":1},{"key":"crossArmDamage","label":"Describe cross arm damage","kind":"text","when":{"key":"crossArmsDamaged","value":true}},{"key":"insulatorsBroken","label":"Are any insulators broken?","kind":"boolean"},{"key":"insulatorCount","label":"Number of broken insulators","kind":"count","when":{"key":"insulatorsBroken","value":true},"minimum":1},{"key":"insulatorDamage","label":"Describe insulator damage","kind":"text","when":{"key":"insulatorsBroken","value":true}},{"key":"publicDanger","label":"Is the public in danger?","kind":"boolean"},{"key":"publicDangerDetails","label":"Describe the public danger","kind":"text","when":{"key":"publicDanger","value":true}},{"key":"oilLeak","label":"Is equipment leaking oil?","kind":"boolean"},{"key":"oilLeakDetails","label":"Describe the oil leak and environmental impact","kind":"text","when":{"key":"oilLeak","value":true}},{"key":"additionalNotes","label":"Additional notes","kind":"notes"}]$defs$::jsonb; f jsonb; answers jsonb; v jsonb; active boolean; key text;
BEGIN
 IF payload IS NULL OR jsonb_typeof(payload)<>'object' OR payload->'version' IS DISTINCT FROM '1'::jsonb OR jsonb_typeof(payload->'answers') IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(payload))<>2 THEN RETURN false; END IF;
 answers:=payload->'answers';
 IF (SELECT count(*) FROM jsonb_object_keys(answers))<>jsonb_array_length(defs) THEN RETURN false; END IF;
 FOR f IN SELECT value FROM jsonb_array_elements(defs) LOOP
  key:=f->>'key'; IF NOT answers ? key THEN RETURN false; END IF; v:=answers->key;
  active:=NOT(f ? 'when') OR answers->(f->'when'->>'key')=f->'when'->'value';
  IF NOT coalesce(active,false) THEN IF v IS DISTINCT FROM 'null'::jsonb THEN RETURN false; END IF; CONTINUE; END IF;
  IF f->>'kind'='boolean' THEN IF jsonb_typeof(v) IS DISTINCT FROM 'boolean' THEN RETURN false; END IF;
  ELSIF f->>'kind'='select' THEN IF jsonb_typeof(v) IS DISTINCT FROM 'string' OR NOT (f->'options' @> jsonb_build_array(v)) THEN RETURN false; END IF;
  ELSIF f->>'kind'='count' THEN
   IF jsonb_typeof(v) IS DISTINCT FROM 'number' THEN RETURN false; END IF;
   IF (v#>>'{}')::numeric < coalesce((f->>'minimum')::numeric,1) OR (v#>>'{}')::numeric > 2147483647 OR (v#>>'{}')::numeric<>trunc((v#>>'{}')::numeric) THEN RETURN false; END IF;
  ELSE
   IF jsonb_typeof(v) IS DISTINCT FROM 'string' OR length(btrim(v#>>'{}'))=0 OR length(v#>>'{}')>(CASE WHEN f->>'kind'='notes' THEN 4000 ELSE 2000 END) THEN RETURN false; END IF;
  END IF;
 END LOOP;
 RETURN true;
END $fn$;
REVOKE ALL ON FUNCTION private.validate_field_assessment(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.validate_field_assessment(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION private.guard_field_assessment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=auth.uid(); role_name text:=private.active_profile_role(); ticket public.tickets; photo jsonb; kind text; damage_key text;
BEGIN
 IF actor IS NULL OR role_name IS NULL OR NOT private.contractor_portal_ready() THEN RAISE EXCEPTION 'Active signed-in profile required' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['reviewed_by','reviewed_at','review_notes','updated_at','updated_by']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['reviewed_by','reviewed_at','review_notes','updated_at','updated_by']) THEN RAISE EXCEPTION 'Submitted assessments are immutable; submit a new assessment for rework' USING ERRCODE='23514'; END IF;
  IF NOT private.has_permission(actor,'admin.assessments.edit') THEN RAISE EXCEPTION 'Assessment review permission required' USING ERRCODE='42501'; END IF;
  NEW.reviewed_by:=actor; NEW.reviewed_at:=now(); NEW.updated_by:=actor; NEW.updated_at:=now(); RETURN NEW;
 END IF;
 IF NOT private.validate_field_assessment(NEW.field_assessment) THEN RAISE EXCEPTION 'Complete every required field using predefined assessment values' USING ERRCODE='23514'; END IF;
 SELECT * INTO ticket FROM public.tickets WHERE id=NEW.ticket_id FOR UPDATE;
 IF ticket.id IS NULL OR ticket.is_deleted IS TRUE OR ticket.status::text NOT IN ('ON_SITE','IN_PROGRESS','NEEDS_REWORK') OR ticket.assigned_to IS DISTINCT FROM NEW.contractor_id THEN RAISE EXCEPTION 'Assessment requires the assigned ticket at an on-site work status' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id WHERE c.id=NEW.contractor_id AND c.is_deleted IS NOT TRUE AND p.is_active AND (c.profile_id=actor OR private.has_permission(actor,'admin.assessments.edit'))) THEN RAISE EXCEPTION 'Cannot assess another contractor ticket' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(NEW.photo_evidence) IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.photo_evidence)<4 THEN RAISE EXCEPTION 'Four photo views are required' USING ERRCODE='23514'; END IF;
 FOR kind IN SELECT unnest(ARRAY['OVERVIEW','EQUIPMENT','DAMAGE','SAFETY']) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.photo_evidence) p WHERE p->>'type'=kind) THEN RAISE EXCEPTION 'Missing required photo view: %',kind USING ERRCODE='23514'; END IF;
 END LOOP;
 FOR photo IN SELECT value FROM jsonb_array_elements(NEW.photo_evidence) LOOP
  IF jsonb_typeof(photo->'gpsLatitude') IS DISTINCT FROM 'number' OR jsonb_typeof(photo->'gpsLongitude') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Photo GPS required' USING ERRCODE='23514'; END IF;
  IF abs((photo->>'gpsLatitude')::numeric)>90 OR abs((photo->>'gpsLongitude')::numeric)>180 THEN RAISE EXCEPTION 'Invalid photo GPS' USING ERRCODE='23514'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.photo_evidence) p WHERE coalesce(p->>'id','')='') OR (SELECT count(DISTINCT p->>'id') FROM jsonb_array_elements(NEW.photo_evidence) p)<>jsonb_array_length(NEW.photo_evidence) THEN RAISE EXCEPTION 'Each photo must have a unique identifier' USING ERRCODE='23514'; END IF;
 FOR damage_key IN SELECT unnest(ARRAY['treeDamage','poleDamage','conductorDamage','transformerDamage','serviceDamage','crossArmDamage','insulatorDamage','publicDangerDetails','oilLeakDetails']) LOOP
  IF NEW.field_assessment->'answers'->damage_key IS DISTINCT FROM 'null'::jsonb AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.photo_evidence) p WHERE p->>'sectionKey'=damage_key AND p->>'type'='DAMAGE') THEN RAISE EXCEPTION 'Damage photo required in section: %',damage_key USING ERRCODE='23514'; END IF;
 END LOOP;
 FOR photo IN SELECT value FROM jsonb_array_elements(NEW.photo_evidence) LOOP
  IF photo ? 'sectionKey' AND photo->'sectionKey'<>'null'::jsonb AND (photo->>'type'<>'DAMAGE' OR NOT(photo->>'sectionKey'=ANY(ARRAY['treeDamage','poleDamage','conductorDamage','transformerDamage','serviceDamage','crossArmDamage','insulatorDamage','publicDangerDetails','oilLeakDetails'])) OR NEW.field_assessment->'answers'->(photo->>'sectionKey')='null'::jsonb) THEN RAISE EXCEPTION 'Photo section does not match reported damage' USING ERRCODE='23514'; END IF;
 END LOOP;
 NEW.assessed_by:=actor; NEW.created_by:=actor; NEW.updated_by:=actor; NEW.assessed_at:=now(); NEW.created_at:=now(); NEW.updated_at:=now();
 NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL; NEW.review_notes:=NULL;
 NEW.priority:=CASE WHEN NEW.field_assessment->'answers'->'publicDanger'='true'::jsonb OR NEW.field_assessment->'answers'->'oilLeak'='true'::jsonb THEN 'A'::public.priority_level ELSE 'C'::public.priority_level END;
 NEW.safety_observations:=jsonb_build_object('downed_conductors',NEW.field_assessment->'answers'->'conductorBroken','damaged_insulators',NEW.field_assessment->'answers'->'insulatorsBroken','vegetation_contact',NEW.field_assessment->'answers'->'treeCrewsNeeded','structural_damage',NEW.field_assessment->'answers'->'poleBroken','public_accessible',NEW.field_assessment->'answers'->'publicDanger','fire_hazard',false,'safe_distance_maintained',false);
 NEW.sync_status:='SYNCED'; RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION private.guard_field_assessment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_field_assessment BEFORE INSERT OR UPDATE ON public.damage_assessments FOR EACH ROW EXECUTE FUNCTION private.guard_field_assessment();

-- The worker guard accepts only this nested, upward hazard escalation.
CREATE OR REPLACE FUNCTION private.guard_worker_ticket_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF private.active_profile_role()='CONTRACTOR' THEN
  IF pg_trigger_depth()=2 AND NEW.severity='CRITICAL' AND NEW.is_important IS TRUE AND
   (to_jsonb(NEW)-ARRAY['severity','is_important','updated_at','updated_by']) IS NOT DISTINCT FROM (to_jsonb(OLD)-ARRAY['severity','is_important','updated_at','updated_by']) THEN NEW.updated_by:=auth.uid(); RETURN NEW; END IF;
  IF (to_jsonb(NEW)-ARRAY['status','updated_at','updated_by']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','updated_at','updated_by']) THEN RAISE EXCEPTION 'Worker ticket changes are limited to status updates' USING ERRCODE='42501'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
   (OLD.status='ASSIGNED' AND NEW.status='IN_ROUTE') OR (OLD.status='IN_ROUTE' AND NEW.status='ON_SITE')
   OR (OLD.status='ON_SITE' AND NEW.status='IN_PROGRESS') OR (OLD.status='IN_PROGRESS' AND NEW.status='COMPLETE')
   OR (OLD.status='COMPLETE' AND NEW.status='PENDING_REVIEW') OR (OLD.status='NEEDS_REWORK' AND NEW.status='IN_PROGRESS')) THEN RAISE EXCEPTION 'Invalid worker ticket status transition' USING ERRCODE='23514'; END IF;
  NEW.updated_by:=auth.uid();
 END IF;
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text IN ('COMPLETE','PENDING_REVIEW') AND NOT EXISTS(SELECT 1 FROM public.damage_assessments WHERE ticket_id=NEW.id) THEN RAISE EXCEPTION 'Submit the ticket assessment before completing this ticket' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION private.guard_worker_ticket_update() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.escalate_assessed_ticket() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE old_ticket jsonb;
BEGIN
 IF NEW.priority='A' AND NEW.field_assessment IS NOT NULL THEN
  SELECT to_jsonb(t) INTO old_ticket FROM public.tickets t WHERE t.id=NEW.ticket_id;
  UPDATE public.tickets SET severity='CRITICAL',is_important=true,updated_by=auth.uid() WHERE id=NEW.ticket_id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
  VALUES('ASSESSMENT_ESCALATION','ticket',NEW.ticket_id,auth.uid(),private.active_profile_role()::public.user_role,old_ticket,jsonb_build_object('assessment_id',NEW.id,'severity','CRITICAL','is_important',true),'Field assessment flagged public danger or leaking oil');
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION private.escalate_assessed_ticket() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER escalate_assessed_ticket AFTER INSERT ON public.damage_assessments FOR EACH ROW EXECUTE FUNCTION private.escalate_assessed_ticket();
