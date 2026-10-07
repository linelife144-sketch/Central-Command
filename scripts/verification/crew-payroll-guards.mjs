import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
// Focused composed-current-function fixture. Storage rows and JWT contexts are simulated.
// It does not install or execute against live Supabase.
const runtime = process.env.CC_PGLITE_PATH || '/Users/davidmccarty/.codex/.chatgpt-projects/g-p-698e4e3dea2c819193d268ef77b9572e/workspace/e2e-20261001/policy-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(runtime).href);
const db = new PGlite();
const legacyId = randomUUID();
const sa = randomUUID(), admin = randomUUID(), ceo = randomUUID();
let storm = randomUUID();
await db.exec(`CREATE SCHEMA private; CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.actor_id',true),'')::uuid $$;
CREATE TYPE contractor_role AS ENUM('STORM_MANAGER','TEAM_LEAD','SR_DAMAGE_ASSESSER','DAMAGE_ASSESSER','DRIVER');
CREATE TYPE user_role AS ENUM('CEO','SUPER_ADMIN','ADMIN','CONTRACTOR');
CREATE TABLE profiles(id uuid PRIMARY KEY,role user_role,is_email_verified boolean DEFAULT true,is_active boolean DEFAULT true,must_reset_password boolean DEFAULT false);
CREATE FUNCTION private.active_profile_role() RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT role::text FROM public.profiles WHERE id=auth.uid() AND is_active AND NOT must_reset_password $$;
CREATE TABLE private.permission_catalog(permission_key text PRIMARY KEY,admin_default boolean,privileged boolean);
CREATE TABLE user_permissions(profile_id uuid,permission_key text,effect text);
CREATE TABLE user_permission_versions(profile_id uuid);
INSERT INTO private.permission_catalog VALUES('admin.contractors.view',true,false),('admin.payroll.view',true,false),('admin.payroll.edit',false,false),('admin.time.view',true,false),('admin.time.edit',true,false),('admin.users.edit',false,true);
CREATE FUNCTION private.has_permission(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT private.active_profile_role() IN ('CEO','SUPER_ADMIN') $$;
CREATE TABLE contractors(id uuid PRIMARY KEY,profile_id uuid REFERENCES profiles(id),role contractor_role,is_deleted boolean DEFAULT false,is_eligible_for_assignment boolean DEFAULT true,onboarding_status text DEFAULT 'APPROVED',onboarding_completed_at timestamptz DEFAULT now());
CREATE TABLE contractor_rates(contractor_id uuid,work_type text,hourly_rate numeric,effective_from date,effective_to date);
CREATE TABLE role_rate_defaults(role contractor_role,work_type text,hourly_rate numeric);
CREATE TABLE utility_billing_rates(id uuid DEFAULT gen_random_uuid(),storm_event_id uuid,work_type text,hourly_rate numeric);
CREATE TABLE tickets(id uuid PRIMARY KEY,assigned_to uuid,assigned_driver_id uuid,team_lead_id uuid,storm_event_id uuid,is_deleted boolean DEFAULT false,status text DEFAULT 'ASSIGNED',updated_at timestamptz,updated_by uuid,address text);
CREATE TABLE ticket_status_history(ticket_id uuid,changed_by uuid);
CREATE TABLE audit_logs(action text,entity_type text,entity_id uuid,user_id uuid,user_role user_role,old_values jsonb,new_values jsonb,change_summary text);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
CREATE TABLE time_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contractor_id uuid,ticket_id uuid,storm_event_id uuid,
clock_in_at timestamptz,clock_out_at timestamptz,clock_in_latitude numeric,clock_in_longitude numeric,clock_in_accuracy numeric,clock_in_photo_url text,clock_in_ip inet,clock_in_user_agent text,
clock_out_latitude numeric,clock_out_longitude numeric,clock_out_accuracy numeric,clock_out_photo_url text,clock_out_ip inet,
work_type text,break_minutes integer DEFAULT 0,contractor_role contractor_role,work_type_rate numeric,pay_rate_applied numeric,payroll_amount numeric,utility_bill_rate_applied numeric,utility_bill_amount numeric,
status text DEFAULT 'PENDING',reviewed_by uuid,reviewed_at timestamptz,rejection_reason text,is_deleted boolean DEFAULT false,sync_status text DEFAULT 'SYNCED',created_at timestamptz DEFAULT now(),created_by uuid,updated_at timestamptz DEFAULT now(),
total_minutes integer GENERATED ALWAYS AS(extract(epoch FROM coalesce(clock_out_at,clock_in_at)-clock_in_at)/60) STORED,
billable_minutes integer GENERATED ALWAYS AS(extract(epoch FROM coalesce(clock_out_at,clock_in_at)-clock_in_at)/60-break_minutes) STORED);
CREATE TABLE time_entry_vehicle_claims(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),time_entry_id uuid UNIQUE,contractor_id uuid,vehicle_type text DEFAULT 'PERSONAL',declared_hours numeric,notes text,vehicle_photo_url text,license_plate_photo_url text,amount numeric DEFAULT 0,capped boolean DEFAULT false,status text DEFAULT 'PENDING',reviewed_by uuid,reviewed_at timestamptz,rejection_reason text);
CREATE FUNCTION private.apply_time_entry_costing() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;
CREATE TRIGGER tr_apply_time_entry_costing BEFORE INSERT OR UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION private.apply_time_entry_costing();
CREATE FUNCTION private.compute_vehicle_claim_amount() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;
CREATE TRIGGER tr_compute_vehicle_claim_amount BEFORE INSERT OR UPDATE ON time_entry_vehicle_claims FOR EACH ROW EXECUTE FUNCTION private.compute_vehicle_claim_amount();
GRANT USAGE ON SCHEMA public,private,auth TO authenticated,service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_billing_rates ENABLE ROW LEVEL SECURITY; ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_time ON time_entries FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY fixture_contractors ON contractors FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY fixture_profiles ON profiles FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY fixture_billing ON utility_billing_rates FOR ALL TO authenticated USING(true) WITH CHECK(true);
GRANT SELECT ON contractors,profiles TO authenticated; GRANT UPDATE ON contractors TO authenticated;
`);
await db.query('INSERT INTO profiles(id,role) VALUES($1,\'SUPER_ADMIN\'),($2,\'ADMIN\'),($3,\'CEO\')',[sa,admin,ceo]);
await db.query("SELECT set_config('test.actor_id',$1,false)",[sa]);
await db.query("INSERT INTO profiles(id,role) VALUES($1,'CONTRACTOR')",[legacyId]);
await db.query("INSERT INTO contractors(id,profile_id,role) VALUES($1,$1,'DRIVER')",[legacyId]);
await db.query("INSERT INTO role_rate_defaults VALUES('DRIVER','STANDARD_ASSESSMENT',65),('DRIVER','TRAVEL',65)");
await db.query("INSERT INTO contractor_rates VALUES($1,'TRAVEL',75,current_date,NULL)",[legacyId]);
await db.query("INSERT INTO time_entries(contractor_id,clock_in_at,clock_out_at,work_type,work_type_rate,pay_rate_applied,payroll_amount,utility_bill_rate_applied,utility_bill_amount,contractor_role) VALUES($1,'2026-09-21T12:00Z','2026-09-21T13:00Z','TRAVEL',77,77,77,101,101,'DRIVER')",[legacyId]);
// Exact migration must compile against the fixture; the old proposal is not applied.
await db.exec(await readFile(new URL('../../supabase/migrations/20261004174918_configurable_contractor_time_payroll.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261004185253_protect_closed_shift_evidence_and_agreement_boundaries.sql',import.meta.url),'utf8'));
await db.exec("GRANT EXECUTE ON FUNCTION private.has_permission(uuid,text) TO authenticated,service_role;");
const migration = new URL('../../supabase/migrations/20261007092206_crew_time_tracking_and_vehicle_evidence_guards.sql', import.meta.url);
const baseline = JSON.parse(await readFile(new URL('../../supabase/crew_payroll_guard_baseline.json', import.meta.url), 'utf8'));
const onboarding = await readFile(new URL('../../supabase/migrations/20261004223538_contractor_account_setup_and_minimal_onboarding.sql', import.meta.url), 'utf8');
const crew = await readFile(new URL('../../supabase/migrations/20261006123214_ticket_draft_crew_review_workflow.sql', import.meta.url), 'utf8');
function functionSQL(source, name) {
 const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 const match = source.match(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${escaped}\\([\\s\\S]*?AS \\$\\$[\\s\\S]*?\\$\\$;`));
 assert.ok(match, `Missing canonical function ${name}`);
 return match[0];
}
await db.exec(functionSQL(onboarding, 'private.contractor_portal_ready'));
await db.exec(functionSQL(crew, 'private.has_permission'));
await db.exec(functionSQL(crew, 'private.can_access_ticket'));
await db.exec(functionSQL(crew, 'private.can_assess_ticket'));
await db.exec(Object.values(baseline.functions).map(sql => sql.trim() + ';').join('\n'));
await db.exec(`REVOKE ALL ON FUNCTION private.guard_time_entry_input(),private.compute_vehicle_claim_amount() FROM PUBLIC,anon,authenticated;
DROP POLICY worker_ticket_isolation ON public.tickets;
CREATE POLICY worker_ticket_isolation ON public.tickets AS RESTRICTIVE FOR ALL TO authenticated USING(private.active_profile_role()<>'CONTRACTOR' OR private.can_access_ticket(id)) WITH CHECK(private.active_profile_role()<>'CONTRACTOR' OR private.can_access_ticket(id));
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_ticket_read ON tickets FOR SELECT TO authenticated USING(private.can_access_ticket(id));
GRANT SELECT ON tickets TO authenticated;
ALTER TABLE time_entry_vehicle_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_claim_access ON time_entry_vehicle_claims FOR ALL TO authenticated USING(true) WITH CHECK(true);
GRANT SELECT,INSERT,UPDATE ON time_entry_vehicle_claims TO authenticated;
INSERT INTO private.permission_catalog VALUES('admin.tickets.view',true,false),('admin.tickets.edit',false,false),('admin.assessments.view',true,false),('admin.assessments.edit',false,false);`);
await db.query("INSERT INTO utility_billing_rates(work_type,hourly_rate) VALUES('TRAVEL',175),('STANDARD_ASSESSMENT',175)");
const start = new Date(Date.now()+30000).toISOString();
const at = minutes => new Date(Date.parse(start)+minutes*60000).toISOString();
const finish = at(240);
const terms = (role = 'DRIVER', rate = 65) => ({role,base_hourly_rate:rate,work_type_rates:{},policy:{mode:'FLAT',multiplier:1},driver_eligible:role==='DRIVER',vehicle_allowance_enabled:role==='DRIVER',vehicle_hourly_rate:role==='DRIVER'?5:0,week_start_day:1,timezone:'America/Chicago'});
const interval = (kind, from = start, to = null) => ({id:randomUUID(),kind,start_at:from,end_at:to});
async function actor(profileId, fn, authenticated = true) {
 await db.query("SELECT set_config('test.actor_id',$1,false)", [profileId ?? '']);
 if (authenticated) await db.exec('SET ROLE authenticated');
 let failure;
 try { return await fn(); } catch (error) { failure=error; throw error; } finally {
  if (authenticated) {
   try { await db.exec('RESET ROLE'); } catch (cleanupError) { if (!failure) throw cleanupError; }
  }
 }
}
async function worker(role = 'DRIVER') {
 const id = randomUUID(), profileId = randomUUID();
 await actor(sa, async () => {
  await db.query("INSERT INTO profiles(id,role) VALUES($1,'CONTRACTOR')", [profileId]);
  await db.query('INSERT INTO contractors(id,profile_id,role) VALUES($1,$2,$3)', [id,profileId,role]);
  await db.query("INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES($1,$2,$3)", [id,new Date().toISOString(),terms(role,role==='DRIVER'?65:85)]);
 }, false);
 return {id,profileId};
}
async function ticket(assessor, driver = null, deleted = false) {
 const id = randomUUID();
 await db.query('INSERT INTO tickets(id,assigned_to,assigned_driver_id,team_lead_id,storm_event_id,is_deleted) VALUES($1,$2,$3,$4,$5,$6)', [id,assessor.id,driver?.id??null,admin,storm,deleted]);
 return id;
}
async function photos(...paths) {
 for (const path of paths) await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos',$1)", [path]);
}
function input(owner, ticketId, extra = {}) {
 const id = randomUUID();
 return {id,contractor_id:owner.id,ticket_id:ticketId,storm_event_id:storm,clock_in_at:start,work_type:'TRAVEL',work_type_rate:999,clock_in_latitude:32.5,clock_in_longitude:-93.7,clock_in_accuracy:10,clock_in_photo_url:`${owner.id}/time-entries/${id}/clock-in.jpg`,...extra};
}
async function insertShift(values) {
 const keys = Object.keys(values);
 await db.query(`INSERT INTO time_entries(${keys.join(',')}) VALUES(${keys.map((_, index) => `$${index+1}`).join(',')})`, keys.map(key => values[key]));
 return values.id;
}
async function updateShift(id, values) {
 const keys = Object.keys(values);
 await db.query(`UPDATE time_entries SET ${keys.map((key, index) => `${key}=$${index+2}`).join(',')} WHERE id=$1`, [id,...keys.map(key=>values[key])]);
}
const row = async id => (await db.query('SELECT * FROM time_entries WHERE id=$1', [id])).rows[0];
async function closedShift(owner, ticketId) {
 const values = input(owner,ticketId);
 await photos(values.clock_in_photo_url);
 await actor(owner.profileId, () => insertShift(values));
 const activity = interval('VEHICLE_USE');
 if (owner.role !== 'DAMAGE_ASSESSER') {
  await actor(owner.profileId, () => updateShift(values.id,{activity_intervals:[activity]}));
 }
 const outPhoto = `${owner.id}/time-entries/${values.id}/clock-out.jpg`;
 await photos(outPhoto);
 await actor(owner.profileId, () => updateShift(values.id,{clock_out_at:finish,clock_out_latitude:32.5,clock_out_longitude:-93.7,clock_out_accuracy:10,clock_out_photo_url:outPhoto,activity_intervals:owner.role==='DAMAGE_ASSESSER'?[]:[{...activity,end_at:finish}]}));
 return row(values.id);
}
async function claim(shift, values = {}) {
 const input = {time_entry_id:shift.id,contractor_id:shift.contractor_id,declared_hours:999,notes:'Isolated vehicle evidence fixture',vehicle_photo_url:`${shift.contractor_id}/time-entries/${shift.id}/vehicle.jpg`,license_plate_photo_url:`${shift.contractor_id}/time-entries/${shift.id}/plate.jpg`,...values};
 const keys = Object.keys(input);
 return (await db.query(`INSERT INTO time_entry_vehicle_claims(${keys.join(',')}) VALUES(${keys.map((_,i)=>`$${i+1}`).join(',')}) RETURNING *`, keys.map(key=>input[key]))).rows[0];
}
async function rolledBack(fn) {
 await db.exec('BEGIN');
 try { return await fn(); } finally { await db.exec('ROLLBACK'); }
}
const assessor = {...await worker('DAMAGE_ASSESSER'),role:'DAMAGE_ASSESSER'};
const driver = {...await worker(),role:'DRIVER'};
const crewTicket = await ticket(assessor,driver);
const legacyTicket = await ticket(driver);
const baselineShift = await closedShift(driver,legacyTicket);
const historicalClaim = await actor(driver.profileId, () => claim(baselineShift));
const beforeHistorical = (await db.query('SELECT * FROM time_entry_vehicle_claims WHERE id=$1',[historicalClaim.id])).rows[0];
const probes = [
 ['assigned driver may clock in to the shared crew ticket', async () => {
  const next = input(driver,crewTicket,{clock_in_at:at(1440)});
  await photos(next.clock_in_photo_url);
  await actor(driver.profileId, () => insertShift(next));
 }],
 ['new claim rejects nonexistent uploaded objects', async () => {
  await db.query('DELETE FROM time_entry_vehicle_claims WHERE id=$1',[historicalClaim.id]);
  await assert.rejects(() => actor(driver.profileId, () => claim(baselineShift)), /Upload.*vehicle.*plate|uploaded.*vehicle.*plate/i);
 }],
 ['new claim rejects a single path used for both photos', async () => {
  await db.query('DELETE FROM time_entry_vehicle_claims WHERE id=$1',[historicalClaim.id]);
  const path = `${driver.id}/time-entries/${baselineShift.id}/single.jpg`; await photos(path);
  await assert.rejects(() => actor(driver.profileId, () => claim(baselineShift,{vehicle_photo_url:path,license_plate_photo_url:path})), /distinct/i);
 }],
];
const red = [];
for (const [name,fn] of probes) {
 try { await rolledBack(fn); } catch (error) { red.push({name,error:error.message}); console.log(`REPRODUCED ${name}: ${error.message}`); }
}
assert.equal(red.length, 3, 'All three baseline reproductions must fail for the expected defects');
assert.match(red[0].error,/Select an assigned ticket in this storm/);
assert.match(red[1].error,/Missing expected rejection/);
assert.match(red[2].error,/Missing expected rejection/);
if (process.argv.includes('--baseline')) {
 console.error('RED: three required guard behaviors fail with the captured current live definitions.');
 await db.close(); process.exit(1);
}
await db.exec(await readFile(migration,'utf8'));
const tests = [];
async function test(name,fn) { await fn(); tests.push(name); console.log(`PASS ${name}`); }
for (const [name,fn] of probes) await test(name, () => rolledBack(fn));
await test('migration preserves historical pending claim and shift byte-for-byte', async () => {
 assert.deepEqual((await db.query('SELECT * FROM time_entry_vehicle_claims WHERE id=$1',[historicalClaim.id])).rows[0],beforeHistorical);
 assert.deepEqual(await row(baselineShift.id),baselineShift);
});
const outsider = await worker();
await test('current crew read and assessor-only assessment semantics are unchanged', async () => {
 for (const [owner,access,assess] of [[driver,true,false],[assessor,true,true],[outsider,false,false]]) {
  await actor(owner.profileId,async()=>{
   const permitted = (await db.query('SELECT private.can_access_ticket($1) access,private.can_assess_ticket($1) assess',[crewTicket])).rows[0];
   assert.equal(permitted.access,access); assert.equal(permitted.assess,assess);
   assert.equal((await db.query('SELECT id FROM tickets WHERE id=$1',[crewTicket])).rows.length,access?1:0);
  });
 }
});
let assessorShift, driverShift;
await test('assessor clock-in, activity save and clock-out retain crew ticket and costing', async () => {
 const values = input(assessor,crewTicket,{work_type:'STANDARD_ASSESSMENT'}); await photos(values.clock_in_photo_url);
 await actor(assessor.profileId,()=>insertShift(values));
 const activity = interval('BREAK',start);
 await actor(assessor.profileId,()=>updateShift(values.id,{activity_intervals:[activity]}));
 const outPhoto = `${assessor.id}/time-entries/${values.id}/clock-out.jpg`; await photos(outPhoto);
 await actor(assessor.profileId,()=>updateShift(values.id,{activity_intervals:[{...activity,end_at:at(30)}],clock_out_at:finish,clock_out_latitude:32.5,clock_out_longitude:-93.7,clock_out_accuracy:10,clock_out_photo_url:outPhoto}));
 assessorShift=await row(values.id); assert.equal(Number(assessorShift.payroll_amount),297.5); assert.equal(Number(assessorShift.utility_bill_amount),612.5); assert.equal(Number(assessorShift.vehicle_allowance_amount),0);
});
await test('driver clock-in, vehicle activity saves and clock-out use assigned_driver_id', async () => {
 const owner = {...await worker(),role:'DRIVER'}; const assigned = await ticket(assessor,owner);
 driverShift=await closedShift(owner,assigned); driverShift.owner=owner;
 assert.equal(driverShift.ticket_id,assigned); assert.equal(Number(driverShift.payroll_amount),260); assert.equal(Number(driverShift.utility_bill_amount),700); assert.equal(Number(driverShift.vehicle_allowance_amount),20); assert.equal(Number(driverShift.vehicle_minutes),240);
});
await test('legacy assessor-only assignment remains valid without a crew driver',async()=>{
 const owner={...await worker('DAMAGE_ASSESSER'),role:'DAMAGE_ASSESSER'};
 const stored=await closedShift(owner,await ticket(owner));
 assert.equal(Number(stored.payroll_amount),340); assert.equal(Number(stored.utility_bill_amount),700);
});
async function invalidClock(extra, error, owner = outsider, ticketId = null) {
 ticketId ??= await ticket(owner);
 const values = input(owner,ticketId,extra); await photos(values.clock_in_photo_url);
 await assert.rejects(()=>actor(owner.profileId,()=>insertShift(values)),error);
}
await test('unrelated contractor cannot clock into another crew ticket',()=>invalidClock({},/assigned ticket/,outsider,crewTicket));
await test('same actor with mismatched storm is rejected',()=>invalidClock({storm_event_id:randomUUID()},/assigned ticket/));
await test('deleted assigned ticket is rejected',async()=>invalidClock({},/assigned ticket/,outsider,await ticket(outsider,null,true)));
await test('null assignment cannot authorize an unrelated contractor',async()=>invalidClock({},/assigned ticket/,outsider,await ticket(assessor)));
await test('contractor identity is checked independently of ticket membership',async()=>{
 const values=input(driver,crewTicket,{clock_in_at:at(1440)}); await photos(values.clock_in_photo_url);
 await assert.rejects(()=>actor(outsider.profileId,()=>insertShift(values)),/Active contractor|row-level security/);
});
await test('inactive account remains fail-closed',async()=>rolledBack(async()=>{
 await db.query('UPDATE profiles SET is_active=false WHERE id=$1',[outsider.profileId]);
 await invalidClock({},/Active account setup|row-level security/);
}));
await test('clock-in retains GPS bounds and accuracy validation',async()=>{
 for(const extra of [{clock_in_latitude:null},{clock_in_longitude:181},{clock_in_accuracy:101}]) await invalidClock(extra,/clock-in GPS/);
});
await test('clock-in requires an uploaded object under the owned shift path',async()=>{
 for(const photo of [null,'other/clock-in.jpg',`${outsider.id}/time-entries/${randomUUID()}/clock-in.jpg`]) await invalidClock({clock_in_photo_url:photo},/clock-in photo/);
 const values=input(outsider,await ticket(outsider));
 await assert.rejects(()=>actor(outsider.profileId,()=>insertShift(values)),/clock-in photo/);
});
await test('activity overlap and driver eligibility remain enforced',async()=>{
 const owner=await worker(); const assigned=await ticket(owner); const values=input(owner,assigned); await photos(values.clock_in_photo_url); await actor(owner.profileId,()=>insertShift(values));
 await assert.rejects(()=>actor(owner.profileId,()=>updateShift(values.id,{activity_intervals:[interval('BREAK',start,at(5/60)),interval('VEHICLE_USE',start,at(10/60))]})),/overlap/);
 const another={...await worker('DAMAGE_ASSESSER'),role:'DAMAGE_ASSESSER'}; const av=input(another,await ticket(another)); await photos(av.clock_in_photo_url); await actor(another.profileId,()=>insertShift(av));
 await assert.rejects(()=>actor(another.profileId,()=>updateShift(av.id,{activity_intervals:[interval('VEHICLE_USE')]})),/driver eligibility/);
});
await test('activity history, clock-out GPS and clock-out object validation remain enforced',async()=>{
 const owner=await worker(); const values=input(owner,await ticket(owner)); await photos(values.clock_in_photo_url); await actor(owner.profileId,()=>insertShift(values));
 const activity=interval('BREAK',start,at(5/60)); await actor(owner.profileId,()=>updateShift(values.id,{activity_intervals:[activity]}));
 await assert.rejects(()=>actor(owner.profileId,()=>updateShift(values.id,{activity_intervals:[]})),/activities are immutable/);
 await assert.rejects(()=>actor(owner.profileId,()=>updateShift(values.id,{clock_out_at:finish})),/clock-out GPS/);
 await assert.rejects(()=>actor(owner.profileId,()=>updateShift(values.id,{clock_out_at:finish,clock_out_latitude:32.5,clock_out_longitude:-93.7,clock_out_accuracy:10,clock_out_photo_url:'missing'})),/clock-out photo/);
});
await test('contractors cannot reassign or review their shifts',async()=>{
 await assert.rejects(()=>actor(assessor.profileId,()=>updateShift(assessorShift.id,{status:'APPROVED'})),/privileged staff/);
 await assert.rejects(()=>actor(assessor.profileId,()=>updateShift(assessorShift.id,{ticket_id:legacyTicket})),/permission denied|privileged staff/);
 await invalidClock({status:'APPROVED'},/await privileged review/);
});
await test('closed snapshots and evidence remain immutable even for privileged callers',async()=>{
 await actor(sa,()=>updateShift(driverShift.id,{payroll_amount:1,utility_bill_amount:1,vehicle_allowance_amount:999}),false);
 const stored=await row(driverShift.id); assert.equal(Number(stored.payroll_amount),260); assert.equal(Number(stored.utility_bill_amount),700); assert.equal(Number(stored.vehicle_allowance_amount),20);
 await assert.rejects(()=>actor(sa,()=>updateShift(driverShift.id,{clock_out_at:null}),false),/immutable/);
 await assert.rejects(()=>actor(sa,()=>updateShift(driverShift.id,{clock_in_photo_url:'changed'}),false),/evidence is immutable/);
});
const claimOwner=driverShift.owner;
await test('new claim rejects either null photo path explicitly',async()=>{
 for(const values of [{vehicle_photo_url:null},{license_plate_photo_url:null}]) await assert.rejects(()=>actor(claimOwner.profileId,()=>claim(driverShift,values)),/Vehicle photos/);
});
await test('new claim rejects wrong-owner and wrong-shift paths even when uploaded',async()=>{
 for(const prefix of [`${outsider.id}/time-entries/${driverShift.id}`,`${claimOwner.id}/time-entries/${randomUUID()}`]) {
  const wrong=`${prefix}/vehicle.jpg`; await photos(wrong);
  await assert.rejects(()=>actor(claimOwner.profileId,()=>claim(driverShift,{vehicle_photo_url:wrong})),/belong/);
 }
});
await test('one uploaded claim photo or objects in a different bucket are insufficient',async()=>{
 const vehicle=`${claimOwner.id}/time-entries/${driverShift.id}/vehicle.jpg`,plate=`${claimOwner.id}/time-entries/${driverShift.id}/plate.jpg`;
 await photos(vehicle); await assert.rejects(()=>actor(claimOwner.profileId,()=>claim(driverShift)),/Upload.*vehicle.*plate/i);
 await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('other-bucket',$1)",[plate]);
 await assert.rejects(()=>actor(claimOwner.profileId,()=>claim(driverShift)),/Upload.*vehicle.*plate/i);
});
let validClaim;
await test('two distinct uploaded claim photos retain agreement wage and allowance amounts',async()=>{
 await photos(`${claimOwner.id}/time-entries/${driverShift.id}/plate.jpg`);
 validClaim=await actor(claimOwner.profileId,()=>claim(driverShift));
 assert.equal(Number(validClaim.amount),20); assert.equal(Number(validClaim.declared_hours),4); assert.equal(validClaim.capped,false);
 assert.equal(Number((await row(driverShift.id)).payroll_amount),260);
});
await test('claim ownership and assessor-only shifts cannot be substituted',async()=>{
 await rolledBack(async()=>{
  await db.query('DELETE FROM time_entry_vehicle_claims WHERE id=$1',[validClaim.id]);
  await assert.rejects(()=>actor(outsider.profileId,()=>claim(driverShift)),/row-level security/);
 });
 await assert.rejects(()=>actor(assessor.profileId,()=>claim(assessorShift)),/same contractor and a driver/);
});
await test('contractor and Admin reviewers cannot approve vehicle claims',async()=>{
 await assert.rejects(()=>actor(claimOwner.profileId,()=>db.query("UPDATE time_entry_vehicle_claims SET status='APPROVED' WHERE id=$1",[validClaim.id])),/Administrator review/);
 const denied=await actor(admin,()=>db.query("UPDATE time_entry_vehicle_claims SET status='APPROVED' WHERE id=$1 RETURNING id",[validClaim.id]));
 assert.equal(denied.rows.length,0);
 assert.equal((await db.query('SELECT status FROM time_entry_vehicle_claims WHERE id=$1',[validClaim.id])).rows[0].status,'PENDING');
});
await test('historical claim with missing objects remains reviewable at its immutable saved amount',async()=>{
 await actor(sa,async()=>{
  await db.query("UPDATE time_entry_vehicle_claims SET status='APPROVED',amount=999,reviewed_by=$2 WHERE id=$1",[historicalClaim.id,outsider.profileId]);
 });
 const saved=(await db.query('SELECT * FROM time_entry_vehicle_claims WHERE id=$1',[historicalClaim.id])).rows[0];
 assert.equal(saved.status,'APPROVED'); assert.equal(saved.reviewed_by,sa); assert.equal(saved.amount,beforeHistorical.amount); assert.equal(saved.capped,beforeHistorical.capped); assert.equal(saved.vehicle_photo_url,beforeHistorical.vehicle_photo_url);
});
await test('claim review binds privileged actor and preserves amounts and submitted details',async()=>{
 await actor(ceo,()=>db.query("UPDATE time_entry_vehicle_claims SET status='APPROVED',amount=999,capped=true,reviewed_by=null WHERE id=$1",[validClaim.id]));
 const saved=(await db.query('SELECT * FROM time_entry_vehicle_claims WHERE id=$1',[validClaim.id])).rows[0];
 assert.equal(saved.reviewed_by,ceo); assert.equal(Number(saved.amount),20); assert.equal(saved.capped,false);
 await assert.rejects(()=>actor(ceo,()=>db.query('UPDATE time_entry_vehicle_claims SET vehicle_photo_url=$2 WHERE id=$1',[validClaim.id,'changed'])),/details are immutable/);
 await assert.rejects(()=>actor(ceo,()=>db.query("UPDATE time_entry_vehicle_claims SET status='REJECTED',rejection_reason='Again' WHERE id=$1",[validClaim.id])),/already been reviewed/);
 assert.equal(Number((await row(driverShift.id)).payroll_amount)+Number(saved.amount),280);
});
await test('private trigger functions retain definer isolation, empty search path and execute denial',async()=>{
 for(const name of ['guard_time_entry_input','compute_vehicle_claim_amount']) {
  const result=(await db.query("SELECT p.prosecdef,p.proconfig,has_function_privilege('authenticated',p.oid,'EXECUTE') auth,has_function_privilege('anon',p.oid,'EXECUTE') anon FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname=$1",[name])).rows[0];
  assert.equal(result.prosecdef,true); assert.deepEqual(result.proconfig,['search_path=""']); assert.equal(result.auth,false); assert.equal(result.anon,false);
 }
});
await writeFile(new URL('../../docs/testing/crew-payroll-guards-local.json',import.meta.url),JSON.stringify({verifiedAt:new Date().toISOString(),environment:'isolated PGlite composed current time guard, crew access and payroll costing; simulated Storage rows and request identities; not live or physical device evidence',baseline:red,tests,passed:tests.length},null,2)+'\n');
console.log(`${tests.length} composed-current payroll guard checks passed.`);
if(process.argv.includes('--verify-live-script-fixture')) {
 await worker(); await worker('DAMAGE_ASSESSER');
 await db.exec(`CREATE TABLE public.storm_events(id uuid PRIMARY KEY,utility_client text,is_deleted boolean DEFAULT false);
 ALTER TABLE tickets ADD COLUMN ticket_number text,ADD COLUMN utility_client text,ADD COLUMN latitude numeric,ADD COLUMN longitude numeric,ADD COLUMN created_by uuid;
 CREATE POLICY fixture_live_claim_update_ceiling ON time_entry_vehicle_claims AS RESTRICTIVE FOR UPDATE TO authenticated USING(private.has_permission(auth.uid(),'admin.payroll.edit')) WITH CHECK(private.has_permission(auth.uid(),'admin.payroll.edit'));
 CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('test.actor_id',true),''))::uuid $$;`);
 await db.query("INSERT INTO storm_events(id,utility_client) VALUES($1,'Isolated utility')",[storm]);
 const counts=async()=>(await db.query('SELECT (SELECT count(*) FROM tickets) tickets,(SELECT count(*) FROM time_entries) shifts,(SELECT count(*) FROM time_entry_vehicle_claims) claims,(SELECT count(*) FROM storage.objects) objects')).rows[0];
 const before=await counts();
 await db.exec(await readFile(new URL('./crew-payroll-guards-live-rollback.sql',import.meta.url),'utf8'));
 assert.deepEqual(await counts(),before);
 console.log('PASS rollback SQL compiles/runs on the composed fixture and restores fixture counts; this is not live Supabase evidence.');
}
await db.close();
