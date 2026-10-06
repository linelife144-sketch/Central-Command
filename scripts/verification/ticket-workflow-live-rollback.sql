-- Live Postgres/RLS checks with simulated request claims. Temporary records roll back.
-- This does not exercise a browser login or the Storage upload API.
DO $qa$
DECLARE
 chief uuid; lead uuid:=gen_random_uuid(); other_lead uuid:=gen_random_uuid(); assessor uuid:=gen_random_uuid(); driver uuid:=gen_random_uuid();
 assessor_contract uuid:=gen_random_uuid(); driver_contract uuid:=gen_random_uuid(); storm uuid; ticket uuid; crew uuid; revision uuid:=gen_random_uuid(); correction uuid:=gen_random_uuid();
 payload jsonb := $payload${"version":1,"answers":{"phases":"1","framing":"TANGENT","hasTap":false,"tapPhases":null,"treeCrewsNeeded":false,"treeWorkload":null,"treeDamage":null,"poleBroken":false,"poleHeight":null,"poleAccessible":null,"poleDamage":null,"conductorBroken":false,"conductorSize":null,"spansDown":null,"conductorDamage":null,"transformerDown":false,"transformerKva":null,"transformerCount":null,"transformerDamage":null,"servicesDamaged":false,"serviceCount":null,"serviceSize":null,"serviceConfiguration":null,"serviceDamage":null,"hasCrossArm":false,"crossArmMaterial":null,"crossArmsDamaged":null,"crossArmCount":null,"crossArmDamage":null,"insulatorsBroken":false,"insulatorCount":null,"insulatorDamage":null,"publicDanger":false,"publicDangerDetails":null,"oilLeak":false,"oilLeakDetails":null,"additionalNotes":"None"}}$payload$::jsonb; evidence jsonb; photo jsonb; photo_id uuid; row_d public.ticket_assessment_drafts; row_a public.damage_assessments; row_t public.tickets;
 checks jsonb:='[]'; baseline jsonb; after_counts jsonb; expected_notifications integer; count_rows integer; denied boolean; path text;
BEGIN
 SELECT id INTO chief FROM public.profiles WHERE role='CEO' AND is_active AND NOT must_reset_password LIMIT 1;
 IF chief IS NULL THEN RAISE EXCEPTION 'An active CEO is required for the rollback QA fixture'; END IF;
 SELECT jsonb_build_object('profiles',(SELECT count(*) FROM public.profiles),'users',(SELECT count(*) FROM auth.users),'tickets',(SELECT count(*) FROM public.tickets),'crews',(SELECT count(*) FROM public.field_crews),'assessments',(SELECT count(*) FROM public.damage_assessments),'drafts',(SELECT count(*) FROM public.ticket_assessment_drafts),'media',(SELECT count(*) FROM public.media_assets),'objects',(SELECT count(*) FROM storage.objects),'notifications',(SELECT count(*) FROM public.notification_logs),'audits',(SELECT count(*) FROM public.audit_logs)) INTO baseline;
 BEGIN
  INSERT INTO public.contractors(id,business_name,business_email,first_name,last_name,role,account_setup_requested_at,onboarding_completed_at,is_eligible_for_assignment) VALUES(assessor_contract,'Rollback QA assessor','qa.workflow.'||assessor||'@example.invalid','Rollback','Assessor','DAMAGE_ASSESSER',now(),now(),true),(driver_contract,'Rollback QA driver','qa.workflow.'||driver||'@example.invalid','Rollback','Driver','DRIVER',now(),now(),true);
  INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
  VALUES(lead,'qa.workflow.'||lead||'@example.invalid','{"role":"ADMIN"}','{"first_name":"Rollback","last_name":"Lead"}'),
  (other_lead,'qa.workflow.'||other_lead||'@example.invalid','{"role":"ADMIN"}','{"first_name":"Rollback","last_name":"Other"}'),
  (assessor,'qa.workflow.'||assessor||'@example.invalid',jsonb_build_object('role','CONTRACTOR','contractor_record_id',assessor_contract),'{"first_name":"Rollback","last_name":"Assessor"}'),
  (driver,'qa.workflow.'||driver||'@example.invalid',jsonb_build_object('role','CONTRACTOR','contractor_record_id',driver_contract),'{"first_name":"Rollback","last_name":"Driver"}');
  UPDATE public.profiles SET is_active=true,is_email_verified=true,must_reset_password=false WHERE id IN(lead,other_lead,assessor,driver);
  UPDATE public.contractors SET profile_id=CASE WHEN id=assessor_contract THEN assessor ELSE driver END,onboarding_completed_at=now(),is_eligible_for_assignment=true WHERE id IN(assessor_contract,driver_contract);
  INSERT INTO public.storm_events(event_code,name,utility_client,status,ticket_template_key,config_snapshot,utility_id,customer_id)
  SELECT 'QA-'||left(gen_random_uuid()::text,8),'Rollback workflow QA',utility_client,'ACTIVE',ticket_template_key,config_snapshot,utility_id,customer_id FROM public.storm_events WHERE NOT coalesce(is_deleted,false) LIMIT 1 RETURNING id INTO storm;
  IF storm IS NULL THEN RAISE EXCEPTION 'A storm template is required for QA'; END IF;
  PERFORM set_config('request.jwt.claim.sub',chief::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',chief,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.tickets(storm_event_id,ticket_number,address,utility_client,status,latitude,longitude,created_by) SELECT storm,'QA-'||left(gen_random_uuid()::text,8),'Rollback QA location',s.utility_client,'DRAFT',30,-90,chief FROM public.storm_events s WHERE s.id=storm RETURNING id INTO ticket;
  row_t:=public.assign_ticket_team_lead(ticket,lead); IF row_t.team_lead_id<>lead THEN RAISE EXCEPTION 'Lead assignment not persisted'; END IF;
  checks:=checks||jsonb_build_array('chief creates draft and assigns active Admin team lead');
  EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claim.sub',other_lead::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',other_lead,'role','authenticated')::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO count_rows FROM public.tickets WHERE id=ticket; IF count_rows<>0 THEN RAISE EXCEPTION 'Other team lead sees ticket'; END IF;
  denied:=false;BEGIN PERFORM public.create_field_crew(ticket,other_lead,driver_contract,assessor_contract,'Wrong crew');EXCEPTION WHEN insufficient_privilege THEN denied:=true;END; IF NOT denied THEN RAISE EXCEPTION 'Other lead created crew'; END IF;
  checks:=checks||jsonb_build_array('other team lead cannot see or dispatch this ticket');
  EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claim.sub',lead::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',lead,'role','authenticated')::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
  IF NOT private.has_permission(lead,'admin.tickets.edit') OR NOT private.has_permission(lead,'admin.assessments.edit') OR private.has_permission(lead,'admin.payroll.view') OR private.has_permission(lead,'admin.users.view') THEN RAISE EXCEPTION 'Team lead permissions incorrect'; END IF;
  SELECT count(*) INTO count_rows FROM public.role_rate_defaults; IF count_rows<>0 THEN RAISE EXCEPTION 'Admin sees pay rates'; END IF;
  SELECT count(*) INTO count_rows FROM public.contractors; IF count_rows<>0 THEN RAISE EXCEPTION 'Admin sees full contractor records'; END IF;
  checks:=checks||jsonb_build_array('Admin ticket/assessment edits allowed; finance and full contractor records denied');
  denied:=false;BEGIN PERFORM public.create_field_crew(ticket,lead,assessor_contract,driver_contract,'Wrong role crew');EXCEPTION WHEN check_violation THEN denied:=true;END; IF NOT denied THEN RAISE EXCEPTION 'Invalid crew roles accepted'; END IF;
  SELECT c.id INTO crew FROM public.create_field_crew(ticket,lead,driver_contract,assessor_contract,'Rollback QA crew') c;
  row_t:=public.assign_ticket_crew(ticket,crew); IF row_t.assigned_to<>assessor_contract OR row_t.assigned_driver_id<>driver_contract OR row_t.status<>'ASSIGNED' THEN RAISE EXCEPTION 'Crew assignment incorrect'; END IF;
  checks:=checks||jsonb_build_array('driver/assessor role validation and atomic crew assignment');
  EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claim.sub',driver::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO count_rows FROM public.tickets WHERE id=ticket; IF count_rows<>1 THEN RAISE EXCEPTION 'Assigned driver cannot read ticket'; END IF;
  denied:=false;BEGIN PERFORM public.save_ticket_assessment_draft(ticket,revision,payload,'[]',NULL);EXCEPTION WHEN insufficient_privilege THEN denied:=true;END; IF NOT denied THEN RAISE EXCEPTION 'Driver authored assessment'; END IF;
  checks:=checks||jsonb_build_array('assigned driver reads ticket but cannot author assessor draft');
  EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claim.sub',assessor::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',assessor,'role','authenticated')::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
  denied:=false;BEGIN PERFORM public.update_ticket_field_status(ticket,'IN_ROUTE',30,-90,200);EXCEPTION WHEN check_violation THEN denied:=true;END; IF NOT denied THEN RAISE EXCEPTION 'Poor GPS accuracy accepted'; END IF;
  PERFORM public.update_ticket_field_status(ticket,'IN_ROUTE',30,-90,25);
  denied:=false;BEGIN PERFORM public.update_ticket_field_status(ticket,'ON_SITE',31,-90,25);EXCEPTION WHEN check_violation THEN denied:=true;END; IF NOT denied THEN RAISE EXCEPTION 'Distant arrival accepted'; END IF;
  PERFORM public.update_ticket_field_status(ticket,'ON_SITE',30,-90,25); PERFORM public.update_ticket_field_status(ticket,'IN_PROGRESS',30,-90,25);
  checks:=checks||jsonb_build_array('server rejects poor GPS and distant arrival; valid field progress persists');
  SELECT jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'type',k,'gpsLatitude',30,'gpsLongitude',-90)) INTO evidence FROM unnest(ARRAY['OVERVIEW','EQUIPMENT','DAMAGE','SAFETY']) k;
  row_d:=public.save_ticket_assessment_draft(ticket,revision,payload,evidence,NULL);
  IF row_d.assessment_id<>revision OR (SELECT count(*) FROM public.damage_assessments WHERE ticket_id=ticket)<>0 THEN RAISE EXCEPTION 'Save submitted instead of drafting'; END IF;
  EXECUTE 'RESET ROLE'; SELECT count(*) INTO expected_notifications FROM public.notification_logs WHERE data->>'ticketId'=ticket::text;
  EXECUTE 'SET LOCAL ROLE authenticated'; PERFORM public.save_ticket_assessment_draft(ticket,revision,payload,evidence,row_d.version);
  EXECUTE 'RESET ROLE'; IF (SELECT count(*) FROM public.notification_logs WHERE data->>'ticketId'=ticket::text)<>expected_notifications THEN RAISE EXCEPTION 'Save sent a review notification'; END IF;
  checks:=checks||jsonb_build_array('draft saves/readback without assessment submission or review notification');
  EXECUTE 'SET LOCAL ROLE authenticated';
  denied:=false;BEGIN PERFORM public.submit_ticket_assessment(ticket,revision,row_d.version);EXCEPTION WHEN check_violation THEN denied:=true;END; IF NOT denied THEN RAISE EXCEPTION 'Submitted missing uploads'; END IF;
  checks:=checks||jsonb_build_array('submission waits for uploaded linked GPS photo evidence');
  -- Metadata/object fixtures simulate completed uploads; no file is uploaded by this SQL check.
  FOR photo IN SELECT value FROM jsonb_array_elements(evidence) LOOP
    photo_id:=(photo->>'id')::uuid; path:=assessor||'/tickets/'||ticket||'/'||photo_id||'-original.jpg';
    INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('assessment-photos',path,assessor::text);
    INSERT INTO public.media_assets(id,uploaded_by,contractor_id,file_name,original_name,file_type,mime_type,file_size_bytes,storage_bucket,storage_path,entity_type,entity_id,upload_status,gps_latitude,gps_longitude) VALUES(photo_id,assessor,assessor_contract,'qa.jpg','qa.jpg','PHOTO','image/jpeg',10,'assessment-photos',path,'ticket',ticket,'COMPLETED',30,-90);
  END LOOP;
  row_a:=public.submit_ticket_assessment(ticket,revision,row_d.version); IF row_a.review_stage<>'TEAM_LEAD_REVIEW' OR row_a.assessed_by<>assessor THEN RAISE EXCEPTION 'Submission identity or stage wrong'; END IF;
  PERFORM public.submit_ticket_assessment(ticket,revision,row_d.version);
  denied:=false;BEGIN UPDATE public.damage_assessments SET field_assessment=payload WHERE id=revision;EXCEPTION WHEN insufficient_privilege THEN denied:=true;END; IF NOT denied THEN RAISE EXCEPTION 'Submitted field revision directly mutable'; END IF;
  denied:=false;BEGIN UPDATE storage.objects SET name=name||'.changed' WHERE bucket_id='assessment-photos' AND name=path;EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
  IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='assessment-photos' AND name=path||'.changed') THEN RAISE EXCEPTION 'Submitted storage object mutable'; END IF;
  checks:=checks||jsonb_build_array('submission binds identity, retry idempotent, submitted revision/evidence immutable');
  EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claim.sub',driver::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
  IF (SELECT count(*) FROM public.damage_assessments WHERE ticket_id=ticket)<>1 OR (SELECT count(*) FROM public.media_assets WHERE entity_id=ticket)<>4 OR (SELECT count(*) FROM storage.objects WHERE bucket_id='assessment-photos' AND name LIKE '%/tickets/'||ticket||'/%')<>4 THEN RAISE EXCEPTION 'Driver cannot read linked crew evidence'; END IF;
  checks:=checks||jsonb_build_array('driver can read submitted assessment and private linked photo objects');
  EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claim.sub',lead::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',lead,'role','authenticated')::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
  IF NOT EXISTS(SELECT 1 FROM public.notification_logs WHERE data->>'ticketId'=ticket::text AND title LIKE '%needs review%') THEN RAISE EXCEPTION 'Team review notification missing'; END IF;
  row_a:=public.review_ticket_assessment(revision,'NEEDS_REWORK','Correct the notes'); IF row_a.review_stage<>'NEEDS_REWORK' THEN RAISE EXCEPTION 'Correction stage wrong'; END IF;
  checks:=checks||jsonb_build_array('assigned lead receives submission and returns it with correction notes');
  EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claim.sub',assessor::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',assessor,'role','authenticated')::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
  row_d:=public.save_ticket_assessment_draft(ticket,correction,jsonb_set(payload,'{answers,additionalNotes}','"Corrected notes"'),evidence,NULL); row_a:=public.submit_ticket_assessment(ticket,correction,row_d.version);
  IF (SELECT count(*) FROM public.damage_assessments WHERE ticket_id=ticket)<>2 THEN RAISE EXCEPTION 'Correction overwrote previous revision'; END IF;
  checks:=checks||jsonb_build_array('correction creates new revision and retains prior answers/evidence');
  EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claim.sub',lead::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',lead,'role','authenticated')::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
  row_a:=public.review_ticket_assessment(correction,'APPROVED','Team checked'); IF row_a.review_stage<>'FINAL_REVIEW' THEN RAISE EXCEPTION 'Missing final review'; END IF;
  denied:=false;BEGIN PERFORM public.review_ticket_assessment(correction,'APPROVED','');EXCEPTION WHEN insufficient_privilege THEN denied:=true;END; IF NOT denied THEN RAISE EXCEPTION 'Team lead granted final approval'; END IF;
  checks:=checks||jsonb_build_array('team lead approves for final review and cannot grant final approval');
  EXECUTE 'RESET ROLE'; PERFORM set_config('request.jwt.claim.sub',chief::text,true); PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',chief,'role','authenticated')::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
  IF NOT EXISTS(SELECT 1 FROM public.notification_logs WHERE data->>'ticketId'=ticket::text AND title LIKE 'Final review:%') THEN RAISE EXCEPTION 'Final review notification missing'; END IF;
  denied:=false;BEGIN PERFORM public.record_ticket_utility_handoff(ticket,'QA delivery');EXCEPTION WHEN check_violation THEN denied:=true;END; IF NOT denied THEN RAISE EXCEPTION 'Unapproved utility handoff accepted'; END IF;
  row_a:=public.review_ticket_assessment(correction,'APPROVED','Final checked'); IF row_a.reviewed_by<>chief THEN RAISE EXCEPTION 'Final reviewer not bound'; END IF;
  row_t:=public.record_ticket_utility_handoff(ticket,'QA PDF delivery reference'); IF row_t.status<>'CLOSED' OR row_t.review_stage<>'UTILITY_SUBMITTED' OR row_t.utility_submitted_by<>chief THEN RAISE EXCEPTION 'Handoff not recorded'; END IF;
  checks:=checks||jsonb_build_array('chief receives final notification; approval gates recorded PDF handoff');
  RAISE SQLSTATE 'PT001' USING MESSAGE='rollback successful QA fixtures';
 EXCEPTION WHEN SQLSTATE 'PT001' THEN NULL;
 END;
 SELECT jsonb_build_object('profiles',(SELECT count(*) FROM public.profiles),'users',(SELECT count(*) FROM auth.users),'tickets',(SELECT count(*) FROM public.tickets),'crews',(SELECT count(*) FROM public.field_crews),'assessments',(SELECT count(*) FROM public.damage_assessments),'drafts',(SELECT count(*) FROM public.ticket_assessment_drafts),'media',(SELECT count(*) FROM public.media_assets),'objects',(SELECT count(*) FROM storage.objects),'notifications',(SELECT count(*) FROM public.notification_logs),'audits',(SELECT count(*) FROM public.audit_logs)) INTO after_counts;
 IF baseline<>after_counts THEN RAISE EXCEPTION 'Rollback fixture counts changed'; END IF;
 PERFORM set_config('cc.workflow_qa',jsonb_build_object('scope','Live Postgres with simulated request claims; fixtures rolled back. Browser and Storage API uploads not tested.','passed',jsonb_array_length(checks),'checks',checks,'rollback_counts_match',true)::text,false);
END $qa$;
SELECT current_setting('cc.workflow_qa')::jsonb AS result;
