-- Run only after the reviewed migration is active on the intended Supabase project.
-- Uses existing active identities, one ephemeral assigned ticket and two ephemeral shifts.
-- JWT claims, GPS coordinates, future clock-out time and Storage metadata rows are simulated.
-- No Auth account creation, email, permanent records, Storage API upload or device proof.
BEGIN;
CREATE TEMP TABLE crew_payroll_guard_qa(result jsonb);
DO $qa$
DECLARE
 chief uuid; assessor uuid; driver uuid; assessor_profile uuid; driver_profile uuid; storm uuid;
 ticket uuid:=gen_random_uuid(); shift uuid; driver_shift uuid; claim_id uuid:=gen_random_uuid();
 worker uuid; actor uuid; started timestamptz:=clock_timestamp()+interval '5 seconds';
 ended timestamptz; vehicle_path text; plate_path text; invalid_vehicle text;
 activity uuid:=gen_random_uuid(); checks jsonb:='[]'; denied boolean; affected integer;
 saved_wage numeric; saved_bill numeric; saved_allowance numeric; baseline jsonb;
BEGIN
 ended:=started+interval '4 hours';
 SELECT id INTO chief FROM public.profiles WHERE role::text IN ('CEO','SUPER_ADMIN') AND is_active AND NOT must_reset_password
  AND private.has_permission(id,'admin.payroll.edit') LIMIT 1;
 SELECT c.id,c.profile_id INTO driver,driver_profile FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id
 WHERE c.role::text='DRIVER' AND c.is_deleted IS NOT TRUE AND c.onboarding_completed_at IS NOT NULL AND p.is_active AND p.is_email_verified AND NOT p.must_reset_password
 AND NOT EXISTS(SELECT 1 FROM public.time_entries t WHERE t.contractor_id=c.id AND t.is_deleted IS NOT TRUE AND (t.clock_out_at IS NULL OR t.clock_out_at>started))
 AND EXISTS(SELECT 1 FROM public.contractor_pay_agreements a WHERE a.contractor_id=c.id AND a.effective_from<=started) LIMIT 1;
 SELECT c.id,c.profile_id INTO assessor,assessor_profile FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id
 WHERE c.role::text IN ('DAMAGE_ASSESSER','SR_DAMAGE_ASSESSER') AND c.is_deleted IS NOT TRUE AND c.onboarding_completed_at IS NOT NULL AND p.is_active AND p.is_email_verified AND NOT p.must_reset_password
 AND NOT EXISTS(SELECT 1 FROM public.time_entries t WHERE t.contractor_id=c.id AND t.is_deleted IS NOT TRUE AND (t.clock_out_at IS NULL OR t.clock_out_at>started))
 AND EXISTS(SELECT 1 FROM public.contractor_pay_agreements a WHERE a.contractor_id=c.id AND a.effective_from<=started) LIMIT 1;
 SELECT id INTO storm FROM public.storm_events WHERE is_deleted IS NOT TRUE LIMIT 1;
 IF chief IS NULL OR driver IS NULL OR assessor IS NULL OR storm IS NULL THEN
  RAISE EXCEPTION 'Rollback prerequisites: active privileged reviewer, onboarded assessor and driver with effective agreements and no overlapping shifts, and an active storm';
 END IF;
 SELECT jsonb_build_object('tickets',(SELECT count(*) FROM public.tickets),'shifts',(SELECT count(*) FROM public.time_entries),'claims',(SELECT count(*) FROM public.time_entry_vehicle_claims),'objects',(SELECT count(*) FROM storage.objects)) INTO baseline;
 PERFORM set_config('request.jwt.claim.sub',chief::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',chief,'role','authenticated')::text,true);
 -- Direct owner fixture creation deliberately isolates time-entry membership from crew dispatch.
 -- It does not test the Admin reviewer/crew-creation RPCs.
 INSERT INTO public.tickets(id,storm_event_id,ticket_number,address,utility_client,status,latitude,longitude,created_by,assigned_to,assigned_driver_id)
 SELECT ticket,storm,'QA-GUARD-'||left(ticket::text,8),'Rollback-only payroll guard fixture',s.utility_client,'ASSIGNED',32.5,-93.7,chief,assessor,driver FROM public.storm_events s WHERE s.id=storm;
 FOREACH worker IN ARRAY ARRAY[assessor,driver] LOOP
  actor:=CASE WHEN worker=assessor THEN assessor_profile ELSE driver_profile END;
  shift:=gen_random_uuid();
  INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos',worker||'/time-entries/'||shift||'/clock-in.jpg'),('time-entry-photos',worker||'/time-entries/'||shift||'/clock-out.jpg');
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url)
  VALUES(shift,worker,ticket,storm,started,'TRAVEL',999,32.5,-93.7,10,worker||'/time-entries/'||shift||'/clock-in.jpg');
  IF worker=driver THEN
   UPDATE public.time_entries SET activity_intervals=jsonb_build_array(jsonb_build_object('id',activity,'kind','VEHICLE_USE','start_at',started,'end_at',NULL)) WHERE id=shift;
  END IF;
  UPDATE public.time_entries SET clock_out_at=ended,clock_out_latitude=32.5,clock_out_longitude=-93.7,clock_out_accuracy=10,clock_out_photo_url=worker||'/time-entries/'||shift||'/clock-out.jpg',
   activity_intervals=CASE WHEN worker=driver THEN jsonb_build_array(jsonb_build_object('id',activity,'kind','VEHICLE_USE','start_at',started,'end_at',ended)) ELSE '[]'::jsonb END WHERE id=shift;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM public.time_entries WHERE id=shift AND clock_out_at=ended AND ticket_id=ticket AND contractor_id=worker AND payroll_amount>0 AND work_type_rate<>999) THEN RAISE EXCEPTION 'Crew actor shift or costing failed'; END IF;
  IF worker=driver THEN driver_shift:=shift; END IF;
 END LOOP;
 checks:=checks||jsonb_build_array('assessor and assigned driver clock-in, activity save and clock-out through authenticated live RLS');
 SELECT payroll_amount,utility_bill_amount,vehicle_allowance_amount INTO saved_wage,saved_bill,saved_allowance FROM public.time_entries WHERE id=driver_shift;
 IF saved_bill IS NULL OR saved_allowance IS NULL OR saved_allowance<=0 THEN RAISE EXCEPTION 'Driver fixture requires configured billing and enabled vehicle allowance'; END IF;
 vehicle_path:=driver||'/time-entries/'||driver_shift||'/vehicle.jpg'; plate_path:=driver||'/time-entries/'||driver_shift||'/plate.jpg';
 PERFORM set_config('request.jwt.claim.sub',driver_profile::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',driver_profile,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 denied:=false;
 BEGIN
  INSERT INTO public.time_entry_vehicle_claims(time_entry_id,contractor_id,vehicle_type,declared_hours,notes,vehicle_photo_url,license_plate_photo_url)
  VALUES(driver_shift,driver,'PERSONAL',999,'Rollback-only simulated evidence',vehicle_path,plate_path);
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%Upload both vehicle and license-plate%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Missing Storage objects accepted'; END IF;
 EXECUTE 'RESET ROLE';
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos',vehicle_path);
 EXECUTE 'SET LOCAL ROLE authenticated';
 denied:=false;
 BEGIN
  INSERT INTO public.time_entry_vehicle_claims(time_entry_id,contractor_id,vehicle_type,declared_hours,notes,vehicle_photo_url,license_plate_photo_url)
  VALUES(driver_shift,driver,'PERSONAL',999,'Rollback-only simulated evidence',vehicle_path,plate_path);
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%Upload both vehicle and license-plate%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'One uploaded photo accepted'; END IF;
 denied:=false;
 BEGIN
  INSERT INTO public.time_entry_vehicle_claims(time_entry_id,contractor_id,vehicle_type,declared_hours,notes,vehicle_photo_url,license_plate_photo_url)
  VALUES(driver_shift,driver,'PERSONAL',999,'Rollback-only simulated evidence',vehicle_path,vehicle_path);
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%distinct%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Duplicate path accepted'; END IF;
 checks:=checks||jsonb_build_array('missing objects, one uploaded object, and same-path claim rejected');
 FOREACH invalid_vehicle IN ARRAY ARRAY[NULL::text,assessor||'/time-entries/'||driver_shift||'/vehicle.jpg',driver||'/time-entries/'||gen_random_uuid()||'/vehicle.jpg'] LOOP
  denied:=false;
  BEGIN
   INSERT INTO public.time_entry_vehicle_claims(time_entry_id,contractor_id,vehicle_type,declared_hours,notes,vehicle_photo_url,license_plate_photo_url)
   VALUES(driver_shift,driver,'PERSONAL',999,'Rollback-only simulated evidence',invalid_vehicle,plate_path);
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%Vehicle photos must belong%' THEN RAISE; END IF; denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Null, foreign-owner or other-shift path accepted'; END IF;
 END LOOP;
 checks:=checks||jsonb_build_array('null, wrong-owner and wrong-shift claim evidence rejected');
 EXECUTE 'RESET ROLE';
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos',plate_path);
 EXECUTE 'SET LOCAL ROLE authenticated';
 INSERT INTO public.time_entry_vehicle_claims(id,time_entry_id,contractor_id,vehicle_type,declared_hours,notes,vehicle_photo_url,license_plate_photo_url)
 VALUES(claim_id,driver_shift,driver,'PERSONAL',999,'Rollback-only simulated evidence',vehicle_path,plate_path);
 IF NOT EXISTS(SELECT 1 FROM public.time_entry_vehicle_claims WHERE id=claim_id AND amount=saved_allowance AND declared_hours=4 AND status='PENDING') THEN RAISE EXCEPTION 'Saved allowance was not used'; END IF;
 UPDATE public.time_entry_vehicle_claims SET status='APPROVED' WHERE id=claim_id;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Contractor review was allowed by live RLS'; END IF;
 checks:=checks||jsonb_build_array('distinct uploaded paths accepted at saved allowance; contractor review denied');
 EXECUTE 'RESET ROLE';
 -- Missing objects after submission simulate a historical pending claim. Review must not retrovalidate INSERT evidence.
 DELETE FROM storage.objects WHERE bucket_id='time-entry-photos' AND name IN(vehicle_path,plate_path);
 PERFORM set_config('request.jwt.claim.sub',chief::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',chief,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 UPDATE public.time_entry_vehicle_claims SET status='APPROVED',amount=999,capped=true,reviewed_by=NULL WHERE id=claim_id;
 EXECUTE 'RESET ROLE';
 IF NOT EXISTS(SELECT 1 FROM public.time_entry_vehicle_claims WHERE id=claim_id AND status='APPROVED' AND amount=saved_allowance AND NOT capped AND reviewed_by=chief) THEN RAISE EXCEPTION 'Historical review or immutable amount guard failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.time_entries WHERE id=driver_shift AND payroll_amount=saved_wage AND utility_bill_amount=saved_bill AND vehicle_allowance_amount=saved_allowance) THEN RAISE EXCEPTION 'Claim review changed wage or billing'; END IF;
 checks:=checks||jsonb_build_array('missing historical evidence does not block privileged review; saved allowance, wage and billing unchanged');
 INSERT INTO crew_payroll_guard_qa VALUES(jsonb_build_object('environment','live SQL with simulated JWT/GPS/time/Storage metadata; no browser or upload API proof','passed',jsonb_array_length(checks),'checks',checks,'baseline',baseline,'rollback',true));
END $qa$;
SELECT result FROM crew_payroll_guard_qa;
ROLLBACK;
