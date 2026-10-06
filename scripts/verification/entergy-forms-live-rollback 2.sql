-- Live Postgres/RLS checks with simulated request claims. Temporary records roll back.
-- This does not exercise a browser login or the Storage upload API.
DO $qa$
DECLARE
 chief uuid; lead uuid:=gen_random_uuid(); other_lead uuid:=gen_random_uuid(); assessor uuid:=gen_random_uuid(); driver uuid:=gen_random_uuid();
 assessor_contract uuid:=gen_random_uuid(); driver_contract uuid:=gen_random_uuid(); storm uuid; ticket uuid; crew uuid; revision uuid:=gen_random_uuid(); correction uuid:=gen_random_uuid();
 payload jsonb := $payload${"version":1,"answers":{"phases":"1","framing":"TANGENT","hasTap":false,"tapPhases":null,"treeCrewsNeeded":false,"treeWorkload":null,"treeDamage":null,"poleBroken":false,"poleHeight":null,"poleAccessible":null,"poleDamage":null,"conductorBroken":false,"conductorSize":null,"spansDown":null,"conductorDamage":null,"transformerDown":false,"transformerKva":null,"transformerCount":null,"transformerDamage":null,"servicesDamaged":false,"serviceCount":null,"serviceSize":null,"serviceConfiguration":null,"serviceDamage":null,"hasCrossArm":false,"crossArmMaterial":null,"crossArmsDamaged":null,"crossArmCount":null,"crossArmDamage":null,"insulatorsBroken":false,"insulatorCount":null,"insulatorDamage":null,"publicDanger":false,"publicDangerDetails":null,"oilLeak":false,"oilLeakDetails":null,"additionalNotes":"None"}}$payload$::jsonb; evidence jsonb; photo jsonb; photo_id uuid; row_d public.ticket_assessment_drafts; row_a public.damage_assessments; row_t public.tickets;
 clean jsonb:=$clean${"version": 1, "answers": {"environmentalCleanup": "None", "trashCleanup": "Wood: 2 poles", "address": "100 Utility Lane", "cityTown": "Shreveport", "dloc": "00000001234", "truckAccess": false, "notes": "Blocked gate"}, "equipmentRows": [], "customerRows": [], "lightingMap": [], "damageReports": {}}$clean$::jsonb; damage jsonb:=$damage${"version": 1, "answers": {"date": "2026-10-06", "equipmentTypes": ["Pole"], "activities": ["Install/Remove"], "fromLocalOffice": null, "fromStoreRoom": null, "fromDloc": "00000001234", "toLocalOffice": null, "toStoreRoom": null, "toDloc": null, "latitude": null, "longitude": null, "phaseChange": null, "transformerPurpose": [], "primaryVoltage": null, "secondaryVoltage": null, "idleTransformerInspection": [], "bankConnection": [], "feederNumber": null, "feederChange": null, "streetLightWattage": null, "streetLightType": null, "privateAreaLightWattage": null, "privateAreaLightType": null, "lightingMapNotes": null, "customer": null, "fieldAddressComments": "100 Utility Lane", "switchTypes": [], "installedNumber": null, "removedNumber": null, "switchQuantity": null, "switchSize": null, "switchType": null, "changeStatus": [], "switchPosition": [], "switchManufacturerNumber": null, "catalogNumber": null, "manufacturerSerialNumber": null, "manufacturerDate": null, "bypassSwitchTypes": [], "bypassSize": null, "bypassType": null, "poleInstallSizeClass": null, "poleRemoveSizeClass": null, "poleOwners": [], "poleOtherOwner": null, "communicationDeviceTypes": [], "commEquipmentNumber": null, "commSerialNumber": null, "commBatteryEquipmentNumber": null, "commBatterySerialNumber": null, "antennaLocations": [], "commReasons": [], "controlEquipmentNumber": null, "controlSerialNumber": null, "commBridgeEquipmentNumber": null, "commBridgeSerialNumber": null, "battery1EquipmentNumber": null, "battery1SerialNumber": null, "battery2EquipmentNumber": null, "battery2SerialNumber": null, "controlReasons": [], "signature": "Rollback Assessor", "workOrderNumber": "00042", "employeeId": "C001"}, "equipmentRows": [{"operation": "Install", "type": null, "size": null, "companyEquipmentNumber": null, "manufacturerSerialNumber": null, "phases": [], "fieldPhase": null, "counterReading": null}, {"operation": "Remove", "type": null, "size": null, "companyEquipmentNumber": null, "manufacturerSerialNumber": null, "phases": [], "fieldPhase": null, "counterReading": null}, {"operation": "Install", "type": null, "size": null, "companyEquipmentNumber": null, "manufacturerSerialNumber": null, "phases": [], "fieldPhase": null, "counterReading": null}, {"operation": "Remove", "type": null, "size": null, "companyEquipmentNumber": null, "manufacturerSerialNumber": null, "phases": [], "fieldPhase": null, "counterReading": null}, {"operation": "Install", "type": null, "size": null, "companyEquipmentNumber": null, "manufacturerSerialNumber": null, "phases": [], "fieldPhase": null, "counterReading": null}, {"operation": "Remove", "type": null, "size": null, "companyEquipmentNumber": null, "manufacturerSerialNumber": null, "phases": [], "fieldPhase": null, "counterReading": null}], "customerRows": [{"customerNameAddress": null, "identifierTypes": [], "identifier": null, "oldDlocTransformer": null, "newDlocTransformer": null}, {"customerNameAddress": null, "identifierTypes": [], "identifier": null, "oldDlocTransformer": null, "newDlocTransformer": null}, {"customerNameAddress": null, "identifierTypes": [], "identifier": null, "oldDlocTransformer": null, "newDlocTransformer": null}], "lightingMap": [], "damageReports": {}}$damage$::jsonb; row_f public.ticket_entergy_forms; row_g public.ticket_entergy_forms;
 checks jsonb:='[]'; baseline jsonb; after_counts jsonb; expected_notifications integer; count_rows integer; denied boolean; path text;
BEGIN
 SELECT id INTO chief FROM public.profiles WHERE role='CEO' AND is_active AND NOT must_reset_password LIMIT 1;
 IF chief IS NULL THEN RAISE EXCEPTION 'An active CEO is required for the rollback QA fixture'; END IF;
 SELECT jsonb_build_object('profiles',(SELECT count(*) FROM public.profiles),'users',(SELECT count(*) FROM auth.users),'tickets',(SELECT count(*) FROM public.tickets),'crews',(SELECT count(*) FROM public.field_crews),'assessments',(SELECT count(*) FROM public.damage_assessments),'drafts',(SELECT count(*) FROM public.ticket_assessment_drafts),'media',(SELECT count(*) FROM public.media_assets),'objects',(SELECT count(*) FROM storage.objects),'notifications',(SELECT count(*) FROM public.notification_logs),'audits',(SELECT count(*) FROM public.audit_logs),'entergy',(SELECT count(*) FROM public.ticket_entergy_forms)) INTO baseline;
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
  SELECT 'QA-'||left(gen_random_uuid()::text,8),'Rollback workflow QA',utility_client,'ACTIVE',ticket_template_key,config_snapshot,utility_id,customer_id FROM public.storm_events WHERE NOT coalesce(is_deleted,false) AND utility_client='ENTERGY' LIMIT 1 RETURNING id INTO storm;
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

  SELECT * INTO row_f FROM public.save_entergy_ticket_form(revision,ticket,'cleanup',clean,'[]',NULL,false);
  SELECT * INTO row_g FROM public.save_entergy_ticket_form(correction,ticket,'damage',damage,'[]',NULL,false);
  IF row_f.saved_by<>assessor OR row_g.saved_by<>assessor OR (SELECT count(*) FROM public.ticket_entergy_forms WHERE ticket_id=ticket)<>2 OR row_f.payload->'answers'->>'dloc'<>'00000001234' THEN RAISE EXCEPTION 'Separate drafts or source identifiers not preserved'; END IF;
  checks:=checks||jsonb_build_array('live assessor saves and reads independent cleanup/damage drafts, preserving leading zeros');
  SELECT * INTO row_f FROM public.save_entergy_ticket_form(revision,ticket,'cleanup',jsonb_set(clean,'{answers,notes}','"Updated gate note"'),'[]',row_f.version,false);
  clean:=row_f.payload;
  denied:=false;BEGIN PERFORM public.save_entergy_ticket_form(revision,ticket,'cleanup',jsonb_set(clean,'{answers,notes}','"Stale device"'),'[]',1,false);EXCEPTION WHEN serialization_failure THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Stale save allowed';END IF;
  SELECT * INTO row_f FROM public.save_entergy_ticket_form(revision,ticket,'cleanup',clean,'[]',1,false);
  IF row_f.version<>2 THEN RAISE EXCEPTION 'Exact retry changed version';END IF;
  checks:=checks||jsonb_build_array('live stale-device edits rejected and exact retries idempotent');
  denied:=false;BEGIN PERFORM public.save_entergy_ticket_form(revision,ticket,'cleanup',clean,'[]',2,true);EXCEPTION WHEN check_violation THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Evidence-free submission allowed';END IF;
  SELECT jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'type',k,'gpsLatitude',30,'gpsLongitude',-90,'checksumSha256',repeat('a',64))) INTO evidence FROM unnest(ARRAY['OVERVIEW','EQUIPMENT','DAMAGE','SAFETY']) k;
  denied:=false;BEGIN PERFORM public.save_entergy_ticket_form(revision,ticket,'cleanup',clean,evidence,2,true);EXCEPTION WHEN check_violation THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Unuploaded evidence allowed';END IF;
  checks:=checks||jsonb_build_array('live submission rejects absent and unuploaded evidence');
  -- Object rows and metadata simulate completed uploads. No image bytes are uploaded here.
  FOR photo IN SELECT value FROM jsonb_array_elements(evidence) LOOP
   photo_id:=(photo->>'id')::uuid;path:=assessor||'/tickets/'||ticket||'/'||photo_id||'-original.jpg';
   INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('assessment-photos',path,assessor::text);
   INSERT INTO public.media_assets(id,uploaded_by,contractor_id,file_name,original_name,file_type,mime_type,file_size_bytes,storage_bucket,storage_path,entity_type,entity_id,upload_status,gps_latitude,gps_longitude,checksum_sha256) VALUES(photo_id,assessor,assessor_contract,'rollback.jpg','rollback.jpg','PHOTO','image/jpeg',10,'assessment-photos',path,'ticket',ticket,'COMPLETED',30,-90,repeat('a',64));
  END LOOP;
  SELECT * INTO row_f FROM public.save_entergy_ticket_form(revision,ticket,'cleanup',clean,evidence,2,true);
  IF row_f.status<>'SUBMITTED' OR row_f.version<>3 OR row_f.submitted_at IS NULL OR row_f.saved_by<>assessor THEN RAISE EXCEPTION 'Submission identity or state wrong';END IF;
  SELECT * INTO row_f FROM public.save_entergy_ticket_form(revision,ticket,'cleanup',clean,evidence,2,true);
  IF row_f.version<>3 THEN RAISE EXCEPTION 'Submission retry changed version';END IF;
  checks:=checks||jsonb_build_array('live submission binds uploaded linked GPS evidence, identity and immutable version');
  denied:=false;BEGIN PERFORM public.save_entergy_ticket_form(revision,ticket,'cleanup',jsonb_set(clean,'{answers,notes}','"Changed"'),evidence,3,false);EXCEPTION WHEN check_violation THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Submitted edit allowed';END IF;
  denied:=false;BEGIN UPDATE public.ticket_entergy_forms SET payload=clean WHERE id=correction;EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Direct write allowed';END IF;
  IF private.ticket_photo_access(path,true) THEN RAISE EXCEPTION 'Submitted photo overwrite allowed';END IF;
  UPDATE storage.objects SET name=name||'.changed' WHERE bucket_id='assessment-photos' AND name=path;
  IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='assessment-photos' AND name=path||'.changed') THEN RAISE EXCEPTION 'Submitted object moved';END IF;
  checks:=checks||jsonb_build_array('live direct writes, submitted form edits and linked object overwrites rejected');
  denied:=false;BEGIN PERFORM public.save_entergy_ticket_form(correction,ticket,'damage',jsonb_set(damage,'{damageReports}','{"pole":"Split base"}'),evidence,1,true);EXCEPTION WHEN check_violation THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Section evidence omitted';END IF;
  checks:=checks||jsonb_build_array('live damage sections require their own linked photo');
  damage:=jsonb_set(jsonb_set(damage,'{answers,equipmentTypes}','["Streetlight"]'),'{answers,activities}','["Install"]');
  SELECT * INTO row_g FROM public.save_entergy_ticket_form(correction,ticket,'damage',damage,evidence,1,true);
  IF row_g.status<>'SUBMITTED' OR row_g.payload->'lightingMap'<>'[]'::jsonb THEN RAISE EXCEPTION 'Lighting work still requires a map';END IF;
  checks:=checks||jsonb_build_array('live new lighting work submits without a map');
  EXECUTE 'RESET ROLE';PERFORM set_config('request.jwt.claim.sub',driver::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',driver,'role','authenticated')::text,true);EXECUTE 'SET LOCAL ROLE authenticated';
  IF (SELECT count(*) FROM public.ticket_entergy_forms WHERE ticket_id=ticket)<>2 OR (SELECT count(*) FROM storage.objects WHERE bucket_id='assessment-photos' AND name LIKE '%/tickets/'||ticket||'/%')<>4 THEN RAISE EXCEPTION 'Driver cannot read linked records';END IF;
  denied:=false;BEGIN PERFORM public.save_entergy_ticket_form(correction,ticket,'damage',damage,'[]',1,false);EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Driver authored form';END IF;
  checks:=checks||jsonb_build_array('live assigned driver reads forms/private evidence but cannot author');
  EXECUTE 'RESET ROLE';PERFORM set_config('request.jwt.claim.sub',lead::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',lead,'role','authenticated')::text,true);EXECUTE 'SET LOCAL ROLE authenticated';
  IF (SELECT count(*) FROM public.ticket_entergy_forms WHERE ticket_id=ticket)<>2 THEN RAISE EXCEPTION 'Team lead cannot read';END IF;
  denied:=false;BEGIN PERFORM public.save_entergy_ticket_form(correction,ticket,'damage',damage,'[]',1,false);EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Team lead bypassed assessor';END IF;
  checks:=checks||jsonb_build_array('live assigned team lead reads forms without bypassing assessor write boundary');
  EXECUTE 'RESET ROLE';PERFORM set_config('request.jwt.claim.sub',other_lead::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',other_lead,'role','authenticated')::text,true);EXECUTE 'SET LOCAL ROLE authenticated';
  IF (SELECT count(*) FROM public.ticket_entergy_forms WHERE ticket_id=ticket)<>0 THEN RAISE EXCEPTION 'Unrelated staff reads form';END IF;
  denied:=false;BEGIN PERFORM public.save_entergy_ticket_form(correction,ticket,'damage',damage,'[]',1,false);EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Unrelated staff authored form';END IF;
  checks:=checks||jsonb_build_array('live unrelated staff cannot read or author another team forms');
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE entity_id=revision AND action='ENTERGY_FORM_SUBMITTED' AND user_id=assessor) THEN RAISE EXCEPTION 'Audit missing';END IF;
  PERFORM set_config('request.jwt.claim.sub',assessor::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',assessor,'role','authenticated')::text,true);
  denied:=false;BEGIN UPDATE public.media_assets SET gps_latitude=31 WHERE id=photo_id;EXCEPTION WHEN check_violation THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Submitted metadata changed';END IF;
  denied:=false;BEGIN DELETE FROM public.ticket_entergy_forms WHERE id=revision;EXCEPTION WHEN check_violation THEN denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'Submitted record deleted';END IF;
  IF has_function_privilege('anon','public.save_entergy_ticket_form(uuid,uuid,text,jsonb,jsonb,integer,boolean)','EXECUTE') OR has_table_privilege('anon','public.ticket_entergy_forms','SELECT') THEN RAISE EXCEPTION 'Anonymous privilege found';END IF;
  checks:=checks||jsonb_build_array('live audit identity, privileged immutability guards and anonymous denial verified');
  RAISE SQLSTATE 'PT001' USING MESSAGE='rollback successful Entergy QA fixtures';
 EXCEPTION WHEN SQLSTATE 'PT001' THEN NULL;
 END;
 SELECT jsonb_build_object('profiles',(SELECT count(*) FROM public.profiles),'users',(SELECT count(*) FROM auth.users),'tickets',(SELECT count(*) FROM public.tickets),'crews',(SELECT count(*) FROM public.field_crews),'assessments',(SELECT count(*) FROM public.damage_assessments),'drafts',(SELECT count(*) FROM public.ticket_assessment_drafts),'media',(SELECT count(*) FROM public.media_assets),'objects',(SELECT count(*) FROM storage.objects),'notifications',(SELECT count(*) FROM public.notification_logs),'audits',(SELECT count(*) FROM public.audit_logs),'entergy',(SELECT count(*) FROM public.ticket_entergy_forms)) INTO after_counts;
 IF baseline<>after_counts THEN RAISE EXCEPTION 'Rollback fixture counts changed'; END IF;
 PERFORM set_config('cc.entergy_qa',jsonb_build_object('scope','Live Postgres with simulated request claims; fixtures rolled back. Browser and Storage API uploads not tested.','passed',jsonb_array_length(checks),'checks',checks,'rollback_counts_match',true)::text,false);
END $qa$;
SELECT current_setting('cc.entergy_qa')::jsonb AS result;
