BEGIN;
UPDATE profiles SET role='ADMIN' WHERE id='924f0983-cb9b-48ae-9688-4bf31cc94e73';
SELECT set_config('request.jwt.claim.sub','924f0983-cb9b-48ae-9688-4bf31cc94e73',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE blocked boolean; n integer; BEGIN
 IF private.has_permission(auth.uid(),'admin.payroll.edit') THEN RAISE EXCEPTION 'Admin edit ceiling failed'; END IF;
 SELECT count(*) INTO n FROM time_entries; IF n<7 THEN RAISE EXCEPTION 'Admin operational reads failed'; END IF;
 SELECT count(*) INTO n FROM utility_billing_rates; IF n<>0 THEN RAISE EXCEPTION 'Admin rate disclosure'; END IF;
 blocked:=false; BEGIN PERFORM utility_bill_amount FROM time_entries; EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END; IF NOT blocked THEN RAISE EXCEPTION 'Admin secret columns exposed'; END IF;
 blocked:=false; BEGIN PERFORM get_privileged_payroll_entries(); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END; IF NOT blocked THEN RAISE EXCEPTION 'Admin financial function exposed'; END IF;
 UPDATE time_entries SET status='APPROVED' WHERE id='943227c2-26ac-4959-9526-d457a98d9944'; GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Admin approval allowed'; END IF;
END $$;
ROLLBACK;
SELECT 'Admin RLS and column guards passed in rollback-only JWT role simulation' result;
