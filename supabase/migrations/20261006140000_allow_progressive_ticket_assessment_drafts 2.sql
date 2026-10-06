-- Draft saves may be incomplete. Full answer/photo validation remains on submit.
CREATE OR REPLACE FUNCTION private.assert_ticket_assessment_draft(p_payload jsonb,p_photos jsonb) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE k text; v jsonb; kind text; choice text; valid_choice boolean; evidence jsonb; section_key text;
BEGIN
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR p_payload->>'version' IS DISTINCT FROM '1'
    OR jsonb_typeof(p_payload->'answers') IS DISTINCT FROM 'object' OR (p_payload-'version'-'answers')<>'{}'::jsonb THEN
  RAISE EXCEPTION 'Invalid assessment draft shape' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(p_photos) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Draft photo evidence must be an array' USING ERRCODE='23514'; END IF;

 FOR k,v IN SELECT key,value FROM jsonb_each(p_payload->'answers') LOOP
  IF k<>ALL(ARRAY['phases','framing','hasTap','tapPhases','treeCrewsNeeded','treeWorkload','treeDamage','poleBroken','poleHeight','poleAccessible','poleDamage','conductorBroken','conductorSize','spansDown','conductorDamage','transformerDown','transformerKva','transformerCount','transformerDamage','servicesDamaged','serviceCount','serviceSize','serviceConfiguration','serviceDamage','hasCrossArm','crossArmMaterial','crossArmsDamaged','crossArmCount','crossArmDamage','insulatorsBroken','insulatorCount','insulatorDamage','publicDanger','publicDangerDetails','oilLeak','oilLeakDetails','additionalNotes']) THEN
   RAISE EXCEPTION 'Unknown assessment field: %',k USING ERRCODE='23514';
  END IF;
  IF v='null'::jsonb THEN CONTINUE; END IF;
  kind:=CASE
   WHEN k=ANY(ARRAY['hasTap','treeCrewsNeeded','poleBroken','poleAccessible','conductorBroken','transformerDown','servicesDamaged','hasCrossArm','crossArmsDamaged','insulatorsBroken','publicDanger','oilLeak']) THEN 'boolean'
   WHEN k=ANY(ARRAY['serviceCount','crossArmCount','insulatorCount']) THEN 'number'
   ELSE 'string'
  END;
  IF jsonb_typeof(v) IS DISTINCT FROM kind THEN RAISE EXCEPTION 'Invalid value for assessment field: %',k USING ERRCODE='23514'; END IF;
  IF kind='number' AND ((v#>>'{}')::numeric<1 OR (v#>>'{}')::numeric>2147483647 OR trunc((v#>>'{}')::numeric)<>(v#>>'{}')::numeric) THEN RAISE EXCEPTION 'Invalid count for assessment field: %',k USING ERRCODE='23514'; END IF;
  IF k='additionalNotes' AND length(v#>>'{}')>4000 THEN RAISE EXCEPTION 'Text is too long for assessment field: %',k USING ERRCODE='23514';
  ELSIF k=ANY(ARRAY['treeDamage','poleDamage','conductorDamage','transformerDamage','serviceDamage','crossArmDamage','insulatorDamage','publicDangerDetails','oilLeakDetails']) AND length(v#>>'{}')>2000 THEN RAISE EXCEPTION 'Text is too long for assessment field: %',k USING ERRCODE='23514';
  END IF;
  IF k=ANY(ARRAY['phases','framing','tapPhases','treeWorkload','poleHeight','conductorSize','spansDown','transformerKva','transformerCount','serviceSize','serviceConfiguration','crossArmMaterial']) THEN
   choice:=v#>>'{}';
   valid_choice:=false;
   IF k=ANY(ARRAY['phases','tapPhases']) THEN valid_choice:=choice=ANY(ARRAY['1','2','3']);
   ELSIF k='framing' THEN valid_choice:=choice=ANY(ARRAY['TANGENT','DOUBLE_DEAD_END','ANGLE','DEAD_END']);
   ELSIF k='treeWorkload' THEN valid_choice:=choice=ANY(ARRAY['LIGHT','MODERATE','HEAVY']);
   ELSIF k='poleHeight' THEN valid_choice:=choice=ANY(ARRAY['35','40','45','50','55','60','65']);
   ELSIF k='conductorSize' THEN valid_choice:=choice=ANY(ARRAY['#6','#4','#2','#1','1/0','2/0','4/0','336','556','795']);
   ELSIF k='spansDown' THEN valid_choice:=choice=ANY(ARRAY['1','2','3','4','5','6','7','8','9','10']);
   ELSIF k='transformerKva' THEN valid_choice:=choice=ANY(ARRAY['5','10','15','25','37.5','50','75','100']);
   ELSIF k='transformerCount' THEN valid_choice:=choice=ANY(ARRAY['1','2','3']);
   ELSIF k='serviceSize' THEN valid_choice:=choice=ANY(ARRAY['4/0','2/0','1/0','#2','#4','#6']);
   ELSIF k='serviceConfiguration' THEN valid_choice:=choice=ANY(ARRAY['DUPLEX','TRIPLEX','QUADRUPLEX']);
   ELSIF k='crossArmMaterial' THEN valid_choice:=choice=ANY(ARRAY['WOOD','METAL','FIBER']);
   END IF;
   IF NOT coalesce(valid_choice,false) THEN RAISE EXCEPTION 'Invalid selection for assessment field: %',k USING ERRCODE='23514'; END IF;
  END IF;
 END LOOP;

 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_photos) p WHERE coalesce(p->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
    OR (SELECT count(DISTINCT p->>'id') FROM jsonb_array_elements(p_photos) p)<>jsonb_array_length(p_photos) THEN
  RAISE EXCEPTION 'Each draft photo must have a unique valid ID' USING ERRCODE='23514';
 END IF;
 FOR evidence IN SELECT value FROM jsonb_array_elements(p_photos) LOOP
  IF evidence->>'type' IS NULL OR evidence->>'type' NOT IN ('OVERVIEW','EQUIPMENT','DAMAGE','SAFETY','CONTEXT')
     OR jsonb_typeof(evidence->'gpsLatitude') IS DISTINCT FROM 'number' OR jsonb_typeof(evidence->'gpsLongitude') IS DISTINCT FROM 'number' THEN
   RAISE EXCEPTION 'Draft photos require a valid type and GPS coordinates' USING ERRCODE='23514';
  END IF;
  IF abs((evidence->>'gpsLatitude')::numeric)>90 OR abs((evidence->>'gpsLongitude')::numeric)>180 THEN RAISE EXCEPTION 'Invalid draft photo GPS' USING ERRCODE='23514'; END IF;
  IF evidence ? 'sectionKey' AND evidence->'sectionKey'<>'null'::jsonb THEN
   section_key:=evidence->>'sectionKey';
   IF evidence->>'type'<>'DAMAGE' OR section_key<>ALL(ARRAY['treeDamage','poleDamage','conductorDamage','transformerDamage','serviceDamage','crossArmDamage','insulatorDamage','publicDangerDetails','oilLeakDetails'])
      OR p_payload->'answers'->section_key IS NULL OR p_payload->'answers'->section_key='null'::jsonb THEN
    RAISE EXCEPTION 'Draft photo section does not match a reported damage field' USING ERRCODE='23514';
   END IF;
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION private.assert_ticket_assessment_draft(jsonb,jsonb) FROM PUBLIC,anon,authenticated;

-- Field progress has only two contractor transitions. Assessment submission and
-- review functions own all later state changes; legacy enum values remain valid
-- for historical rows and staff readback.
CREATE OR REPLACE FUNCTION private.update_ticket_field_status(p_ticket_id uuid,p_status text,p_latitude numeric,p_longitude numeric,p_accuracy numeric) RETURNS public.tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.tickets; distance_m double precision;
BEGIN
 IF private.active_profile_role() IS DISTINCT FROM 'CONTRACTOR' OR NOT private.can_access_ticket(p_ticket_id) THEN
  RAISE EXCEPTION 'Assigned crew access required' USING ERRCODE='42501';
 END IF;
 IF p_latitude IS NULL OR p_longitude IS NULL OR p_accuracy IS NULL
    OR p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180
    OR p_accuracy NOT BETWEEN 0 AND 100 THEN
  RAISE EXCEPTION 'GPS accuracy must be within 100 metres' USING ERRCODE='23514';
 END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 IF t.status::text=p_status THEN RETURN t; END IF;
 IF p_status IS NULL OR NOT ((t.status='ASSIGNED' AND p_status='IN_ROUTE') OR (t.status='IN_ROUTE' AND p_status='ON_SITE')) THEN
  RAISE EXCEPTION 'Invalid field status transition' USING ERRCODE='23514';
 END IF;
 IF p_status='ON_SITE' THEN
  IF t.latitude IS NULL OR t.longitude IS NULL THEN RAISE EXCEPTION 'Ticket coordinates are required for the geofence check' USING ERRCODE='23514'; END IF;
  distance_m:=6371000*2*asin(sqrt(least(1,power(sin(radians((p_latitude-t.latitude)::double precision)/2),2)+cos(radians(t.latitude::double precision))*cos(radians(p_latitude::double precision))*power(sin(radians((p_longitude-t.longitude)::double precision)/2),2))));
  IF distance_m>coalesce(t.geofence_radius_meters,500) THEN RAISE EXCEPTION 'Must be within the ticket geofence to work on site' USING ERRCODE='23514'; END IF;
 END IF;
 UPDATE public.tickets SET status=p_status::public.ticket_status,updated_by=auth.uid() WHERE id=t.id RETURNING * INTO t;
 UPDATE public.ticket_status_history SET gps_latitude=p_latitude,gps_longitude=p_longitude,gps_accuracy=p_accuracy WHERE ticket_id=t.id AND changed_by=auth.uid() AND changed_at=now();
 RETURN t;
END $$;
REVOKE ALL ON FUNCTION private.update_ticket_field_status(uuid,text,numeric,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.update_ticket_field_status(uuid,text,numeric,numeric,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION private.save_ticket_assessment_draft(p_ticket_id uuid,p_assessment_id uuid,p_payload jsonb,p_photos jsonb,p_expected_version integer DEFAULT NULL) RETURNS public.ticket_assessment_drafts
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE t public.tickets; d public.ticket_assessment_drafts; BEGIN
 IF NOT private.can_assess_ticket(p_ticket_id) THEN RAISE EXCEPTION 'Only the assigned assessor or authorized storm manager can save this assessment' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 IF t.assigned_to IS NULL OR t.status::text NOT IN ('ON_SITE','IN_PROGRESS','NEEDS_REWORK') THEN RAISE EXCEPTION 'The assigned crew must be on site before saving an assessment' USING ERRCODE='23514'; END IF;
 PERFORM private.assert_ticket_assessment_draft(p_payload,p_photos);
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
