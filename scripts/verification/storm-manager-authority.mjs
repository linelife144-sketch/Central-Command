import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const runtime = process.env.CC_PGLITE_PATH || '/Users/davidmccarty/.codex/.chatgpt-projects/g-p-698e4e3dea2c819193d268ef77b9572e/workspace/e2e-20261001/policy-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(runtime).href);
const db = new PGlite();
const baseline = JSON.parse(await readFile(new URL('../../supabase/workflow-role-baseline-20261009.json', import.meta.url), 'utf8'));
const ids = Object.fromEntries(['ceo','legacy','manager','manager2','reviewer','contractor','inactive','setup','storm','unconfiguredStorm'].map(key => [key,randomUUID()]));
let checks = 0;
async function scalar(sql, params = []) { return (await db.query(sql, params)).rows[0].value; }
async function check(name, action) { await action(); checks++; console.log(`PASS ${name}`); }
async function denied(sql, params = [], match = /permission|protected|manager|required|reassign|changed/i) {
  await assert.rejects(db.query(sql, params), match);
}
async function asActor(key) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('test.actor_id',$1,false)",[key ? ids[key] : '']);
  await db.exec('SET ROLE authenticated');
}
await db.exec(`
 CREATE SCHEMA private; CREATE SCHEMA auth;
 CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.actor_id',true),'')::uuid $$;
 CREATE TYPE public.user_role AS ENUM ('CEO','SUPER_ADMIN','ADMIN','CONTRACTOR');
 CREATE TYPE public.contractor_role AS ENUM ('STORM_MANAGER','TEAM_LEAD','SR_DAMAGE_ASSESSER','DAMAGE_ASSESSER','DRIVER');
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,role user_role NOT NULL,email text,first_name text,last_name text,phone text,is_active boolean DEFAULT true,must_reset_password boolean DEFAULT false,is_email_verified boolean DEFAULT true,mfa_enabled boolean DEFAULT false,mfa_secret_encrypted text);
 CREATE TABLE private.permission_catalog(permission_key text PRIMARY KEY,admin_default boolean DEFAULT false,privileged boolean DEFAULT false);
 CREATE TABLE public.user_permissions(profile_id uuid,permission_key text,effect text,updated_by uuid);
 CREATE TABLE public.user_permission_versions(profile_id uuid PRIMARY KEY,version uuid DEFAULT gen_random_uuid());
 CREATE TABLE public.audit_logs(action text,entity_type text,entity_id uuid,user_id uuid,user_role user_role,old_values jsonb,new_values jsonb,change_summary text);
 CREATE TABLE public.storm_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_code text UNIQUE,name text NOT NULL,utility_client text NOT NULL,status text DEFAULT 'MOB',is_deleted boolean DEFAULT false,region text,contract_reference text,start_date date,end_date date,notes text,created_by uuid,updated_by uuid);
 CREATE TABLE public.contractors(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid,role contractor_role,business_name text,business_email text,business_phone text,first_name text,last_name text,is_deleted boolean DEFAULT false,onboarding_status text,is_eligible_for_assignment boolean,eligibility_reason text,created_by uuid,account_setup_requested_at timestamptz);
 CREATE TABLE public.contractor_pay_agreements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contractor_id uuid,effective_from timestamptz,terms jsonb,created_by uuid,created_at timestamptz);
 CREATE TABLE public.time_entries(id uuid PRIMARY KEY,contractor_id uuid,clock_out_at timestamptz);
 CREATE TABLE public.storm_role_pay_rates(storm_event_id uuid,role contractor_role,hourly_rate numeric,updated_by uuid);
 CREATE TABLE public.utility_billing_rates(storm_event_id uuid,role contractor_role,work_type text,hourly_rate numeric,currency text,updated_by uuid);
 CREATE TABLE private.contractor_account_setup_claims(contractor_id uuid,claim_token uuid,consumed_at timestamptz,expires_at timestamptz);
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION private.validate_compensation(jsonb) RETURNS void LANGUAGE sql AS $$ SELECT $$;
 CREATE FUNCTION private.validate_storm_role_rates(jsonb) RETURNS void LANGUAGE sql AS $$ SELECT $$;
 CREATE FUNCTION private.pay_week_start(timestamptz,jsonb) RETURNS timestamptz LANGUAGE sql AS $$ SELECT $1 $$;
 GRANT USAGE ON SCHEMA public,private,auth TO authenticated,service_role;
 GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles TO authenticated;
 GRANT SELECT,INSERT,UPDATE ON public.storm_events TO authenticated;
 GRANT SELECT,INSERT ON public.audit_logs TO authenticated;
 GRANT SELECT,INSERT,UPDATE ON public.storm_role_pay_rates,public.utility_billing_rates TO authenticated;
 GRANT SELECT ON public.user_permissions,public.user_permission_versions,private.permission_catalog TO authenticated;
 GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`);
const names = ['active_profile_role','has_permission','is_admin','is_super_admin','current_user_role','get_my_permissions','guard_profile_authorization','guard_profile_deletion','set_user_permissions','guard_pay_agreement','provision_auth_profile','guard_internal_account_creation','user_permission_settings','add_contractor_record'];
for (const name of names) {
 const definition = baseline.functions.find(fn => fn.name === name)?.definition;
 if (definition) await db.exec(definition);
}
await db.exec(`
 ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING(private.has_permission(auth.uid(),'admin.users.view') OR id=auth.uid());
 CREATE POLICY profile_write ON public.profiles FOR UPDATE TO authenticated USING(private.has_permission(auth.uid(),'admin.users.edit') OR id=auth.uid()) WITH CHECK(private.has_permission(auth.uid(),'admin.users.edit') OR id=auth.uid());
 ALTER TABLE public.storm_events ENABLE ROW LEVEL SECURITY;
 CREATE POLICY storm_read ON public.storm_events FOR SELECT TO authenticated USING(private.has_permission(auth.uid(),'admin.storms.view'));
 CREATE POLICY storm_insert ON public.storm_events FOR INSERT TO authenticated WITH CHECK(private.has_permission(auth.uid(),'admin.storms.edit'));
 CREATE POLICY storm_update ON public.storm_events FOR UPDATE TO authenticated USING(private.has_permission(auth.uid(),'admin.storms.edit')) WITH CHECK(private.has_permission(auth.uid(),'admin.storms.edit'));
 CREATE TRIGGER auth_guard BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.guard_profile_authorization();
 CREATE TRIGGER deletion_guard BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.guard_profile_deletion();
`);
for (const key of ['dashboard.view','storms.view','storms.edit','tickets.view','tickets.edit','contractors.view','contractors.edit','assignments.view','assignments.edit','map.view','time.view','time.edit','expenses.view','expenses.edit','assessments.view','assessments.edit','payroll.view','payroll.edit','reports.view','users.view','users.edit']) {
 await db.query('INSERT INTO private.permission_catalog(permission_key,privileged) VALUES($1,$2)',[`admin.${key}`,key.startsWith('users.')]);
}
// Existing fixtures are created before the new ownership requirement is active.
await db.query("INSERT INTO public.profiles(id,role,first_name,last_name) VALUES($1,'CEO','Chief','Owner'),($2,'SUPER_ADMIN','Legacy','Manager'),($3,'ADMIN','Staff','Reviewer'),($4,'CONTRACTOR','Pay','Manager')",[ids.ceo,ids.legacy,ids.reviewer,ids.contractor]);
await db.query("INSERT INTO public.contractors(profile_id,role) VALUES($1,'STORM_MANAGER')",[ids.contractor]);
await db.query("INSERT INTO public.storm_events(id,event_code,name,utility_client) VALUES($1,'OLD','Existing test storm','ENTERGY')",[ids.storm]);
await db.query("INSERT INTO public.storm_events(id,event_code,name,utility_client) VALUES($1,'NULL','Unconfigured test storm','ENTERGY')",[ids.unconfiguredStorm]);
await db.exec(await readFile(new URL('../../supabase/migrations/20261009182625_add_storm_manager_application_role.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261009182630_storm_manager_authority_and_responsibility.sql',import.meta.url),'utf8'));
const existingGuardsQuery = `SELECT p.proname AS name,pg_get_functiondef(p.oid) AS definition,p.proacl::text AS acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname IN ('guard_profile_authorization','guard_storm_manager','guard_storm_manager_profile','guard_storm_manager_permissions') ORDER BY p.proname`;
const existingGuards = (await db.query(existingGuardsQuery)).rows;
const existingTriggerQuery = `SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgname='guard_storm_manager' AND tgrelid='public.storm_events'::regclass`;
const existingTrigger = (await db.query(existingTriggerQuery)).rows;
await db.exec(await readFile(new URL('../../supabase/migrations/20261009191431_storm_manager_lifecycle_guards.sql',import.meta.url),'utf8'));
await check('lifecycle migration preserves all existing authority guard definitions, grants and assignment trigger',async()=>{
 assert.deepEqual((await db.query(existingGuardsQuery)).rows,existingGuards);
 assert.deepEqual((await db.query(existingTriggerQuery)).rows,existingTrigger);
 for(const name of ['guard_last_storm_manager_setup','guard_storm_manager_reactivation']) {
  for(const role of ['anon','authenticated']) assert.equal(await scalar(`SELECT has_function_privilege($1,$2,'EXECUTE') AS value`,[role,`private.${name}()`]),false);
 }
});
await db.query("INSERT INTO public.profiles(id,role,first_name,last_name) VALUES($1,'STORM_MANAGER','Native','Manager'),($2,'STORM_MANAGER','Second','Manager'),($3,'STORM_MANAGER','Inactive','Manager'),($4,'STORM_MANAGER','Setup','Manager')",[ids.manager,ids.manager2,ids.inactive,ids.setup]);
await db.query('UPDATE public.profiles SET is_active=false WHERE id=$1',[ids.inactive]);
await db.query('UPDATE public.profiles SET must_reset_password=true WHERE id=$1',[ids.setup]);

await check('native/legacy/CEO retain all management defaults through existing helpers',async()=>{
 for(const actor of ['manager','legacy','ceo']) { await asActor(actor); const result=await scalar('SELECT public.get_my_permissions() AS value');assert.ok(Object.values(result).every(Boolean));assert.equal(await scalar('SELECT public.is_super_admin() AS value'),true); }
});
await check('contractor Storm Manager pay role and standard reviewer have no management authority',async()=>{
 for(const actor of ['contractor','reviewer','inactive','setup']) { await asActor(actor);assert.equal(await scalar("SELECT private.has_permission(auth.uid(),'admin.users.edit') AS value"),false);await denied('SELECT public.set_storm_manager($1,$2,NULL)',[ids.storm,ids.manager]); }
});
await check('options expose eligible verified management profiles only',async()=>{
 await asActor('manager');const options=await scalar('SELECT public.list_storm_manager_options() AS value');assert.deepEqual(new Set(options.map(row=>row.id)),new Set([ids.manager,ids.manager2,ids.legacy]));
});
await check('new storms require an eligible explicit manager',async()=>{
 await asActor('manager');await denied("INSERT INTO public.storm_events(event_code,name,utility_client) VALUES('MISSING','Missing','ENTERGY')");
 for(const target of ['contractor','reviewer','inactive','setup','ceo']) await denied("INSERT INTO public.storm_events(event_code,name,utility_client,responsible_manager_id) VALUES($1,'Invalid','ENTERGY',$2)",[target,ids[target]]);
});
await check('new storm/rate card/manager are saved atomically with native audit identity',async()=>{
 await asActor('manager');const storm=await scalar("SELECT public.create_storm_event_with_rates($1::jsonb,$2::jsonb) AS value",[JSON.stringify({event_code:'NEW',name:'New storm',utility_client:'ENTERGY',responsible_manager_id:ids.manager2}),JSON.stringify([{role:'DRIVER',pay_rate:25,bill_rate:75}])]);
 assert.equal(storm.responsible_manager_id,ids.manager2);assert.equal(await scalar("SELECT user_role::text AS value FROM public.audit_logs WHERE entity_id=$1 AND action='STORM_MANAGER_ASSIGNED'",[storm.id]),'STORM_MANAGER');
 assert.equal(await scalar('SELECT count(*)::int AS value FROM public.storm_role_pay_rates WHERE storm_event_id=$1',[storm.id]),1);
});
await check('reassignment uses compare-before-update and records both identities',async()=>{
 await asActor('manager');assert.equal((await scalar('SELECT public.set_storm_manager($1,$2,NULL) AS value',[ids.storm,ids.manager])).responsible_manager_id,ids.manager);
 await denied('SELECT public.set_storm_manager($1,$2,NULL)',[ids.storm,ids.manager2]);
 assert.equal((await scalar('SELECT public.set_storm_manager($1,$2,$3) AS value',[ids.storm,ids.manager2,ids.manager])).responsible_manager_id,ids.manager2);
 const audit=(await db.query("SELECT old_values,new_values FROM public.audit_logs WHERE entity_id=$1 AND old_values->>'responsible_manager_id'=$2",[ids.storm,ids.manager])).rows[0];assert.equal(audit.new_values.responsible_manager_id,ids.manager2);
});
await check('assigned active managers cannot be deactivated, demoted or put back into setup',async()=>{
 await asActor('ceo');for(const change of ["is_active=false","role='CONTRACTOR'","must_reset_password=true"]) await denied(`UPDATE public.profiles SET ${change} WHERE id=$1`,[ids.manager2]);
 await db.exec('RESET ROLE');await denied("INSERT INTO public.user_permissions(profile_id,permission_key,effect) VALUES($1,'admin.storms.edit','deny')",[ids.manager2]);
});
await check('self authorization and CEO protections survive native role support',async()=>{
 await asActor('manager');await denied('UPDATE public.profiles SET is_active=false WHERE id=$1',[ids.manager]);await denied("UPDATE public.profiles SET role='CONTRACTOR' WHERE id=$1",[ids.ceo]);
});
await check('permission restrictions apply to manager assignment and selection',async()=>{
 await db.exec('RESET ROLE');await db.query("INSERT INTO public.user_permissions(profile_id,permission_key,effect) VALUES($1,'admin.storms.view','deny')",[ids.manager]);await asActor('manager');await denied('SELECT public.list_storm_manager_options()');await denied('SELECT public.set_storm_manager($1,$2,$3)',[ids.storm,ids.legacy,ids.manager2]);
});
await check('anonymous entry points and direct private mutations stay revoked',async()=>{
 await db.exec('RESET ROLE');for(const signature of ['public.set_storm_manager(uuid,uuid,uuid)','public.list_storm_manager_options(uuid)','private.guard_storm_manager()','private.guard_storm_manager_profile()']) assert.equal(await scalar('SELECT has_function_privilege(\'anon\',$1,\'EXECUTE\') AS value',[signature]),false);
 assert.equal(await scalar("SELECT count(*)::int AS value FROM pg_indexes WHERE indexname='storm_events_responsible_manager_idx'"),1);
});
await check('trusted Auth metadata provisions native roles; untrusted pay-role metadata cannot',async()=>{
 await db.exec('RESET ROLE');await db.exec('CREATE TRIGGER auth_account_guard BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.guard_internal_account_creation(); CREATE TRIGGER auth_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.provision_auth_profile();');
 const nativeId=randomUUID();await db.query("INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,'new-manager@example.test','{\"role\":\"STORM_MANAGER\"}')",[nativeId]);
 assert.equal(await scalar('SELECT role::text AS value FROM public.profiles WHERE id=$1',[nativeId]),'STORM_MANAGER');
 await denied("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,'untrusted@example.test','{\"role\":\"STORM_MANAGER\"}')",[randomUUID()]);
 await db.query('UPDATE public.profiles SET is_active=false WHERE id=$1',[nativeId]);
});
await check('legacy and native managers share the last-active-manager protection',async()=>{
 await asActor('ceo');await db.exec("UPDATE public.storm_events SET status='CLOSED'");
 for(const target of ['manager','manager2']) await db.query('UPDATE public.profiles SET is_active=false WHERE id=$1',[ids[target]]);
 await denied('UPDATE public.profiles SET is_active=false WHERE id=$1',[ids.legacy],/Keep one active Storm Manager/);
});
await check('closed storm manager history is guarded even on a direct update',async()=>{
 await asActor('ceo');await denied('UPDATE public.storm_events SET responsible_manager_id=$1 WHERE id=$2',[ids.legacy,ids.storm],/Closed storm manager history/);
});
await check('reopening a configured storm revalidates inactive, demoted, setup and restricted managers',async()=>{
 for(const change of ["is_active=false","role='CONTRACTOR'","must_reset_password=true","is_active=true"]) {
  await db.exec('RESET ROLE');await db.query("UPDATE public.profiles SET role='STORM_MANAGER',is_active=true,must_reset_password=false WHERE id=$1",[ids.manager2]);
  await db.query(`UPDATE public.profiles SET ${change} WHERE id=$1`,[ids.manager2]);
  if(change==='is_active=true') await db.query("INSERT INTO public.user_permissions(profile_id,permission_key,effect) VALUES($1,'admin.storms.edit','deny')",[ids.manager2]);
  await asActor('ceo');await denied("UPDATE public.storm_events SET status='ACTIVE' WHERE id=$1",[ids.storm],/active, setup-complete Storm Manager/);
  assert.equal(await scalar('SELECT status AS value FROM public.storm_events WHERE id=$1',[ids.storm]),'CLOSED');
  await db.exec('RESET ROLE');await db.query("DELETE FROM public.user_permissions WHERE profile_id=$1 AND permission_key='admin.storms.edit'",[ids.manager2]);
 }
});
await check('restoration revalidates manager access without changing historical assignment',async()=>{
 await db.exec('RESET ROLE');await db.query("UPDATE public.profiles SET role='STORM_MANAGER',is_active=true,must_reset_password=false WHERE id=$1",[ids.manager2]);
 await asActor('ceo');const restoredId=await scalar("INSERT INTO public.storm_events(event_code,name,utility_client,responsible_manager_id) VALUES('RESTORE','Restore test','ENTERGY',$1) RETURNING id AS value",[ids.manager2]);
 await db.query('UPDATE public.storm_events SET is_deleted=true WHERE id=$1',[restoredId]);
 await db.query('UPDATE public.profiles SET is_active=false WHERE id=$1',[ids.manager2]);
 await denied('UPDATE public.storm_events SET is_deleted=false WHERE id=$1',[restoredId],/active, setup-complete Storm Manager/);
 await db.exec('RESET ROLE');await db.query('UPDATE public.profiles SET is_active=true WHERE id=$1',[ids.manager2]);
 await asActor('ceo');const audits=await scalar("SELECT count(*)::int AS value FROM public.audit_logs WHERE action='STORM_MANAGER_ASSIGNED'");
 await db.query('UPDATE public.storm_events SET is_deleted=false WHERE id=$1',[restoredId]);
 await db.query("UPDATE public.storm_events SET status='ACTIVE' WHERE id=$1",[ids.storm]);
 assert.equal(await scalar('SELECT responsible_manager_id AS value FROM public.storm_events WHERE id=$1',[ids.storm]),ids.manager2);
 assert.equal(await scalar("SELECT count(*)::int AS value FROM public.audit_logs WHERE action='STORM_MANAGER_ASSIGNED'"),audits);
 await db.exec("UPDATE public.storm_events SET status='CLOSED'");
});
await check('unchanged legacy null responsibility and closed history remain compatible',async()=>{
 await asActor('ceo');await db.query("UPDATE public.storm_events SET status='ACTIVE',notes='Compatibility' WHERE id=$1",[ids.unconfiguredStorm]);
 assert.equal(await scalar('SELECT responsible_manager_id AS value FROM public.storm_events WHERE id=$1',[ids.unconfiguredStorm]),null);
 await db.query("UPDATE public.storm_events SET notes='Historical note' WHERE id=$1",[ids.storm]);
 await db.query("UPDATE public.storm_events SET status='CLOSED' WHERE id=$1",[ids.unconfiguredStorm]);
});
await check('password setup cannot disable the last usable native or legacy manager',async()=>{
 for(const target of ['legacy','manager']) {
  await db.exec('RESET ROLE');await db.exec("UPDATE public.profiles SET is_active=false WHERE role::text IN ('STORM_MANAGER','SUPER_ADMIN')");
  await db.query('UPDATE public.profiles SET is_active=true,must_reset_password=false WHERE id=$1',[ids[target]]);
  await asActor('ceo');await denied('UPDATE public.profiles SET must_reset_password=true WHERE id=$1',[ids[target]],/Keep one active Storm Manager/);
  assert.equal(await scalar('SELECT must_reset_password AS value FROM public.profiles WHERE id=$1',[ids[target]]),false);
 }
});
await db.close();
console.log(JSON.stringify({checks,environment:'isolated PGlite',liveRowsMutated:false}));
