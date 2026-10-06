-- Live database-only acceptance. No browser, camera, or GPS proof.
-- Every fixture, temporary role assignment, and rate edit rolls back inside
-- an exception subtransaction. No production rows are retained.
DO $qa$
DECLARE
  contractor uuid := 'adc6d309-e84e-4b97-81cb-b6ac168dea02';
  other_contractor uuid := '9ec4249c-a9a8-44b0-a231-f79ac7997886';
  actor uuid := '69e8696f-9dc9-4f37-8bcd-75868d219635';
  other_actor uuid := '033a451f-c47c-4984-b058-b15bad822352';
  administrator uuid := '4bd03b59-3a04-4c8a-aa09-d7fe1f0a6512';
  storm uuid := '418bd00d-4bf0-47af-9429-8f2704b416a5';
  shift uuid := gen_random_uuid();
  other_shift uuid := gen_random_uuid();
  claim uuid := gen_random_uuid();
  before_entries bigint;
  before_claims bigint;
  saved_wage numeric;
  saved_bill numeric;
  saved_rate numeric;
  affected integer;
  denied boolean;
  checks jsonb := '[]'::jsonb;
BEGIN
  SELECT count(*) INTO before_entries FROM public.time_entries;
  SELECT count(*) INTO before_claims FROM public.time_entry_vehicle_claims;
  BEGIN
    UPDATE public.contractors SET role='DRIVER' WHERE id=contractor;
    INSERT INTO public.time_entries(id,contractor_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,break_minutes)
      VALUES(shift,contractor,storm,now()-interval '4 hours',now(),'TRAVEL',999,0),
            (other_shift,other_contractor,storm,now()-interval '2 hours',now(),'TRAVEL',999,0);
    SELECT payroll_amount,utility_bill_amount,pay_rate_applied INTO saved_wage,saved_bill,saved_rate
      FROM public.time_entries WHERE id=shift;
    IF saved_wage<>4*saved_rate OR saved_bill IS NULL OR saved_rate=999 THEN RAISE EXCEPTION 'Incorrect initial snapshots'; END IF;
    checks:=checks||jsonb_build_array('configured wage and billing snapshots');

    PERFORM set_config('request.jwt.claim.sub',actor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    IF (SELECT count(*) FROM public.time_entries WHERE id=shift)<>1 THEN RAISE EXCEPTION 'Own shift missing'; END IF;
    checks:=checks||jsonb_build_array('contractor reads own shift through live RLS');
    IF (SELECT count(*) FROM public.time_entries WHERE id=other_shift)<>0 THEN RAISE EXCEPTION 'Cross-contractor shift visible'; END IF;
    checks:=checks||jsonb_build_array('other contractor shift hidden through live RLS');

    denied:=false;
    BEGIN
      INSERT INTO public.time_entry_vehicle_claims(time_entry_id,contractor_id,vehicle_type,declared_hours,notes,vehicle_photo_url,license_plate_photo_url,status)
        VALUES(shift,contractor,'PERSONAL',1,'Rollback QA',contractor||'/time-entries/'||shift||'/vehicle.jpg',contractor||'/time-entries/'||shift||'/plate.jpg','APPROVED');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%await administrator review%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Preapproved insertion succeeded'; END IF;
    checks:=checks||jsonb_build_array('preapproved claim insertion rejected');

    denied:=false;
    BEGIN
      INSERT INTO public.time_entry_vehicle_claims(time_entry_id,contractor_id,vehicle_type,declared_hours,notes,vehicle_photo_url,license_plate_photo_url)
        VALUES(shift,contractor,'PERSONAL',1,'Rollback QA','another/shift.jpg',contractor||'/time-entries/'||shift||'/plate.jpg');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%photos must belong%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Wrong photo path accepted'; END IF;
    checks:=checks||jsonb_build_array('foreign photo path rejected');

    denied:=false;
    BEGIN
      INSERT INTO public.time_entry_vehicle_claims(time_entry_id,contractor_id,vehicle_type,declared_hours,notes,vehicle_photo_url,license_plate_photo_url)
        VALUES(other_shift,contractor,'PERSONAL',1,'Rollback QA',contractor||'/time-entries/'||other_shift||'/vehicle.jpg',contractor||'/time-entries/'||other_shift||'/plate.jpg');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%same contractor and a driver shift%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Wrong contractor shift accepted'; END IF;
    checks:=checks||jsonb_build_array('claim cannot link another contractor shift');

    INSERT INTO public.time_entry_vehicle_claims(id,time_entry_id,contractor_id,vehicle_type,declared_hours,notes,vehicle_photo_url,license_plate_photo_url)
      VALUES(claim,shift,contractor,'PERSONAL',8,'Rollback QA',contractor||'/time-entries/'||shift||'/vehicle.jpg',contractor||'/time-entries/'||shift||'/plate.jpg');
    IF NOT EXISTS(SELECT 1 FROM public.time_entry_vehicle_claims WHERE id=claim AND declared_hours=4 AND amount=20 AND capped AND status='PENDING') THEN RAISE EXCEPTION 'Incorrect claim cap'; END IF;
    checks:=checks||jsonb_build_array('claim capped to four hours and twenty dollars');
    UPDATE public.time_entry_vehicle_claims SET status='APPROVED' WHERE id=claim;
    GET DIAGNOSTICS affected=ROW_COUNT;
    IF affected<>0 THEN RAISE EXCEPTION 'Contractor approval allowed by RLS'; END IF;
    checks:=checks||jsonb_build_array('contractor approval blocked by live RLS');

    denied:=false;
    BEGIN
      UPDATE public.time_entries SET clock_out_at=null WHERE id=shift;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%immutable%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Closed shift reopened'; END IF;
    checks:=checks||jsonb_build_array('closed shift cannot reopen');
    UPDATE public.time_entries SET payroll_amount=1,pay_rate_applied=999,utility_bill_amount=1 WHERE id=shift;
    IF NOT EXISTS(SELECT 1 FROM public.time_entries WHERE id=shift AND payroll_amount=saved_wage AND pay_rate_applied=saved_rate AND utility_bill_amount=saved_bill) THEN RAISE EXCEPTION 'Snapshot tampering persisted'; END IF;
    checks:=checks||jsonb_build_array('snapshot-only tampering overwritten');

    EXECUTE 'RESET ROLE';
    -- Even a privileged write with a contractor identity cannot bypass the guard.
    denied:=false;
    BEGIN
      UPDATE public.time_entry_vehicle_claims SET status='APPROVED' WHERE id=claim;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Administrator review required%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Claim trigger missed status-only contractor review'; END IF;
    checks:=checks||jsonb_build_array('status-only trigger requires active administrator');

    UPDATE public.role_rate_defaults SET hourly_rate=hourly_rate+100 WHERE role='DRIVER' AND work_type='TRAVEL';
    UPDATE public.utility_billing_rates SET hourly_rate=hourly_rate+100 WHERE work_type='TRAVEL';
    UPDATE public.time_entries SET status='APPROVED',break_minutes=break_minutes WHERE id=shift;
    IF NOT EXISTS(SELECT 1 FROM public.time_entries WHERE id=shift AND payroll_amount=saved_wage AND utility_bill_amount=saved_bill AND pay_rate_applied=saved_rate) THEN RAISE EXCEPTION 'Closed shift rate drift'; END IF;
    checks:=checks||jsonb_build_array('rate edits and resent costing inputs preserve closed snapshots');

    PERFORM set_config('request.jwt.claim.sub',administrator::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',administrator,'role','authenticated')::text,true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    denied:=false;
    BEGIN
      UPDATE public.time_entry_vehicle_claims SET status='REJECTED' WHERE id=claim;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Rejection reason required%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Reasonless rejection accepted'; END IF;
    checks:=checks||jsonb_build_array('rejection requires a reason');
    UPDATE public.time_entry_vehicle_claims SET status='APPROVED',amount=999,capped=false,reviewed_by=other_actor,reviewed_at='2000-01-01' WHERE id=claim;
    IF NOT EXISTS(SELECT 1 FROM public.time_entry_vehicle_claims WHERE id=claim AND amount=20 AND capped AND status='APPROVED' AND reviewed_by=administrator AND reviewed_at>'2026-01-01') THEN RAISE EXCEPTION 'Approval integrity failed'; END IF;
    checks:=checks||jsonb_build_array('administrator approval binds real actor and server timestamp','review preserves amount and original cap');
    denied:=false;
    BEGIN
      UPDATE public.time_entry_vehicle_claims SET status='REJECTED',rejection_reason='Rollback QA' WHERE id=claim;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%already been reviewed%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Repeated review accepted'; END IF;
    checks:=checks||jsonb_build_array('review cannot be repeated');

    PERFORM set_config('request.jwt.claim.sub',actor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
    IF (SELECT sum(amount) FROM public.time_entry_vehicle_claims WHERE time_entry_id=shift AND status='APPROVED')<>20 THEN RAISE EXCEPTION 'Contractor reimbursement mismatch'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.time_entries t JOIN public.time_entry_vehicle_claims c ON c.time_entry_id=t.id AND c.contractor_id=t.contractor_id WHERE t.id=shift AND t.payroll_amount+c.amount=saved_wage+20) THEN RAISE EXCEPTION 'Linked payout mismatch'; END IF;
    checks:=checks||jsonb_build_array('contractor reads approved reimbursement','linked payout matches saved wage plus approved reimbursement');
    PERFORM set_config('request.jwt.claim.sub',other_actor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',other_actor,'role','authenticated')::text,true);
    IF (SELECT count(*) FROM public.time_entry_vehicle_claims WHERE id=claim)<>0 THEN RAISE EXCEPTION 'Cross-contractor claim visible'; END IF;
    checks:=checks||jsonb_build_array('other contractor cannot read claim');
    RAISE SQLSTATE 'ZX001' USING MESSAGE='ROLLBACK_QA_FIXTURES';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    NULL; -- rolls back rows, rate edits, role edits, and simulated identity.
  END;
  IF (SELECT count(*) FROM public.time_entries)<>before_entries OR (SELECT count(*) FROM public.time_entry_vehicle_claims)<>before_claims THEN RAISE EXCEPTION 'Fixture rollback failed'; END IF;
  checks:=checks||jsonb_build_array('all fixtures and temporary edits rolled back');
  PERFORM set_config('cc.payroll_qa_result',jsonb_build_object('checks',checks,'passed',jsonb_array_length(checks),'saved_wage',saved_wage,'saved_bill',saved_bill,'reimbursement',20,'fixtures_rolled_back',true,'proof_scope','live database and RLS with simulated request identities; not browser or hardware acceptance')::text,false);
END $qa$;
SELECT current_setting('cc.payroll_qa_result')::jsonb AS payroll_qa;
