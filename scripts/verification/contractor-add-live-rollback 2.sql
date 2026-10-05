BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE actor uuid; worker uuid; result jsonb; email text:='qa-add-'||gen_random_uuid()::text||'@example.test'; terms jsonb; before_contractors bigint; before_agreements bigint;
BEGIN
 SELECT id INTO actor FROM public.profiles WHERE role::text='SUPER_ADMIN' AND is_active AND NOT must_reset_password ORDER BY created_at LIMIT 1;
 SELECT a.terms INTO terms FROM public.contractor_pay_agreements a ORDER BY a.created_at LIMIT 1;
 terms:=jsonb_set(terms,'{work_type_rates}',(terms->'work_type_rates')-'ADMIN'-'TRAINING');
 SELECT count(*) INTO before_contractors FROM public.contractors;
 SELECT count(*) INTO before_agreements FROM public.contractor_pay_agreements;
 result:=public.add_contractor_record(actor,'QA','Rollback',email,'(318) 555-0123',terms);
 IF NOT EXISTS(SELECT 1 FROM public.contractors WHERE id=(result->>'id')::uuid AND profile_id IS NULL AND first_name='QA' AND last_name='Rollback' AND business_email=email AND onboarding_status='PENDING' AND NOT is_eligible_for_assignment) THEN RAISE EXCEPTION 'Contact save mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.contractor_pay_agreements WHERE id=(result->>'agreement_id')::uuid AND contractor_id=(result->>'id')::uuid AND created_by=actor) THEN RAISE EXCEPTION 'Agreement linkage mismatch'; END IF;

 BEGIN
  PERFORM public.add_contractor_record(actor,'QA','Duplicate',upper(email),'',terms);
  RAISE EXCEPTION 'Duplicate was accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  PERFORM public.add_contractor_record(actor,'QA','Invalid','invalid-'||email,'',jsonb_set(terms,'{work_type_rates}','{"TRAINING":65}'::jsonb));
  RAISE EXCEPTION 'Removed work type was accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT count(*) FROM public.contractors)<>before_contractors+1 OR (SELECT count(*) FROM public.contractor_pay_agreements)<>before_agreements+1 THEN RAISE EXCEPTION 'Partial records left behind'; END IF;
 PERFORM set_config('test.added_id',result->>'id',true);
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
END $$;
RESET ROLE;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE action='CONTRACTOR_ADDED' AND entity_id=current_setting('test.added_id')::uuid) THEN RAISE EXCEPTION 'Audit linkage mismatch'; END IF; END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.contractors WHERE id=current_setting('test.added_id')::uuid) THEN RAISE EXCEPTION 'Staff cannot read added record'; END IF;
 BEGIN
  PERFORM public.add_contractor_record(null,'QA','Forbidden','forbidden@example.test','','{}'::jsonb);
  RAISE EXCEPTION 'Public function execution allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ DECLARE worker uuid; BEGIN
 SELECT profile_id INTO worker FROM public.contractors WHERE profile_id IS NOT NULL LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',worker::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.contractors WHERE id=current_setting('test.added_id')::uuid) THEN RAISE EXCEPTION 'Worker can read unrelated added record'; END IF;
END $$;
RESET ROLE;
SELECT 'Passed: atomic linked save, duplicate rejection, removed work type rejection, staff read, server-only execution, contractor isolation; all fixtures rollback.' AS result;
ROLLBACK;
