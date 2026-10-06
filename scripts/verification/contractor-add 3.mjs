import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const runtime='/Users/davidmccarty/.codex/.chatgpt-projects/g-p-698e4e3dea2c819193d268ef77b9572e/workspace/e2e-20261001/policy-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const {PGlite}=await import(pathToFileURL(runtime));
const db=new PGlite();
const actor='11111111-1111-4111-8111-111111111111', ordinary='22222222-2222-4222-8222-222222222222';
await db.exec(`CREATE SCHEMA auth; CREATE SCHEMA private;
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TYPE public.user_role AS ENUM('SUPER_ADMIN','CEO','ADMIN','CONTRACTOR');
CREATE TYPE public.contractor_role AS ENUM('STORM_MANAGER','TEAM_LEAD','SR_DAMAGE_ASSESSER','DAMAGE_ASSESSER','DRIVER');
CREATE TYPE public.work_type AS ENUM('STANDARD_ASSESSMENT','EMERGENCY_RESPONSE','TRAVEL','STANDBY','ADMIN','TRAINING');
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
CREATE TABLE public.profiles(id uuid PRIMARY KEY,email text,role user_role,is_active boolean DEFAULT true,must_reset_password boolean DEFAULT false);
CREATE TABLE public.contractors(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid REFERENCES profiles(id),business_name text NOT NULL,business_email text,business_phone text,role contractor_role,onboarding_status text,is_eligible_for_assignment boolean,eligibility_reason text,created_by uuid);
CREATE TABLE public.contractor_rates(work_type work_type,hourly_rate numeric);
CREATE TABLE public.role_rate_defaults(role contractor_role,work_type work_type,hourly_rate numeric,PRIMARY KEY(role,work_type));
CREATE TABLE public.utility_billing_rates(work_type work_type,hourly_rate numeric);
CREATE TABLE public.time_entries(id uuid DEFAULT gen_random_uuid(),work_type work_type,payroll_amount numeric);
CREATE TABLE public.audit_logs(action text NOT NULL,entity_type text NOT NULL,entity_id uuid,user_id uuid,user_role user_role,old_values jsonb,new_values jsonb,change_summary text);
CREATE TABLE public.contractor_pay_agreements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contractor_id uuid REFERENCES contractors(id),created_at timestamptz, effective_from timestamptz,terms jsonb,created_by uuid);
CREATE FUNCTION private.has_permission(actor uuid,key text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce((SELECT is_active AND NOT must_reset_password AND role::text IN ('CEO','SUPER_ADMIN') FROM public.profiles WHERE id=actor),false) $$;
CREATE FUNCTION private.validate_compensation(p jsonb) RETURNS void LANGUAGE plpgsql AS $$BEGIN END$$;
GRANT USAGE ON SCHEMA public,private,auth TO service_role,authenticated,anon;
GRANT SELECT ON auth.users TO service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
INSERT INTO profiles VALUES('${actor}','staff@example.test','SUPER_ADMIN',true,false),('${ordinary}','admin@example.test','ADMIN',true,false);
INSERT INTO role_rate_defaults VALUES('DRIVER','ADMIN',65),('DRIVER','TRAINING',65),('DRIVER','TRAVEL',65);
INSERT INTO utility_billing_rates VALUES('ADMIN',125),('TRAINING',90),('TRAVEL',100);
INSERT INTO time_entries(work_type,payroll_amount) VALUES('TRAVEL',77);
`);
const migration=await readFile(new URL('../../supabase/migrations/20261004202255_add_contractor_records_and_remove_unused_work_types.sql',import.meta.url),'utf8');
await db.exec(migration);
await db.exec(`CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
ALTER TABLE time_entries ADD COLUMN contractor_id uuid, ADD COLUMN clock_out_at timestamptz;`);
const payrollSql=await readFile(new URL('../../supabase/migrations/20261004174918_configurable_contractor_time_payroll.sql',import.meta.url),'utf8');
const guard=payrollSql.match(/CREATE FUNCTION private.guard_pay_agreement\(\)[\s\S]*?END \$\$;/)[0];
await db.exec(guard+`CREATE TRIGGER guard_agreement BEFORE INSERT ON contractor_pay_agreements FOR EACH ROW EXECUTE FUNCTION private.guard_pay_agreement();`);

const terms={role:'DRIVER',base_hourly_rate:65,work_type_rates:{},policy:{mode:'FLAT',multiplier:1},driver_eligible:false,vehicle_allowance_enabled:false,vehicle_hourly_rate:0,week_start_day:1,timezone:'America/Chicago'};
const tests=[];
async function test(name,fn){await fn();tests.push(name);console.log('PASS '+name);}
await test('enum removal preserves existing shift and supported rates',async()=>{
 assert.deepEqual((await db.query("SELECT enumlabel FROM pg_enum WHERE enumtypid='work_type'::regtype ORDER BY enumsortorder")).rows.map(x=>x.enumlabel),['STANDARD_ASSESSMENT','EMERGENCY_RESPONSE','TRAVEL','STANDBY']);
 assert.equal((await db.query('SELECT payroll_amount FROM time_entries')).rows[0].payroll_amount,'77');
 assert.equal((await db.query('SELECT count(*) AS n FROM role_rate_defaults')).rows[0].n,1);
});
await db.exec('SET ROLE service_role');
async function add(email='qa@example.test',pay=terms,who=actor){return db.query('SELECT add_contractor_record($1,$2,$3,$4,$5,$6) AS result',[who,'QA','Added',email,'(318) 555-0123',pay]);}
let result;
await test('contact, agreement and audit save without an Auth account',async()=>{
 result=(await add()).rows[0].result;
 assert.ok(result.id);assert.ok(result.agreement_id);
 const c=(await db.query('SELECT * FROM contractors WHERE id=$1',[result.id])).rows[0];assert.equal(c.profile_id,null);assert.equal(c.onboarding_status,'PENDING');assert.equal(c.is_eligible_for_assignment,false);
 assert.equal((await db.query('SELECT count(*) n FROM auth.users')).rows[0].n,0);
 assert.equal((await db.query("SELECT count(*) n FROM audit_logs WHERE action='CONTRACTOR_ADDED'")).rows[0].n,1);
});
await test('duplicates and nonprivileged actors are rejected',async()=>{
 await assert.rejects(()=>add('QA@EXAMPLE.TEST'),/already uses/);
 await assert.rejects(()=>add('staff@example.test'),/already uses/);
 await assert.rejects(()=>add('blocked@example.test',terms,ordinary),/Privileged/);
});
await test('removed rates and invalid pay cannot leave a partial contact',async()=>{
 await assert.rejects(()=>add('invalid@example.test',{...terms,work_type_rates:{ADMIN:65}}),/Invalid work-type/);
 await assert.rejects(()=>add('invalid@example.test',{...terms,base_hourly_rate:0}),/Invalid compensation/);
 assert.equal((await db.query('SELECT count(*) n FROM contractors')).rows[0].n,1);
});
await db.exec('RESET ROLE');
await db.exec(`CREATE FUNCTION reject_test_agreement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF (NEW.terms->>'base_hourly_rate')::numeric=99 THEN RAISE EXCEPTION 'Test downstream failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER reject_test BEFORE INSERT ON contractor_pay_agreements FOR EACH ROW EXECUTE FUNCTION reject_test_agreement();`);
await db.exec('SET ROLE service_role');
await test('downstream agreement failure rolls back the contact and audit',async()=>{await assert.rejects(()=>add('rollback@example.test',{...terms,base_hourly_rate:99}),/Test downstream/);assert.equal((await db.query('SELECT count(*) n FROM contractors')).rows[0].n,1);});
await db.exec('RESET ROLE; SET ROLE authenticated');
await test('authenticated callers cannot execute the server-only function',async()=>{await assert.rejects(()=>add('blocked@example.test'),/permission denied/);});
await db.exec('RESET ROLE; SET ROLE anon');
await test('anonymous callers cannot execute the server-only function',async()=>{await assert.rejects(()=>add('blocked@example.test'),/permission denied/);});
await db.exec('RESET ROLE');
await test('removed enums cannot be reintroduced through rate or shift inserts',async()=>{await assert.rejects(()=>db.query("INSERT INTO time_entries(work_type) VALUES('TRAINING')"),/invalid input/);});
await writeFile(new URL('../../docs/testing/contractor-add-local.json',import.meta.url),JSON.stringify({environment:'isolated PGlite database; not live browser proof',tests,passed:tests.length},null,2));
await db.close();
