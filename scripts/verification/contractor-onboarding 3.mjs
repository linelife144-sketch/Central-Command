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

await db.exec(`
ALTER TABLE auth.users ADD COLUMN raw_app_meta_data jsonb DEFAULT '{}', ADD COLUMN raw_user_meta_data jsonb DEFAULT '{}', ADD COLUMN email_confirmed_at timestamptz, ADD COLUMN encrypted_password text, ADD COLUMN banned_until timestamptz;
ALTER TABLE profiles ADD COLUMN first_name text, ADD COLUMN last_name text, ADD COLUMN phone text, ADD COLUMN is_email_verified boolean DEFAULT false, ADD COLUMN mfa_enabled boolean DEFAULT false, ADD COLUMN mfa_secret_encrypted text;
ALTER TABLE contractors ADD COLUMN onboarding_completed_at timestamptz, ADD COLUMN is_deleted boolean DEFAULT false, ADD COLUMN address_line1 text, ADD COLUMN address_line2 text, ADD COLUMN city text, ADD COLUMN state text, ADD COLUMN zip_code text;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.actor_id',true),'')::uuid $$;
CREATE FUNCTION private.active_profile_role() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT role::text FROM public.profiles WHERE id=auth.uid() AND is_active $$;
CREATE SCHEMA storage;
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- Deliberately overbroad old policies prove the new boundaries compose safely.
CREATE POLICY old_broad_storage ON storage.objects FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE TABLE storm_events(id uuid PRIMARY KEY,is_deleted boolean DEFAULT false);
CREATE TABLE storm_event_roster_revisions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),storm_event_id uuid,revision_number integer,revision_label text,is_locked boolean DEFAULT false,created_by uuid);
CREATE TABLE storm_event_roster_members(roster_revision_id uuid,contractor_id uuid,member_status text,created_by uuid);
CREATE TABLE tickets(id uuid DEFAULT gen_random_uuid(),assigned_to uuid,storm_event_id uuid);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_tickets ON tickets FOR ALL TO authenticated USING(true) WITH CHECK(true);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_profiles ON profiles FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY fixture_contractors ON contractors FOR ALL TO authenticated USING(true) WITH CHECK(true);
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON auth.users TO service_role;
GRANT USAGE ON SCHEMA storage TO authenticated,service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
GRANT SELECT,UPDATE ON profiles,contractors TO authenticated;
GRANT SELECT,INSERT,UPDATE ON tickets,storm_events,storm_event_roster_members,storm_event_roster_revisions TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated,service_role;
`);
// Bring in the real authorization guard, including the CEO/Super Admin ceiling.
const permissions=await readFile(new URL('../../supabase/migrations/20261004010249_individual_admin_permissions_and_contractor_invitations.sql',import.meta.url),'utf8');
await db.exec(permissions.match(/CREATE OR REPLACE FUNCTION private.guard_profile_authorization\(\)[\s\S]*?END \$\$;/)[0]);
await db.exec(`CREATE TRIGGER guard_profile BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION private.guard_profile_authorization();`);
const onboarding=await readFile(new URL('../../supabase/migrations/20261004223538_contractor_account_setup_and_minimal_onboarding.sql',import.meta.url),'utf8');
await db.exec(onboarding);
const hardening=await readFile(new URL('../../supabase/migrations/20261004223756_harden_contractor_roster_trigger_search_path.sql',import.meta.url),'utf8');
await db.exec(hardening);
const removeTagFromGate=await readFile(new URL('../../supabase/migrations/20261004234500_remove_vehicle_registration_from_onboarding_gate.sql',import.meta.url),'utf8');
await db.exec(removeTagFromGate);
await db.exec(`CREATE TRIGGER provision_contractor_auth_profile AFTER INSERT OR UPDATE OF email,email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION private.provision_auth_profile();
CREATE TRIGGER ticket_guard BEFORE INSERT OR UPDATE OF assigned_to,storm_event_id ON tickets FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_roster_assignment();`);
const tests=[];
async function test(name,fn){try { await fn(); } catch(error) { console.error('FAIL '+name+': '+error.message); process.exit(1); } tests.push(name);console.log('PASS '+name);}
const ceo='77777777-7777-4777-8777-777777777777';
await db.query("INSERT INTO profiles(id,email,role,is_active) VALUES($1,'ceo@example.test','CEO',true)",[ceo]);
const uid='33333333-3333-4333-8333-333333333333', other='44444444-4444-4444-8444-444444444444', storm='55555555-5555-4555-8555-555555555555';
const terms={role:'DRIVER',base_hourly_rate:65,work_type_rates:{},policy:{mode:'FLAT',multiplier:1},driver_eligible:true,vehicle_allowance_enabled:true,vehicle_hourly_rate:5,week_start_day:1,timezone:'America/Chicago'};
await db.exec('SET ROLE service_role');
const add=async(email)=> (await db.query('SELECT add_contractor_record($1,$2,$3,$4,$5,$6) result',[actor,'QA','Added',email,'',terms])).rows[0].result;
let c;
await test('adding a contractor is DB-only and privileged',async()=>{
 c=await add('qa@example.test');
 assert.equal((await db.query('SELECT count(*) n FROM auth.users')).rows[0].n,0);
 await assert.rejects(()=>db.query('SELECT add_contractor_record($1,$2,$3,$4,$5,$6)',[ordinary,'No','Access','no@example.test','',terms]),/Privileged/);
});
const claim=async(email)=> (await db.query('SELECT claim_contractor_account_setup($1) result',[email])).rows[0].result;
await test('unknown email gives no claim; added email claims once with cooldown',async()=>{
 assert.equal(await claim('unknown@example.test'),null);
 assert.equal((await claim('QA@EXAMPLE.TEST')).id,c.id);
 assert.equal(await claim('qa@example.test'),null);
});
await db.exec('RESET ROLE');
await test('direct signup and mismatched account metadata cannot provision a profile',async()=>{
 await assert.rejects(()=>db.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,'arbitrary@example.test',$2)",[other,{role:'CONTRACTOR',contractor_record_id:c.id}]),/Internally added/);
 await assert.rejects(()=>db.query("INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,'wrong@example.test',$2)",[other,{role:'CONTRACTOR',contractor_record_id:c.id}]),/Valid contractor/);
 assert.equal((await db.query('SELECT count(*) n FROM profiles WHERE id=$1',[other])).rows[0].n,0);
});
await test('expired setup claims cannot create an Auth account',async()=>{
 await db.query("UPDATE contractors SET account_setup_requested_at=now()-interval '11 minutes' WHERE id=$1",[c.id]);
 await assert.rejects(()=>db.query("INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,'qa@example.test',$2)",[uid,{role:'CONTRACTOR',contractor_record_id:c.id}]),/Valid contractor/);
 await db.query('UPDATE contractors SET account_setup_requested_at=now() WHERE id=$1',[c.id]);
});
await test('Auth provisioning preserves accountless contractor until mailbox verification',async()=>{
 await db.query("INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,'qa@example.test',$2)",[uid,{role:'CONTRACTOR',contractor_record_id:c.id}]);
 assert.equal((await db.query('SELECT profile_id FROM contractors WHERE id=$1',[c.id])).rows[0].profile_id,null);
 assert.equal((await db.query('SELECT must_reset_password FROM profiles WHERE id=$1',[uid])).rows[0].must_reset_password,true);
});
await db.exec('SET ROLE service_role');
await test('unverified or passwordless account cannot finish password setup',async()=>{
 await assert.rejects(()=>db.query('SELECT complete_account_password_setup($1)',[uid]),/Verified active/);
});
await db.exec('RESET ROLE');
await test('verified Auth binds exactly the pre-added record and keeps password gate',async()=>{
 await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[uid]);
 assert.equal((await db.query('SELECT profile_id FROM contractors WHERE id=$1',[c.id])).rows[0].profile_id,uid);
 await assert.rejects(()=>db.query("UPDATE auth.users SET email='other@example.test' WHERE id=$1",[uid]),/does not match/);
 await assert.rejects(()=>db.query("INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,'qa@example.test',$2)",[other,{role:'CONTRACTOR',contractor_record_id:c.id}]),/Valid contractor/);
});
await test('repeated verification cannot duplicate or rebind the account',async()=>{
 await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[uid]);
 assert.equal((await db.query("SELECT count(*) n FROM audit_logs WHERE action='CONTRACTOR_ACCOUNT_VERIFIED'")).rows[0].n,1);
 assert.equal((await db.query('SELECT count(*) n FROM contractors WHERE profile_id=$1',[uid])).rows[0].n,1);
});
await db.exec('SET ROLE service_role');
await test('password required before clearing gate; established account cannot repeat setup',async()=>{
 await assert.rejects(()=>db.query('SELECT complete_account_password_setup($1)',[uid]),/Verified active/);
 await db.query("UPDATE auth.users SET encrypted_password='hashed-by-auth' WHERE id=$1",[uid]);
 await db.query('SELECT complete_account_password_setup($1)',[uid]);
 assert.equal(await claim('qa@example.test'),null);
});
await db.exec('RESET ROLE');
await db.query("SELECT set_config('test.actor_id',$1,false)",[uid]);
await db.exec('SET ROLE authenticated');
await test('incomplete onboarding blocks operational RLS and direct completion bypass',async()=>{
 assert.equal((await db.query('SELECT private.contractor_portal_ready() ready')).rows[0].ready,false);
 await assert.rejects(()=>db.query('UPDATE contractors SET onboarding_completed_at=now() WHERE id=$1',[c.id]),/server managed/);
 await assert.rejects(()=>db.query('SELECT complete_contractor_onboarding($1,$2)',[uid,{}]),/permission denied/);
});
const photo=c.id+'/66666666-6666-4666-8666-666666666666.jpg';
await test('owned tag uploads succeed, cross-contractor paths and replacement are denied',async()=>{
 await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('contractor-registration-tags',$1)",[photo]);
 await assert.rejects(()=>db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('contractor-registration-tags',$1)",[other+'/66666666-6666-4666-8666-666666666666.jpg']),/row-level/);
 assert.equal((await db.query("UPDATE storage.objects SET name='replaced' WHERE name=$1 RETURNING name",[photo])).rows.length,0);
 assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,1);
});
await db.exec('RESET ROLE; SET ROLE service_role');
const details={first_name:'Updated',last_name:'Contractor',address_line1:'123 Main Street',address_line2:'Unit 4',city:'Shreveport',state:'LA',zip_code:'71101'};
await test('driver can complete without tag photo; malformed address and cross-contractor photo rejected',async()=>{
 await assert.rejects(()=>db.query('SELECT complete_contractor_onboarding($1,$2)',[uid,{...details,city:''}]),/full starting/);
 await assert.rejects(()=>db.query('SELECT complete_contractor_onboarding($1,$2)',[uid,{...details,vehicle_registration_photo_path:other+'/file.jpg'}]),/own vehicle/);
});
await test('name/address and completion persist atomically without requiring photo',async()=>{
 await db.query('SELECT complete_contractor_onboarding($1,$2)',[uid,details]);
 const saved=(await db.query('SELECT * FROM contractors WHERE id=$1',[c.id])).rows[0];
 for(const key of Object.keys(details))assert.equal(saved[key],details[key]);
 assert.equal(saved.vehicle_registration_photo_path,null);assert.ok(saved.onboarding_completed_at);
 assert.equal((await db.query('SELECT first_name FROM profiles WHERE id=$1',[uid])).rows[0].first_name,'Updated');
 await assert.rejects(()=>db.query('SELECT complete_contractor_onboarding($1,$2)',[uid,details]),/already completed/);
});
await db.exec('RESET ROLE');
await test('non-driver skips photo, and a verified account link cannot be stolen',async()=>{
 await db.exec('SET ROLE service_role');
 const nc=await add('nondriver@example.test');await claim('nondriver@example.test');
 await db.query('UPDATE contractor_pay_agreements SET terms=terms || $1::jsonb WHERE contractor_id=$2',[{driver_eligible:false},nc.id]);
 await db.exec('RESET ROLE');
 await db.query("INSERT INTO auth.users(id,email,raw_app_meta_data,email_confirmed_at,encrypted_password) VALUES($1,'nondriver@example.test',$2,now(),'hash')",[other,{role:'CONTRACTOR',contractor_record_id:nc.id}]);
 await db.exec('SET ROLE service_role');await db.query('SELECT complete_account_password_setup($1)',[other]);await db.query('SELECT complete_contractor_onboarding($1,$2)',[other,details]);
 assert.equal((await db.query('SELECT vehicle_registration_photo_path FROM contractors WHERE id=$1',[nc.id])).rows[0].vehicle_registration_photo_path,null);
 await db.exec('RESET ROLE');
});
await test('owner and CEO/Super Admin can read photo; ordinary Admin and another contractor cannot',async()=>{
 for(const [who,n] of [[uid,1],[other,0],[ordinary,0],[actor,1],[ceo,1]]){
  await db.query("SELECT set_config('test.actor_id',$1,false)",[who]);await db.exec('SET ROLE authenticated');
  assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='contractor-registration-tags'")).rows.length,n);
  await db.exec('RESET ROLE');
 }
});
await test('active-only assignment ignores legacy approval and eligibility',async()=>{
 await db.query("SELECT set_config('test.actor_id',$1,false)",[actor]);await db.query('INSERT INTO storm_events(id) VALUES($1)',[storm]);await db.exec('SET ROLE authenticated');
 await db.query('SELECT assign_contractor_to_storm($1,$2)',[storm,c.id]);
 assert.equal((await db.query('SELECT list_assignable_storm_contractors($1) result',[storm])).rows[0].result.length,1);
 await db.query('INSERT INTO tickets(assigned_to,storm_event_id) VALUES($1,$2)',[c.id,storm]);
 await db.exec('RESET ROLE');
});
await test('only CEO/Super Admin can deactivate; inactive blocks Auth and every storm picker',async()=>{
 await db.query("SELECT set_config('test.actor_id',$1,false)",[ordinary]);await db.exec('SET ROLE authenticated');
 await assert.rejects(()=>db.query('UPDATE profiles SET is_active=false WHERE id=$1',[uid]),/Authorization|administration/);await db.exec('RESET ROLE');
 await db.query("SELECT set_config('test.actor_id',$1,false)",[actor]);await db.exec('SET ROLE authenticated');await db.query('UPDATE profiles SET is_active=false WHERE id=$1',[uid]);
 assert.equal((await db.query('SELECT list_assignable_storm_contractors($1) result',[storm])).rows[0].result.length,0);
 assert.equal((await db.query('SELECT list_storm_contractors($1) result',[storm])).rows[0].result.length,0);
 await assert.rejects(()=>db.query('SELECT assign_contractor_to_storm($1,$2)',[storm,c.id]),/active contractor/);
 await assert.rejects(()=>db.query('INSERT INTO tickets(assigned_to,storm_event_id) VALUES($1,$2)',[c.id,storm]),/active contractor/);
 await assert.rejects(()=>db.query("INSERT INTO storm_event_roster_members(roster_revision_id,contractor_id,member_status) VALUES(gen_random_uuid(),$1,'CONFIRMED')",[c.id]),/active contractor/);
 await db.exec('RESET ROLE');assert.ok((await db.query('SELECT banned_until FROM auth.users WHERE id=$1',[uid])).rows[0].banned_until);
 await db.query("SELECT set_config('test.actor_id',$1,false)",[uid]);assert.equal((await db.query('SELECT private.contractor_portal_ready() ready')).rows[0].ready,false);
});
await test('reactivation restores account and roster without modifying historical records',async()=>{
 await db.query("SELECT set_config('test.actor_id',$1,false)",[actor]);await db.exec('SET ROLE authenticated');await db.query('UPDATE profiles SET is_active=true WHERE id=$1',[uid]);
 assert.equal((await db.query('SELECT list_assignable_storm_contractors($1) result',[storm])).rows[0].result.length,1);
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT banned_until FROM auth.users WHERE id=$1',[uid])).rows[0].banned_until,null);
 await db.query("SELECT set_config('test.actor_id',$1,false)",[uid]);assert.equal((await db.query('SELECT private.contractor_portal_ready() ready')).rows[0].ready,true);
 assert.equal((await db.query('SELECT onboarding_status,is_eligible_for_assignment FROM contractors WHERE id=$1',[c.id])).rows[0].onboarding_status,'PENDING');
});
await db.query("SELECT set_config('test.actor_id','',false)");
await test('server-only RPCs work without granting service_role direct Auth table access',async()=>{
 await db.exec('REVOKE ALL ON auth.users FROM service_role; SET ROLE service_role');
 assert.equal(await claim('unknown@example.test'),null);
 await db.query('SELECT complete_account_password_setup($1)',[uid]);
 await assert.rejects(()=>db.query('SELECT complete_contractor_onboarding($1,$2)',[uid,details]),/already completed/);
 await assert.rejects(()=>db.query('SELECT * FROM auth.users'),/permission denied/);
 await db.exec('RESET ROLE');
});
await db.exec('SET ROLE anon');
await test('anonymous cannot read registration tags',async()=>{await db.exec('RESET ROLE');await db.exec("GRANT USAGE ON SCHEMA storage TO anon; GRANT SELECT ON storage.objects TO anon; CREATE POLICY fixture_anon ON storage.objects FOR SELECT TO anon USING(true);");await db.exec('SET ROLE anon');assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='contractor-registration-tags'")).rows.length,0);});
await test('anonymous cannot claim or complete account setup RPCs',async()=>{await assert.rejects(()=>claim('qa@example.test'),/permission denied/);await assert.rejects(()=>db.query('SELECT complete_account_password_setup($1)',[uid]),/permission denied/);});
await db.exec('RESET ROLE');
await writeFile(new URL('../../docs/testing/contractor-onboarding-local.json',import.meta.url),JSON.stringify({verifiedAt:new Date().toISOString(),environment:'isolated PGlite, not live Auth/mail/browser proof',tests,passed:tests.length},null,2)+'\n');
await db.close();
