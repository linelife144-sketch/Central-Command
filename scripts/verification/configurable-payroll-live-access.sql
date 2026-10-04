BEGIN;
SELECT set_config('request.jwt.claim.sub','4bb67281-647e-429a-b733-3e229c192043',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; denied boolean:=false; BEGIN
 SELECT count(*) INTO n FROM time_entries WHERE contractor_id<>'8c58d306-ed3c-4d2a-aa5a-79881ff7abd3'; IF n<>0 THEN RAISE EXCEPTION 'Worker ownership failed'; END IF;
 BEGIN PERFORM get_privileged_payroll_entries(); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'Worker confidential RPC allowed'; END IF;
END $$;
ROLLBACK;
BEGIN;
UPDATE profiles SET role='CEO' WHERE id='924f0983-cb9b-48ae-9688-4bf31cc94e73';
SELECT set_config('request.jwt.claim.sub','924f0983-cb9b-48ae-9688-4bf31cc94e73',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE rows jsonb; n integer; BEGIN
 SELECT get_privileged_payroll_entries() INTO rows; IF jsonb_array_length(rows)<7 OR NOT (rows->0)?'utility_bill_amount' THEN RAISE EXCEPTION 'CEO billing read failed'; END IF;
 UPDATE time_entries SET status='APPROVED' WHERE id='943227c2-26ac-4959-9526-d457a98d9944'; GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'CEO time approval failed'; END IF;
 UPDATE time_entry_vehicle_claims SET status='APPROVED' WHERE time_entry_id='943227c2-26ac-4959-9526-d457a98d9944'; GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'CEO claim approval failed'; END IF;
 IF (SELECT payroll_amount FROM time_entries WHERE id='943227c2-26ac-4959-9526-d457a98d9944')+(SELECT amount FROM time_entry_vehicle_claims WHERE time_entry_id='943227c2-26ac-4959-9526-d457a98d9944')<>0.95 THEN RAISE EXCEPTION 'Approved payout mismatch'; END IF;
END $$;
ROLLBACK;
SELECT 'Worker isolation, CEO billing reads, time and claim review, and payout passed in rollback-only JWT role simulation' result;
