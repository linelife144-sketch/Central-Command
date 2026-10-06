-- Ticket-owned editable drafts, immutable submitted revisions, and two review stages.
CREATE TABLE public.field_crews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), storm_event_id uuid NOT NULL REFERENCES public.storm_events(id),
 team_lead_id uuid NOT NULL REFERENCES public.profiles(id), name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 100),
 driver_id uuid NOT NULL REFERENCES public.contractors(id), assessor_id uuid NOT NULL REFERENCES public.contractors(id),
 is_active boolean NOT NULL DEFAULT true, created_by uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(driver_id<>assessor_id)
);
CREATE INDEX field_crews_team_lead_idx ON public.field_crews(team_lead_id);
CREATE INDEX field_crews_created_by_idx ON public.field_crews(created_by);
CREATE UNIQUE INDEX field_crews_active_driver_idx ON public.field_crews(storm_event_id,driver_id) WHERE is_active;
CREATE UNIQUE INDEX field_crews_active_assessor_idx ON public.field_crews(storm_event_id,assessor_id) WHERE is_active;
ALTER TABLE public.tickets ADD COLUMN team_lead_id uuid REFERENCES public.profiles(id), ADD COLUMN assigned_driver_id uuid REFERENCES public.contractors(id),
 ADD COLUMN crew_id uuid REFERENCES public.field_crews(id), ADD COLUMN current_assessment_id uuid REFERENCES public.damage_assessments(id),
 ADD COLUMN review_stage text NOT NULL DEFAULT 'FIELDWORK' CHECK(review_stage IN ('FIELDWORK','TEAM_LEAD_REVIEW','FINAL_REVIEW','APPROVED','CORRECTIONS','UTILITY_SUBMITTED')),
 ADD COLUMN utility_submitted_at timestamptz, ADD COLUMN utility_submitted_by uuid REFERENCES public.profiles(id), ADD COLUMN utility_submission_reference text;
CREATE INDEX tickets_team_lead_idx ON public.tickets(team_lead_id);
CREATE INDEX tickets_driver_idx ON public.tickets(assigned_driver_id);
CREATE INDEX tickets_crew_idx ON public.tickets(crew_id);
CREATE INDEX tickets_current_assessment_idx ON public.tickets(current_assessment_id);
CREATE INDEX tickets_utility_submitted_by_idx ON public.tickets(utility_submitted_by);
ALTER TABLE public.damage_assessments ADD COLUMN review_stage text NOT NULL DEFAULT 'TEAM_LEAD_REVIEW' CHECK(review_stage IN ('TEAM_LEAD_REVIEW','FINAL_REVIEW','APPROVED','NEEDS_REWORK')),
 ADD COLUMN team_reviewed_by uuid REFERENCES public.profiles(id), ADD COLUMN team_reviewed_at timestamptz, ADD COLUMN team_review_notes text;
CREATE INDEX assessments_team_reviewed_by_idx ON public.damage_assessments(team_reviewed_by);
CREATE TABLE public.ticket_assessment_drafts (
 ticket_id uuid PRIMARY KEY REFERENCES public.tickets(id), assessment_id uuid NOT NULL UNIQUE,
 contractor_id uuid NOT NULL REFERENCES public.contractors(id), field_assessment jsonb NOT NULL, photo_evidence jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), saved_by uuid NOT NULL REFERENCES public.profiles(id), saved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_assessment_drafts_contractor_idx ON public.ticket_assessment_drafts(contractor_id);
CREATE INDEX ticket_assessment_drafts_saved_by_idx ON public.ticket_assessment_drafts(saved_by);
ALTER TABLE public.notification_logs ADD COLUMN dedup_key text;
CREATE UNIQUE INDEX notification_logs_dedup_idx ON public.notification_logs(dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS notification_logs_inbox_idx ON public.notification_logs(user_id,created_at DESC);

-- Admin is the team lead account role. Staff permissions do not alter contractor pay roles.
CREATE OR REPLACE FUNCTION private.has_permission(p_profile_id uuid,p_key text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r text; active boolean; def boolean; privileged boolean; effect text; permitted boolean;
BEGIN
 SELECT role::text,(is_active AND NOT must_reset_password) INTO r,active FROM public.profiles WHERE id=p_profile_id;
 IF NOT coalesce(active,false) OR r NOT IN ('CEO','SUPER_ADMIN','ADMIN') THEN RETURN false; END IF;
 IF r='ADMIN' AND p_key NOT IN ('admin.tickets.view','admin.tickets.edit','admin.assessments.view','admin.assessments.edit') THEN RETURN false; END IF;
 SELECT admin_default,c.privileged INTO def,privileged FROM private.permission_catalog c WHERE permission_key=p_key;
 IF NOT FOUND OR (privileged AND r NOT IN ('CEO','SUPER_ADMIN')) THEN RETURN false; END IF;
 SELECT u.effect INTO effect FROM public.user_permissions u WHERE profile_id=p_profile_id AND permission_key=p_key;
 permitted:=CASE WHEN effect IS NOT NULL THEN effect='allow' WHEN r IN ('CEO','SUPER_ADMIN','ADMIN') THEN true ELSE def END;
 IF p_key LIKE '%.edit' THEN permitted:=permitted AND private.has_permission(p_profile_id,regexp_replace(p_key,'\.edit$','.view')); END IF;
 RETURN coalesce(permitted,false);
END $$;
CREATE OR REPLACE FUNCTION private.can_access_ticket(p_ticket_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.contractor_portal_ready() AND EXISTS(
 SELECT 1 FROM public.tickets t WHERE t.id=p_ticket_id AND NOT coalesce(t.is_deleted,false) AND (
 (private.active_profile_role() IN ('CEO','SUPER_ADMIN') AND private.has_permission((SELECT auth.uid()),'admin.tickets.view')) OR
 (private.active_profile_role()='ADMIN' AND t.team_lead_id=(SELECT auth.uid()) AND private.has_permission((SELECT auth.uid()),'admin.tickets.view')) OR
 (private.active_profile_role()='CONTRACTOR' AND EXISTS(SELECT 1 FROM public.contractors c WHERE c.profile_id=(SELECT auth.uid()) AND NOT coalesce(c.is_deleted,false) AND c.id IN(t.assigned_to,t.assigned_driver_id)))));
$$;
CREATE OR REPLACE FUNCTION private.can_assess_ticket(p_ticket_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.can_access_ticket(p_ticket_id) AND EXISTS(SELECT 1 FROM public.tickets t WHERE t.id=p_ticket_id AND
 (private.active_profile_role() IN ('CEO','SUPER_ADMIN') AND private.has_permission((SELECT auth.uid()),'admin.assessments.edit') OR
 private.active_profile_role()='CONTRACTOR' AND EXISTS(SELECT 1 FROM public.contractors c WHERE c.id=t.assigned_to AND c.profile_id=(SELECT auth.uid()))));
$$;
REVOKE ALL ON FUNCTION private.can_access_ticket(uuid),private.can_assess_ticket(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.can_access_ticket(uuid),private.can_assess_ticket(uuid) TO authenticated;
ALTER TABLE public.field_crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_assessment_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.field_crews,public.ticket_assessment_drafts FROM anon,authenticated;
GRANT SELECT ON public.field_crews,public.ticket_assessment_drafts TO authenticated;
CREATE POLICY crews_read ON public.field_crews FOR SELECT TO authenticated USING(
 private.contractor_portal_ready() AND (private.active_profile_role() IN ('CEO','SUPER_ADMIN') AND private.has_permission((SELECT auth.uid()),'admin.tickets.view') OR
 team_lead_id=(SELECT auth.uid()) OR EXISTS(SELECT 1 FROM public.contractors c WHERE c.profile_id=(SELECT auth.uid()) AND c.id IN(driver_id,assessor_id))));
CREATE POLICY ticket_drafts_read ON public.ticket_assessment_drafts FOR SELECT TO authenticated USING(private.can_access_ticket(ticket_id));
CREATE POLICY ticket_team_scope ON public.tickets AS RESTRICTIVE FOR SELECT TO authenticated USING(private.can_access_ticket(id));
DROP POLICY worker_ticket_isolation ON public.tickets;
CREATE POLICY worker_ticket_isolation ON public.tickets AS RESTRICTIVE FOR ALL TO authenticated USING(private.active_profile_role()<>'CONTRACTOR' OR private.can_access_ticket(id)) WITH CHECK(private.active_profile_role()<>'CONTRACTOR' OR private.can_access_ticket(id));
CREATE POLICY crew_ticket_read ON public.tickets FOR SELECT TO authenticated USING(private.can_access_ticket(id));
CREATE POLICY crew_ticket_field_status ON public.tickets FOR UPDATE TO authenticated USING(private.active_profile_role()='CONTRACTOR' AND private.can_access_ticket(id)) WITH CHECK(private.active_profile_role()='CONTRACTOR' AND private.can_access_ticket(id));
DROP POLICY payroll_worker_ownership ON public.damage_assessments;
CREATE POLICY assessment_ticket_scope ON public.damage_assessments AS RESTRICTIVE FOR SELECT TO authenticated USING(private.can_access_ticket(ticket_id));
CREATE POLICY crew_assessment_read ON public.damage_assessments FOR SELECT TO authenticated USING(private.can_access_ticket(ticket_id));
-- All submitted revision changes go through guarded workflow functions.
REVOKE INSERT,UPDATE,DELETE ON public.damage_assessments FROM authenticated;
CREATE POLICY crew_payload_read ON public.ticket_payloads FOR SELECT TO authenticated USING(private.can_access_ticket(ticket_id));
CREATE POLICY payload_team_scope ON public.ticket_payloads AS RESTRICTIVE FOR SELECT TO authenticated USING(private.can_access_ticket(ticket_id));
CREATE POLICY crew_history_read ON public.ticket_status_history FOR SELECT TO authenticated USING(private.can_access_ticket(ticket_id));
CREATE POLICY history_team_scope ON public.ticket_status_history AS RESTRICTIVE FOR SELECT TO authenticated USING(private.can_access_ticket(ticket_id));
-- Team leads receive ticket workspaces, not other operational or financial modules.
DO $$DECLARE t text; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity AND c.relname NOT IN ('tickets','ticket_payloads','ticket_status_history','damage_assessments','equipment_assessments','media_assets','notification_logs','profiles','contractors','user_permissions','user_permission_versions','field_crews','ticket_assessment_drafts') LOOP
 EXECUTE format('CREATE POLICY team_lead_ticket_workspace_only ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(private.active_profile_role() IS DISTINCT FROM ''ADMIN'') WITH CHECK(private.active_profile_role() IS DISTINCT FROM ''ADMIN'')',t);
 END LOOP;
END $$;
CREATE POLICY team_lead_profiles_self ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING(private.active_profile_role()<>'ADMIN' OR id=(SELECT auth.uid()));
CREATE POLICY team_lead_no_contractor_records ON public.contractors AS RESTRICTIVE FOR ALL TO authenticated USING(private.active_profile_role()<>'ADMIN') WITH CHECK(private.active_profile_role()<>'ADMIN');

-- Prevent direct table writes from skipping dispatch/review. Private RPC operations run as their owner.
CREATE OR REPLACE FUNCTION private.guard_worker_ticket_update() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user='authenticated' THEN
  IF private.active_profile_role()='ADMIN' THEN RAISE EXCEPTION 'Use ticket crew assignment and review actions' USING ERRCODE='42501'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text IN ('COMPLETE','PENDING_REVIEW','APPROVED','NEEDS_REWORK','CLOSED') THEN RAISE EXCEPTION 'Use the assessment submission and review workflow' USING ERRCODE='23514'; END IF;
  IF NEW.team_lead_id IS DISTINCT FROM OLD.team_lead_id OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to OR NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id OR NEW.crew_id IS DISTINCT FROM OLD.crew_id OR NEW.current_assessment_id IS DISTINCT FROM OLD.current_assessment_id OR NEW.review_stage IS DISTINCT FROM OLD.review_stage OR NEW.utility_submitted_at IS DISTINCT FROM OLD.utility_submitted_at OR NEW.utility_submission_reference IS DISTINCT FROM OLD.utility_submission_reference OR NEW.utility_submitted_by IS DISTINCT FROM OLD.utility_submitted_by THEN RAISE EXCEPTION 'Use the guarded ticket workflow actions' USING ERRCODE='42501'; END IF;
  IF private.active_profile_role()='CONTRACTOR' THEN
   IF NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Use the GPS-validated field status action' USING ERRCODE='42501'; END IF;
   IF (to_jsonb(NEW)-ARRAY['status','updated_at','updated_by']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','updated_at','updated_by']) THEN RAISE EXCEPTION 'Worker ticket changes are limited to status updates' USING ERRCODE='42501'; END IF;
   IF NEW.status IS DISTINCT FROM OLD.status AND NOT((OLD.status='ASSIGNED' AND NEW.status='IN_ROUTE') OR (OLD.status='IN_ROUTE' AND NEW.status='ON_SITE') OR (OLD.status='ON_SITE' AND NEW.status='IN_PROGRESS') OR (OLD.status='NEEDS_REWORK' AND NEW.status='IN_PROGRESS')) THEN RAISE EXCEPTION 'Invalid worker ticket status transition' USING ERRCODE='23514'; END IF;
  END IF;
  NEW.updated_by:=auth.uid();
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION private.guard_ticket_intake() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user='authenticated' AND (private.active_profile_role() NOT IN ('CEO','SUPER_ADMIN') OR NEW.assigned_to IS NOT NULL OR NEW.team_lead_id IS NOT NULL OR NEW.crew_id IS NOT NULL OR NEW.assigned_driver_id IS NOT NULL OR NEW.current_assessment_id IS NOT NULL OR NEW.status<>'DRAFT' OR NEW.review_stage<>'FIELDWORK' OR NEW.utility_submitted_at IS NOT NULL OR NEW.utility_submitted_by IS NOT NULL OR NEW.utility_submission_reference IS NOT NULL) THEN RAISE EXCEPTION 'Create an unassigned draft ticket, then use crew dispatch' USING ERRCODE='42501'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION private.guard_ticket_intake(),private.guard_worker_ticket_update() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER ticket_intake_workflow BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION private.guard_ticket_intake();

CREATE FUNCTION private.assert_ticket_evidence(p_ticket_id uuid,p_payload jsonb,p_photos jsonb,p_require_uploaded boolean) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$ DECLARE evidence jsonb; k text; BEGIN
 IF NOT private.validate_field_assessment(p_payload) THEN RAISE EXCEPTION 'Complete every required assessment answer' USING ERRCODE='23514'; END IF;
 IF jsonb_typeof(p_photos) IS DISTINCT FROM 'array' OR jsonb_array_length(p_photos)<4 THEN RAISE EXCEPTION 'Four GPS-verified photo views are required' USING ERRCODE='23514'; END IF;
 FOREACH k IN ARRAY ARRAY['OVERVIEW','EQUIPMENT','DAMAGE','SAFETY'] LOOP
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_photos) p WHERE p->>'type'=k) THEN RAISE EXCEPTION 'Missing required photo view: %',k USING ERRCODE='23514'; END IF; END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_photos) p WHERE coalesce(p->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') OR (SELECT count(DISTINCT p->>'id') FROM jsonb_array_elements(p_photos) p)<>jsonb_array_length(p_photos) THEN RAISE EXCEPTION 'Each photo must have a unique valid ID' USING ERRCODE='23514'; END IF;
 FOREACH k IN ARRAY ARRAY['treeDamage','poleDamage','conductorDamage','transformerDamage','serviceDamage','crossArmDamage','insulatorDamage','publicDangerDetails','oilLeakDetails'] LOOP
 IF p_payload->'answers'->k IS DISTINCT FROM 'null'::jsonb AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_photos) p WHERE p->>'sectionKey'=k AND p->>'type'='DAMAGE') THEN RAISE EXCEPTION 'Damage photo required in section: %',k USING ERRCODE='23514'; END IF; END LOOP;
 FOR evidence IN SELECT value FROM jsonb_array_elements(p_photos) LOOP
 IF evidence->>'type' IS NULL OR evidence->>'type' NOT IN ('OVERVIEW','EQUIPMENT','DAMAGE','SAFETY','CONTEXT') OR jsonb_typeof(evidence->'gpsLatitude') IS DISTINCT FROM 'number' OR jsonb_typeof(evidence->'gpsLongitude') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Valid photo type and GPS required' USING ERRCODE='23514'; END IF;
 IF abs((evidence->>'gpsLatitude')::numeric)>90 OR abs((evidence->>'gpsLongitude')::numeric)>180 THEN RAISE EXCEPTION 'Invalid photo GPS' USING ERRCODE='23514'; END IF;
 IF evidence ? 'sectionKey' AND evidence->'sectionKey'<>'null'::jsonb AND (evidence->>'type'<>'DAMAGE' OR NOT(evidence->>'sectionKey'=ANY(ARRAY['treeDamage','poleDamage','conductorDamage','transformerDamage','serviceDamage','crossArmDamage','insulatorDamage','publicDangerDetails','oilLeakDetails'])) OR p_payload->'answers'->(evidence->>'sectionKey')='null'::jsonb) THEN RAISE EXCEPTION 'Photo section does not match reported damage' USING ERRCODE='23514'; END IF;
 IF p_require_uploaded AND NOT EXISTS(SELECT 1 FROM public.media_assets m WHERE m.id=(evidence->>'id')::uuid AND m.entity_type='ticket' AND m.entity_id=p_ticket_id AND m.upload_status='COMPLETED' AND m.storage_bucket='assessment-photos' AND m.gps_latitude=(evidence->>'gpsLatitude')::numeric AND m.gps_longitude=(evidence->>'gpsLongitude')::numeric AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=m.storage_bucket AND o.name=m.storage_path)) THEN RAISE EXCEPTION 'Photo evidence is still uploading. Sync the ticket before submitting.' USING ERRCODE='23514'; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION private.assert_ticket_evidence(uuid,jsonb,jsonb,boolean) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.notify_ticket_user(p_user uuid,p_ticket uuid,p_title text,p_body text,p_key text) RETURNS void
LANGUAGE sql SET search_path='' AS $$
 INSERT INTO public.notification_logs(user_id,notification_type,title,body,data,channel,status,sent_at,dedup_key)
 SELECT p_user,'TICKET_UPDATED',p_title,p_body,jsonb_build_object('ticketId',p_ticket,'href','/tickets/'||p_ticket||'?tab=assessment'),'IN_APP','SENT',now(),p_key
 WHERE EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user AND is_active) ON CONFLICT(dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;
$$;
REVOKE ALL ON FUNCTION private.notify_ticket_user(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.save_ticket_assessment_draft(p_ticket_id uuid,p_assessment_id uuid,p_payload jsonb,p_photos jsonb,p_expected_version integer DEFAULT NULL) RETURNS public.ticket_assessment_drafts
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE t public.tickets; d public.ticket_assessment_drafts; BEGIN
 IF NOT private.can_assess_ticket(p_ticket_id) THEN RAISE EXCEPTION 'Only the assigned assessor or authorized storm manager can save this assessment' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 IF t.assigned_to IS NULL OR t.status::text NOT IN ('ON_SITE','IN_PROGRESS','NEEDS_REWORK') THEN RAISE EXCEPTION 'The assigned crew must be on site before saving an assessment' USING ERRCODE='23514'; END IF;
 PERFORM private.assert_ticket_evidence(p_ticket_id,p_payload,p_photos,false);
 SELECT * INTO d FROM public.ticket_assessment_drafts WHERE ticket_id=p_ticket_id FOR UPDATE;
 IF d.ticket_id IS NOT NULL AND d.assessment_id=p_assessment_id AND d.field_assessment=p_payload AND d.photo_evidence=p_photos THEN RETURN d; END IF;
 IF d.ticket_id IS NOT NULL AND (d.version IS DISTINCT FROM p_expected_version OR d.assessment_id<>p_assessment_id) THEN RAISE EXCEPTION 'This draft changed on another device. Reload the ticket before saving.' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT 1 FROM public.damage_assessments WHERE id=p_assessment_id) THEN RAISE EXCEPTION 'Submitted revisions cannot be edited. Start a correction draft.' USING ERRCODE='23514'; END IF;
 INSERT INTO public.ticket_assessment_drafts(ticket_id,assessment_id,contractor_id,field_assessment,photo_evidence,saved_by)
 VALUES(p_ticket_id,p_assessment_id,t.assigned_to,p_payload,p_photos,auth.uid())
 ON CONFLICT(ticket_id) DO UPDATE SET field_assessment=EXCLUDED.field_assessment,photo_evidence=EXCLUDED.photo_evidence,version=ticket_assessment_drafts.version+1,saved_by=auth.uid(),saved_at=now() RETURNING * INTO d;
 IF p_payload->'answers'->'publicDanger'='true'::jsonb OR p_payload->'answers'->'oilLeak'='true'::jsonb THEN
 UPDATE public.tickets SET severity='CRITICAL',is_important=true,updated_by=auth.uid() WHERE id=t.id;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary) VALUES('ASSESSMENT_DRAFT_SAFETY_ALERT','ticket',t.id,auth.uid(),private.active_profile_role()::public.user_role,jsonb_build_object('assessment_id',p_assessment_id,'severity','CRITICAL'),'Saved assessment draft reports public danger or leaking oil');
 END IF;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary) VALUES('TICKET_ASSESSMENT_DRAFT_SAVED','ticket',t.id,auth.uid(),private.active_profile_role()::public.user_role,jsonb_build_object('assessment_id',d.assessment_id,'version',d.version),'Validated assessment saved for ticket readback; not submitted');
 RETURN d;
END $$;
CREATE FUNCTION private.submit_ticket_assessment(p_ticket_id uuid,p_assessment_id uuid,p_expected_version integer) RETURNS public.damage_assessments
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE t public.tickets; d public.ticket_assessment_drafts; a public.damage_assessments; BEGIN
 IF NOT private.can_assess_ticket(p_ticket_id) THEN RAISE EXCEPTION 'Assessment submission requires the assigned assessor or storm manager' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 SELECT * INTO a FROM public.damage_assessments WHERE id=p_assessment_id;
 IF a.id IS NOT NULL THEN IF a.ticket_id<>p_ticket_id OR a.contractor_id<>t.assigned_to THEN RAISE EXCEPTION 'Assessment identity conflict' USING ERRCODE='42501'; END IF; RETURN a; END IF;
 IF t.crew_id IS NULL OR t.assigned_driver_id IS NULL OR t.team_lead_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=t.team_lead_id AND role='ADMIN' AND is_active AND NOT must_reset_password) THEN RAISE EXCEPTION 'A team lead must be assigned before this ticket can be submitted' USING ERRCODE='23514'; END IF;
 SELECT * INTO d FROM public.ticket_assessment_drafts WHERE ticket_id=p_ticket_id FOR UPDATE;
 IF d.ticket_id IS NULL OR d.assessment_id<>p_assessment_id OR d.version IS DISTINCT FROM p_expected_version OR d.contractor_id<>t.assigned_to THEN RAISE EXCEPTION 'Save and review the current draft before submitting' USING ERRCODE='40001'; END IF;
 PERFORM private.assert_ticket_evidence(p_ticket_id,d.field_assessment,d.photo_evidence,true);
 INSERT INTO public.damage_assessments(id,ticket_id,contractor_id,field_assessment,photo_evidence) VALUES(d.assessment_id,t.id,t.assigned_to,d.field_assessment,d.photo_evidence) RETURNING * INTO a;
 UPDATE public.tickets SET current_assessment_id=a.id,status='PENDING_REVIEW',review_stage='TEAM_LEAD_REVIEW',completed_at=now(),updated_by=auth.uid() WHERE id=t.id;
 DELETE FROM public.ticket_assessment_drafts WHERE ticket_id=t.id;
 PERFORM private.notify_ticket_user(t.team_lead_id,t.id,'Ticket '||t.ticket_number||' needs review','The crew submitted its assessment. Approve it for final review or return it for corrections.','assessment:'||a.id||':team:'||t.team_lead_id);
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary) VALUES('TICKET_ASSESSMENT_SUBMITTED','ticket',t.id,auth.uid(),private.active_profile_role()::public.user_role,jsonb_build_object('assessment_id',a.id,'stage','TEAM_LEAD_REVIEW'),'Crew submitted saved assessment to assigned team lead');
 RETURN a;
END $$;

CREATE OR REPLACE FUNCTION private.guard_field_assessment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); role_name text:=private.active_profile_role(); t public.tickets; BEGIN
 IF actor IS NULL OR role_name IS NULL OR NOT private.contractor_portal_ready() THEN RAISE EXCEPTION 'Active signed-in profile required' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=NEW.ticket_id FOR UPDATE;
 IF TG_OP='UPDATE' THEN
 IF (to_jsonb(NEW)-ARRAY['review_stage','team_reviewed_by','team_reviewed_at','team_review_notes','reviewed_by','reviewed_at','review_notes','updated_at','updated_by']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['review_stage','team_reviewed_by','team_reviewed_at','team_review_notes','reviewed_by','reviewed_at','review_notes','updated_at','updated_by']) THEN RAISE EXCEPTION 'Submitted assessment evidence is immutable' USING ERRCODE='23514'; END IF;
 IF NOT private.has_permission(actor,'admin.assessments.edit') OR NOT private.can_access_ticket(t.id) THEN RAISE EXCEPTION 'Ticket review permission required' USING ERRCODE='42501'; END IF;
 IF OLD.review_stage='TEAM_LEAD_REVIEW' AND NEW.review_stage IN ('FINAL_REVIEW','NEEDS_REWORK') THEN
 IF role_name IS DISTINCT FROM 'ADMIN' OR t.team_lead_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Only the assigned team lead can review' USING ERRCODE='42501'; END IF;
 NEW.team_reviewed_by:=actor; NEW.team_reviewed_at:=now(); NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL; NEW.review_notes:=NULL;
 ELSIF OLD.review_stage='FINAL_REVIEW' AND NEW.review_stage IN ('APPROVED','NEEDS_REWORK') AND role_name IN ('CEO','SUPER_ADMIN') THEN NEW.reviewed_by:=actor; NEW.reviewed_at:=now();
 ELSE RAISE EXCEPTION 'Invalid review stage or reviewer' USING ERRCODE='42501'; END IF;
 NEW.updated_by:=actor; NEW.updated_at:=now(); RETURN NEW;
 END IF;
 IF NOT private.can_assess_ticket(t.id) OR t.assigned_to IS DISTINCT FROM NEW.contractor_id OR t.status::text NOT IN ('ON_SITE','IN_PROGRESS','NEEDS_REWORK') THEN RAISE EXCEPTION 'Assessment requires the assigned on-site ticket' USING ERRCODE='42501'; END IF;
 PERFORM private.assert_ticket_evidence(t.id,NEW.field_assessment,NEW.photo_evidence,true);
 NEW.assessed_by:=actor; NEW.created_by:=actor; NEW.updated_by:=actor; NEW.assessed_at:=now(); NEW.created_at:=now(); NEW.updated_at:=now();
 NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL; NEW.review_notes:=NULL; NEW.team_reviewed_by:=NULL; NEW.team_reviewed_at:=NULL; NEW.team_review_notes:=NULL; NEW.review_stage:='TEAM_LEAD_REVIEW';
 NEW.priority:=CASE WHEN NEW.field_assessment->'answers'->'publicDanger'='true'::jsonb OR NEW.field_assessment->'answers'->'oilLeak'='true'::jsonb THEN 'A'::public.priority_level ELSE 'C'::public.priority_level END;
 NEW.safety_observations:=jsonb_build_object('downed_conductors',NEW.field_assessment->'answers'->'conductorBroken','damaged_insulators',NEW.field_assessment->'answers'->'insulatorsBroken','vegetation_contact',NEW.field_assessment->'answers'->'treeCrewsNeeded','structural_damage',NEW.field_assessment->'answers'->'poleBroken','public_accessible',NEW.field_assessment->'answers'->'publicDanger','fire_hazard',false,'safe_distance_maintained',false);
 NEW.sync_status:='SYNCED'; RETURN NEW;
END $$;
CREATE FUNCTION private.review_ticket_assessment(p_assessment_id uuid,p_decision text,p_notes text DEFAULT '') RETURNS public.damage_assessments
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE t public.tickets; a public.damage_assessments; recipient uuid; next_stage text; BEGIN
 IF p_decision IS NULL OR p_notes IS NULL OR p_decision NOT IN ('APPROVED','NEEDS_REWORK') OR length(p_notes)>4000 OR (p_decision='NEEDS_REWORK' AND length(btrim(p_notes))=0) THEN RAISE EXCEPTION 'Choose a valid decision and include correction notes' USING ERRCODE='23514'; END IF;
 SELECT t0.* INTO t FROM public.tickets t0 JOIN public.damage_assessments a0 ON a0.ticket_id=t0.id WHERE a0.id=p_assessment_id FOR UPDATE OF t0;
 IF NOT private.can_access_ticket(t.id) OR NOT private.has_permission(auth.uid(),'admin.assessments.edit') THEN RAISE EXCEPTION 'Ticket review permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.damage_assessments WHERE id=p_assessment_id FOR UPDATE;
 IF t.current_assessment_id IS DISTINCT FROM a.id OR t.status<>'PENDING_REVIEW' OR t.review_stage<>a.review_stage THEN RAISE EXCEPTION 'Review the current pending assessment' USING ERRCODE='23514'; END IF;
 next_stage:=CASE WHEN p_decision='NEEDS_REWORK' THEN 'NEEDS_REWORK' WHEN a.review_stage='TEAM_LEAD_REVIEW' THEN 'FINAL_REVIEW' ELSE 'APPROVED' END;
 UPDATE public.damage_assessments SET review_stage=next_stage,team_review_notes=CASE WHEN a.review_stage='TEAM_LEAD_REVIEW' THEN '['||p_decision||'] '||btrim(p_notes) ELSE team_review_notes END,review_notes=CASE WHEN a.review_stage='FINAL_REVIEW' THEN '['||p_decision||'] '||btrim(p_notes) ELSE review_notes END WHERE id=a.id RETURNING * INTO a;
 UPDATE public.tickets SET review_stage=CASE WHEN next_stage='NEEDS_REWORK' THEN 'CORRECTIONS' ELSE next_stage END,status=CASE WHEN next_stage='NEEDS_REWORK' THEN 'NEEDS_REWORK'::public.ticket_status WHEN next_stage='APPROVED' THEN 'APPROVED'::public.ticket_status ELSE 'PENDING_REVIEW'::public.ticket_status END,updated_by=auth.uid() WHERE id=t.id;
 IF next_stage='FINAL_REVIEW' THEN FOR recipient IN SELECT id FROM public.profiles WHERE role IN ('CEO','SUPER_ADMIN') AND is_active AND NOT must_reset_password LOOP
 PERFORM private.notify_ticket_user(recipient,t.id,'Final review: ticket '||t.ticket_number,'The team lead approved the assessment. Final approval is required before utility handoff.','assessment:'||a.id||':final:'||recipient); END LOOP;
 ELSE FOR recipient IN SELECT DISTINCT profile_id FROM public.contractors WHERE id IN(t.assigned_to,t.assigned_driver_id) AND profile_id IS NOT NULL UNION SELECT t.team_lead_id LOOP
 PERFORM private.notify_ticket_user(recipient,t.id,CASE WHEN next_stage='NEEDS_REWORK' THEN 'Corrections: ticket ' ELSE 'Approved: ticket ' END||t.ticket_number,CASE WHEN next_stage='NEEDS_REWORK' THEN btrim(p_notes) ELSE 'Final approval is complete. The storm manager can export and record utility handoff.' END,'assessment:'||a.id||':'||next_stage||':'||recipient); END LOOP; END IF;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary) VALUES('TICKET_ASSESSMENT_REVIEW','ticket',t.id,auth.uid(),private.active_profile_role()::public.user_role,jsonb_build_object('assessment_id',a.id,'stage',next_stage,'notes',btrim(p_notes)),'Assessment reviewed through the ticket workflow');
 RETURN a;
END $$;

CREATE FUNCTION private.ticket_dispatch_options(p_ticket_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ DECLARE t public.tickets; BEGIN
 IF NOT private.can_access_ticket(p_ticket_id) THEN RAISE EXCEPTION 'Ticket access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id;
 RETURN jsonb_build_object('teamLeads',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',first_name||' '||last_name)),'[]') FROM public.profiles WHERE role='ADMIN' AND is_active AND NOT must_reset_password AND (private.active_profile_role() IN ('CEO','SUPER_ADMIN') OR id=auth.uid())),
 'crews',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'teamLeadId',c.team_lead_id,'driverId',c.driver_id,'assessorId',c.assessor_id,'driverName',coalesce(d.first_name||' '||d.last_name,(SELECT first_name||' '||last_name FROM public.profiles WHERE id=d.profile_id)),'assessorName',coalesce(a.first_name||' '||a.last_name,(SELECT first_name||' '||last_name FROM public.profiles WHERE id=a.profile_id)))),'[]') FROM public.field_crews c JOIN public.contractors d ON d.id=c.driver_id JOIN public.contractors a ON a.id=c.assessor_id WHERE c.storm_event_id=t.storm_event_id AND c.is_active AND (private.active_profile_role() IN ('CEO','SUPER_ADMIN') OR c.team_lead_id=t.team_lead_id)),
 'workers',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',p.first_name||' '||p.last_name,'role',c.role)),'[]') FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id WHERE private.active_profile_role()<>'CONTRACTOR' AND c.role::text IN ('DRIVER','DAMAGE_ASSESSER','SR_DAMAGE_ASSESSER') AND NOT coalesce(c.is_deleted,false) AND p.is_active AND NOT p.must_reset_password AND p.role='CONTRACTOR' AND c.onboarding_completed_at IS NOT NULL AND c.is_eligible_for_assignment IS TRUE));
 END $$;
CREATE FUNCTION private.assign_ticket_team_lead(p_ticket_id uuid,p_team_lead_id uuid) RETURNS public.tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE t public.tickets; BEGIN
 IF private.active_profile_role() NOT IN ('CEO','SUPER_ADMIN') OR NOT private.has_permission(auth.uid(),'admin.tickets.edit') OR NOT private.can_access_ticket(p_ticket_id) THEN RAISE EXCEPTION 'Storm manager ticket permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 IF t.status::text NOT IN ('DRAFT','ASSIGNED','NEEDS_REWORK') OR EXISTS(SELECT 1 FROM public.ticket_assessment_drafts WHERE ticket_id=t.id) THEN RAISE EXCEPTION 'Do not reassign a ticket with active fieldwork or a saved draft' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_team_lead_id AND role='ADMIN' AND is_active AND NOT must_reset_password) THEN RAISE EXCEPTION 'Choose an active Admin team lead' USING ERRCODE='23514'; END IF;
 IF t.team_lead_id=p_team_lead_id THEN RETURN t; END IF;
 UPDATE public.tickets SET team_lead_id=p_team_lead_id,crew_id=NULL,assigned_to=NULL,assigned_driver_id=NULL,status='DRAFT',updated_by=auth.uid() WHERE id=t.id RETURNING * INTO t;
 PERFORM private.notify_ticket_user(p_team_lead_id,t.id,'Dispatch ticket '||t.ticket_number,'Assign this ticket to one of your driver/assessor crews.','ticket:'||t.id||':lead:'||p_team_lead_id||':'||t.updated_at);
 RETURN t; END $$;
CREATE FUNCTION private.create_field_crew(p_ticket_id uuid,p_team_lead_id uuid,p_driver_id uuid,p_assessor_id uuid,p_name text) RETURNS public.field_crews LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.tickets; created_crew public.field_crews; revision uuid; worker uuid; BEGIN
 IF NOT private.can_access_ticket(p_ticket_id) OR NOT private.has_permission(auth.uid(),'admin.tickets.edit') OR (private.active_profile_role()='ADMIN' AND p_team_lead_id IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'Crew management permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id;
 IF t.storm_event_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_team_lead_id AND role='ADMIN' AND is_active AND NOT must_reset_password) THEN RAISE EXCEPTION 'A storm and active team lead are required' USING ERRCODE='23514'; END IF;
 SELECT * INTO created_crew FROM public.field_crews WHERE storm_event_id=t.storm_event_id AND team_lead_id=p_team_lead_id AND driver_id=p_driver_id AND assessor_id=p_assessor_id AND is_active AND name=btrim(p_name);
 IF created_crew.id IS NOT NULL THEN RETURN created_crew; END IF;
 IF p_driver_id=p_assessor_id OR NOT EXISTS(SELECT 1 FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id WHERE c.id=p_driver_id AND c.role::text='DRIVER' AND NOT coalesce(c.is_deleted,false) AND p.role='CONTRACTOR' AND p.is_active AND NOT p.must_reset_password AND c.onboarding_completed_at IS NOT NULL AND c.is_eligible_for_assignment IS TRUE) OR NOT EXISTS(SELECT 1 FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id WHERE c.id=p_assessor_id AND c.role::text IN ('DAMAGE_ASSESSER','SR_DAMAGE_ASSESSER') AND NOT coalesce(c.is_deleted,false) AND p.role='CONTRACTOR' AND p.is_active AND NOT p.must_reset_password AND c.onboarding_completed_at IS NOT NULL AND c.is_eligible_for_assignment IS TRUE) THEN RAISE EXCEPTION 'A crew requires one eligible driver and one eligible damage assessor' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.storm_events WHERE id=t.storm_event_id AND NOT is_deleted FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active storm required' USING ERRCODE='23514'; END IF;
 SELECT id INTO revision FROM public.storm_event_roster_revisions WHERE storm_event_id=t.storm_event_id ORDER BY revision_number DESC LIMIT 1;
 IF revision IS NULL THEN INSERT INTO public.storm_event_roster_revisions(storm_event_id,revision_number,revision_label,created_by) VALUES(t.storm_event_id,0,'Initial roster',auth.uid()) RETURNING id INTO revision; END IF;
 FOREACH worker IN ARRAY ARRAY[p_driver_id,p_assessor_id] LOOP
 IF NOT EXISTS(SELECT 1 FROM public.storm_event_roster_members WHERE roster_revision_id=revision AND contractor_id=worker AND member_status='CONFIRMED') THEN
 IF EXISTS(SELECT 1 FROM public.storm_event_roster_revisions WHERE id=revision AND is_locked) THEN RAISE EXCEPTION 'The storm roster is locked. A storm manager must update the roster first.' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.storm_event_roster_members WHERE roster_revision_id=revision AND contractor_id=worker) THEN UPDATE public.storm_event_roster_members SET member_status='CONFIRMED' WHERE roster_revision_id=revision AND contractor_id=worker;
 ELSE INSERT INTO public.storm_event_roster_members(roster_revision_id,contractor_id,member_status,created_by) VALUES(revision,worker,'CONFIRMED',auth.uid()); END IF; END IF; END LOOP;
 INSERT INTO public.field_crews(storm_event_id,team_lead_id,name,driver_id,assessor_id,created_by) VALUES(t.storm_event_id,p_team_lead_id,btrim(p_name),p_driver_id,p_assessor_id,auth.uid()) RETURNING * INTO created_crew; RETURN created_crew; END $$;
CREATE FUNCTION private.assign_ticket_crew(p_ticket_id uuid,p_crew_id uuid) RETURNS public.tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE t public.tickets; c public.field_crews; recipient uuid; BEGIN
 IF NOT private.can_access_ticket(p_ticket_id) OR NOT private.has_permission(auth.uid(),'admin.tickets.edit') THEN RAISE EXCEPTION 'Ticket assignment permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 SELECT * INTO c FROM public.field_crews WHERE id=p_crew_id AND is_active FOR SHARE;
 IF (SELECT count(*) FROM public.contractors c0 JOIN public.profiles p ON p.id=c0.profile_id WHERE c0.id IN(c.driver_id,c.assessor_id) AND p.role='CONTRACTOR' AND p.is_active AND NOT p.must_reset_password AND NOT coalesce(c0.is_deleted,false) AND c0.onboarding_completed_at IS NOT NULL AND c0.is_eligible_for_assignment IS TRUE AND ((c0.id=c.driver_id AND c0.role::text='DRIVER') OR (c0.id=c.assessor_id AND c0.role::text IN ('DAMAGE_ASSESSER','SR_DAMAGE_ASSESSER'))))<>2 THEN RAISE EXCEPTION 'Both crew members must remain eligible for assignment' USING ERRCODE='23514'; END IF;
 IF c.id IS NULL OR c.team_lead_id IS DISTINCT FROM t.team_lead_id OR c.storm_event_id IS DISTINCT FROM t.storm_event_id OR t.status::text NOT IN ('DRAFT','ASSIGNED','NEEDS_REWORK') OR EXISTS(SELECT 1 FROM public.ticket_assessment_drafts WHERE ticket_id=t.id) THEN RAISE EXCEPTION 'Choose a crew belonging to this ticket team lead and storm before fieldwork starts' USING ERRCODE='23514'; END IF;
 IF t.crew_id=c.id AND t.assigned_to=c.assessor_id AND t.assigned_driver_id=c.driver_id THEN RETURN t; END IF;
 UPDATE public.tickets SET crew_id=c.id,assigned_to=c.assessor_id,assigned_driver_id=c.driver_id,assigned_by=auth.uid(),assigned_at=now(),status=CASE WHEN t.status='NEEDS_REWORK' THEN 'NEEDS_REWORK'::public.ticket_status ELSE 'ASSIGNED'::public.ticket_status END,updated_by=auth.uid() WHERE id=t.id RETURNING * INTO t;
 FOR recipient IN SELECT profile_id FROM public.contractors WHERE id IN(c.driver_id,c.assessor_id) LOOP PERFORM private.notify_ticket_user(recipient,t.id,'Assigned ticket '||t.ticket_number,'Your crew has a new ticket. Open it to view the location and begin fieldwork.','ticket:'||t.id||':crew:'||c.id||':'||recipient||':'||t.assigned_at); END LOOP;
 RETURN t; END $$;
CREATE FUNCTION private.record_ticket_utility_handoff(p_ticket_id uuid,p_reference text) RETURNS public.tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE t public.tickets; BEGIN
 IF private.active_profile_role() NOT IN ('CEO','SUPER_ADMIN') OR NOT private.has_permission(auth.uid(),'admin.tickets.edit') OR NOT private.can_access_ticket(p_ticket_id) THEN RAISE EXCEPTION 'Storm manager ticket permission required' USING ERRCODE='42501'; END IF;
 IF p_reference IS NULL OR length(btrim(p_reference)) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Enter the utility handoff reference or delivery notes' USING ERRCODE='23514'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 IF t.review_stage='UTILITY_SUBMITTED' THEN RETURN t; END IF;
 IF t.status<>'APPROVED' OR t.review_stage<>'APPROVED' OR NOT EXISTS(SELECT 1 FROM public.damage_assessments WHERE id=t.current_assessment_id AND review_stage='APPROVED') THEN RAISE EXCEPTION 'Final approval is required before utility handoff' USING ERRCODE='23514'; END IF;
 UPDATE public.tickets SET review_stage='UTILITY_SUBMITTED',status='CLOSED',utility_submitted_at=now(),utility_submitted_by=auth.uid(),utility_submission_reference=btrim(p_reference),updated_by=auth.uid() WHERE id=t.id RETURNING * INTO t;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary) VALUES('UTILITY_HANDOFF_RECORDED','ticket',t.id,auth.uid(),private.active_profile_role()::public.user_role,jsonb_build_object('reference',btrim(p_reference),'assessment_id',t.current_assessment_id),'Approved ticket PDF handed to utility'); RETURN t; END $$;

-- In-app notifications are per recipient; read acknowledgements cannot alter their content.
GRANT SELECT ON public.notification_logs TO authenticated;
CREATE POLICY ticket_notifications_own ON public.notification_logs AS RESTRICTIVE FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE FUNCTION private.mark_ticket_notification_read(p_notification_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT private.contractor_portal_ready() THEN RAISE EXCEPTION 'Signed-in profile required' USING ERRCODE='42501'; END IF;
 UPDATE public.notification_logs SET read_at=coalesce(read_at,now()) WHERE id=p_notification_id AND user_id=auth.uid(); END $$;

-- Create the missing private assessment bucket and allow only linked-ticket evidence.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('assessment-photos','assessment-photos',false,10485760,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE FUNCTION private.ticket_photo_access(p_name text,p_write boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ DECLARE v_ticket uuid; v_photo uuid; BEGIN
 IF p_name !~ '^[0-9a-f-]{36}/tickets/[0-9a-f-]{36}/[0-9a-f-]{36}-(original|thumbnail)\.(jpg|jpeg|png|webp)$' THEN RETURN false; END IF;
 BEGIN v_ticket:=split_part(p_name,'/',3)::uuid; v_photo:=left(split_part(p_name,'/',4),36)::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN false; END;
 IF NOT private.can_access_ticket(v_ticket) THEN RETURN false; END IF;
 IF NOT p_write THEN RETURN true; END IF;
 RETURN split_part(p_name,'/',1)=auth.uid()::text AND private.can_assess_ticket(v_ticket) AND EXISTS(SELECT 1 FROM public.tickets WHERE id=v_ticket AND status::text IN ('ON_SITE','IN_PROGRESS','NEEDS_REWORK')) AND NOT EXISTS(SELECT 1 FROM public.damage_assessments a,jsonb_array_elements(a.photo_evidence) p WHERE a.ticket_id=v_ticket AND p->>'id'=v_photo::text);
 END $$;
REVOKE ALL ON FUNCTION private.ticket_photo_access(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.ticket_photo_access(text,boolean) TO authenticated;
CREATE POLICY assessment_photos_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='assessment-photos' AND private.ticket_photo_access(name,false));
CREATE POLICY assessment_photos_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='assessment-photos' AND private.ticket_photo_access(name,true));
CREATE POLICY assessment_photos_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='assessment-photos' AND private.ticket_photo_access(name,true)) WITH CHECK(bucket_id='assessment-photos' AND private.ticket_photo_access(name,true));
CREATE POLICY assessment_photo_read_boundary ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING(bucket_id<>'assessment-photos' OR private.ticket_photo_access(name,false));
CREATE POLICY assessment_photo_insert_boundary ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'assessment-photos' OR private.ticket_photo_access(name,true));
CREATE POLICY assessment_photo_update_boundary ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id<>'assessment-photos' OR private.ticket_photo_access(name,true)) WITH CHECK(bucket_id<>'assessment-photos' OR private.ticket_photo_access(name,true));
CREATE POLICY assessment_photo_no_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'assessment-photos');
CREATE POLICY ticket_media_read ON public.media_assets FOR SELECT TO authenticated USING(entity_type='ticket' AND private.can_access_ticket(entity_id));
DROP POLICY payroll_worker_ownership ON public.media_assets;
CREATE POLICY media_worker_insert_scope ON public.media_assets AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(private.active_profile_role()<>'CONTRACTOR' OR uploaded_by=(SELECT auth.uid()) AND (contractor_id IS NULL OR contractor_id IN(SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid()))));
CREATE POLICY media_worker_update_scope ON public.media_assets AS RESTRICTIVE FOR UPDATE TO authenticated USING(private.active_profile_role()<>'CONTRACTOR' OR uploaded_by=(SELECT auth.uid())) WITH CHECK(private.active_profile_role()<>'CONTRACTOR' OR uploaded_by=(SELECT auth.uid()) AND (contractor_id IS NULL OR contractor_id IN(SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid()))));
CREATE POLICY media_worker_delete_scope ON public.media_assets AS RESTRICTIVE FOR DELETE TO authenticated USING(private.active_profile_role()<>'CONTRACTOR' OR uploaded_by=(SELECT auth.uid()));
CREATE POLICY media_read_scope ON public.media_assets AS RESTRICTIVE FOR SELECT TO authenticated USING(
 (private.active_profile_role()='CONTRACTOR' AND (contractor_id IN(SELECT id FROM public.contractors WHERE profile_id=(SELECT auth.uid())) OR entity_type='ticket' AND private.can_access_ticket(entity_id))) OR
 (private.active_profile_role()='ADMIN' AND entity_type='ticket' AND private.can_access_ticket(entity_id)) OR private.active_profile_role() IN ('CEO','SUPER_ADMIN'));
CREATE POLICY ticket_media_insert ON public.media_assets FOR INSERT TO authenticated WITH CHECK(uploaded_by=(SELECT auth.uid()) AND entity_type='ticket' AND private.can_assess_ticket(entity_id) AND storage_bucket='assessment-photos');
CREATE POLICY ticket_media_update ON public.media_assets FOR UPDATE TO authenticated USING(uploaded_by=(SELECT auth.uid()) AND entity_type='ticket' AND private.can_assess_ticket(entity_id)) WITH CHECK(uploaded_by=(SELECT auth.uid()) AND entity_type='ticket' AND private.can_assess_ticket(entity_id) AND storage_bucket='assessment-photos');
GRANT SELECT,INSERT,UPDATE ON public.media_assets TO authenticated;
CREATE FUNCTION private.guard_submitted_ticket_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NEW.entity_type='ticket' AND NEW.storage_bucket='assessment-photos' AND (NEW.uploaded_by IS DISTINCT FROM auth.uid() OR NOT private.can_assess_ticket(NEW.entity_id)) THEN RAISE EXCEPTION 'Only the assigned assessor can persist ticket evidence' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.damage_assessments a,jsonb_array_elements(a.photo_evidence) p WHERE p->>'id'=OLD.id::text) AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN RAISE EXCEPTION 'Submitted photo evidence is immutable' USING ERRCODE='23514'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION private.guard_submitted_ticket_media() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_submitted_ticket_media BEFORE INSERT OR UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION private.guard_submitted_ticket_media();

-- Both crew members use the same GPS-validated field progress action.
CREATE FUNCTION private.update_ticket_field_status(p_ticket_id uuid,p_status text,p_latitude numeric,p_longitude numeric,p_accuracy numeric) RETURNS public.tickets LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.tickets; distance_m double precision; BEGIN
 IF private.active_profile_role() IS DISTINCT FROM 'CONTRACTOR' OR NOT private.can_access_ticket(p_ticket_id) THEN RAISE EXCEPTION 'Assigned crew access required' USING ERRCODE='42501'; END IF;
 IF p_latitude IS NULL OR p_longitude IS NULL OR p_accuracy IS NULL OR p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 OR p_accuracy NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'GPS accuracy must be within 100 metres' USING ERRCODE='23514'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 IF t.status::text=p_status THEN RETURN t; END IF;
 IF p_status IS NULL OR NOT ((t.status='ASSIGNED' AND p_status='IN_ROUTE') OR (t.status='IN_ROUTE' AND p_status='ON_SITE') OR (t.status IN ('ON_SITE','NEEDS_REWORK') AND p_status='IN_PROGRESS')) THEN RAISE EXCEPTION 'Invalid field status transition' USING ERRCODE='23514'; END IF;
 IF p_status IN ('ON_SITE','IN_PROGRESS') THEN
 IF t.latitude IS NULL OR t.longitude IS NULL THEN RAISE EXCEPTION 'Ticket coordinates are required for the geofence check' USING ERRCODE='23514'; END IF;
 distance_m:=6371000*2*asin(sqrt(least(1,power(sin(radians((p_latitude-t.latitude)::double precision)/2),2)+cos(radians(t.latitude::double precision))*cos(radians(p_latitude::double precision))*power(sin(radians((p_longitude-t.longitude)::double precision)/2),2))));
 IF distance_m>coalesce(t.geofence_radius_meters,500) THEN RAISE EXCEPTION 'Must be within the ticket geofence to work on site' USING ERRCODE='23514'; END IF;
 END IF;
 UPDATE public.tickets SET status=p_status::public.ticket_status,updated_by=auth.uid() WHERE id=t.id RETURNING * INTO t;
 UPDATE public.ticket_status_history SET gps_latitude=p_latitude,gps_longitude=p_longitude,gps_accuracy=p_accuracy WHERE ticket_id=t.id AND changed_by=auth.uid() AND changed_at=now();
 RETURN t; END $$;

-- Public RPC wrappers remain invokers. Explicitly guarded privileged bodies live in private.
CREATE FUNCTION public.update_ticket_field_status(p_ticket_id uuid,p_status text,p_latitude numeric,p_longitude numeric,p_accuracy numeric) RETURNS public.tickets LANGUAGE sql SET search_path='' AS $$ SELECT private.update_ticket_field_status(p_ticket_id,p_status,p_latitude,p_longitude,p_accuracy); $$;
CREATE FUNCTION public.save_ticket_assessment_draft(p_ticket_id uuid,p_assessment_id uuid,p_payload jsonb,p_photos jsonb,p_expected_version integer DEFAULT NULL) RETURNS public.ticket_assessment_drafts LANGUAGE sql SET search_path='' AS $$ SELECT private.save_ticket_assessment_draft(p_ticket_id,p_assessment_id,p_payload,p_photos,p_expected_version); $$;
CREATE FUNCTION public.submit_ticket_assessment(p_ticket_id uuid,p_assessment_id uuid,p_expected_version integer) RETURNS public.damage_assessments LANGUAGE sql SET search_path='' AS $$ SELECT private.submit_ticket_assessment(p_ticket_id,p_assessment_id,p_expected_version); $$;
CREATE FUNCTION public.review_ticket_assessment(p_assessment_id uuid,p_decision text,p_notes text DEFAULT '') RETURNS public.damage_assessments LANGUAGE sql SET search_path='' AS $$ SELECT private.review_ticket_assessment(p_assessment_id,p_decision,p_notes); $$;
CREATE FUNCTION public.ticket_dispatch_options(p_ticket_id uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$ SELECT private.ticket_dispatch_options(p_ticket_id); $$;
CREATE FUNCTION public.assign_ticket_team_lead(p_ticket_id uuid,p_team_lead_id uuid) RETURNS public.tickets LANGUAGE sql SET search_path='' AS $$ SELECT private.assign_ticket_team_lead(p_ticket_id,p_team_lead_id); $$;
CREATE FUNCTION public.create_field_crew(p_ticket_id uuid,p_team_lead_id uuid,p_driver_id uuid,p_assessor_id uuid,p_name text) RETURNS public.field_crews LANGUAGE sql SET search_path='' AS $$ SELECT private.create_field_crew(p_ticket_id,p_team_lead_id,p_driver_id,p_assessor_id,p_name); $$;
CREATE FUNCTION public.assign_ticket_crew(p_ticket_id uuid,p_crew_id uuid) RETURNS public.tickets LANGUAGE sql SET search_path='' AS $$ SELECT private.assign_ticket_crew(p_ticket_id,p_crew_id); $$;
CREATE FUNCTION public.record_ticket_utility_handoff(p_ticket_id uuid,p_reference text) RETURNS public.tickets LANGUAGE sql SET search_path='' AS $$ SELECT private.record_ticket_utility_handoff(p_ticket_id,p_reference); $$;
CREATE FUNCTION public.mark_ticket_notification_read(p_notification_id uuid) RETURNS void LANGUAGE sql SET search_path='' AS $$ SELECT private.mark_ticket_notification_read(p_notification_id); $$;
DO $$DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.proname IN ('update_ticket_field_status','save_ticket_assessment_draft','submit_ticket_assessment','review_ticket_assessment','ticket_dispatch_options','assign_ticket_team_lead','create_field_crew','assign_ticket_crew','record_ticket_utility_handoff','mark_ticket_notification_read') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature); END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
