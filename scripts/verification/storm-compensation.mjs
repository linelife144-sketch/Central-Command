import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const runtime = process.env.CC_PGLITE_PATH || '/Users/davidmccarty/.codex/.chatgpt-projects/g-p-698e4e3dea2c819193d268ef77b9572e/workspace/e2e-20261001/policy-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(runtime).href);
const db = new PGlite();
const superAdminId = randomUUID();
let sequence = 0;

await db.exec(`
  CREATE SCHEMA private; CREATE SCHEMA auth; CREATE SCHEMA storage;
  CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.actor_id', true), '')::uuid $$;
  CREATE TYPE contractor_role AS ENUM ('STORM_MANAGER','TEAM_LEAD','SR_DAMAGE_ASSESSER','DAMAGE_ASSESSER','DRIVER');
  CREATE TYPE user_role AS ENUM ('CEO','SUPER_ADMIN','ADMIN','CONTRACTOR');
  CREATE TABLE profiles(id uuid PRIMARY KEY, role user_role, is_active boolean DEFAULT true, must_reset_password boolean DEFAULT false, first_name text, last_name text);
  CREATE FUNCTION private.active_profile_role() RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT role::text FROM public.profiles WHERE id=auth.uid() AND is_active AND NOT must_reset_password $$;
  CREATE TABLE private.permission_catalog(permission_key text PRIMARY KEY, admin_default boolean, privileged boolean);
  CREATE TABLE user_permissions(profile_id uuid, permission_key text, effect text);
  CREATE TABLE user_permission_versions(profile_id uuid);
  INSERT INTO private.permission_catalog VALUES ('admin.contractors.view',true,false),('admin.payroll.view',true,false),('admin.payroll.edit',false,false),('admin.assignments.view',true,false),('admin.assignments.edit',false,false),('admin.storms.view',true,false),('admin.storms.edit',false,false),('admin.time.view',true,false),('admin.time.edit',true,false),('admin.users.edit',false,true);
  CREATE FUNCTION private.has_permission(p_profile_id uuid, p_key text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
    SELECT private.active_profile_role() IN ('CEO','SUPER_ADMIN') OR EXISTS (SELECT 1 FROM public.user_permissions WHERE profile_id=p_profile_id AND permission_key=p_key AND effect='allow')
  $$;
  CREATE TABLE contractors(id uuid PRIMARY KEY, profile_id uuid REFERENCES profiles(id), role contractor_role NOT NULL, is_deleted boolean DEFAULT false, is_eligible_for_assignment boolean DEFAULT true, onboarding_status text DEFAULT 'APPROVED');
  CREATE TABLE contractor_rates(contractor_id uuid, work_type text, hourly_rate numeric, effective_from date, effective_to date);
  CREATE TABLE role_rate_defaults(role contractor_role, work_type text, hourly_rate numeric);
  CREATE TABLE utility_billing_rates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), storm_event_id uuid, work_type text NOT NULL, hourly_rate numeric NOT NULL, currency varchar(3) DEFAULT 'USD', updated_at timestamptz DEFAULT now(), updated_by uuid);
  CREATE TABLE storm_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_code text UNIQUE NOT NULL, name text NOT NULL, utility_client text NOT NULL, status text NOT NULL DEFAULT 'MOB', region text, contract_reference text, start_date date, end_date date, notes text, created_by uuid, updated_by uuid, created_at timestamptz DEFAULT now(), is_deleted boolean DEFAULT false, ticket_template_key text NOT NULL DEFAULT 'TEST', config_snapshot jsonb NOT NULL DEFAULT '{}');
  CREATE TABLE storm_event_roster_revisions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), storm_event_id uuid NOT NULL REFERENCES storm_events(id), revision_number integer NOT NULL, is_locked boolean NOT NULL DEFAULT false, revision_label text, created_by uuid, UNIQUE(storm_event_id,revision_number));
  CREATE TABLE storm_event_roster_members(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), roster_revision_id uuid NOT NULL REFERENCES storm_event_roster_revisions(id), contractor_id uuid REFERENCES contractors(id), member_status text NOT NULL DEFAULT 'PENDING', created_by uuid, updated_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
  CREATE TABLE tickets(id uuid PRIMARY KEY, assigned_to uuid, storm_event_id uuid REFERENCES storm_events(id), is_deleted boolean DEFAULT false, status text DEFAULT 'ASSIGNED', updated_at timestamptz, updated_by uuid, address text);
  CREATE TABLE ticket_status_history(ticket_id uuid, changed_by uuid);
  CREATE TABLE audit_logs(action text, entity_type text, entity_id uuid, user_id uuid, user_role user_role, old_values jsonb, new_values jsonb, change_summary text);
  CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
  CREATE TABLE time_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contractor_id uuid NOT NULL, ticket_id uuid, storm_event_id uuid, clock_in_at timestamptz NOT NULL, clock_out_at timestamptz, clock_in_latitude numeric, clock_in_longitude numeric, clock_in_accuracy numeric, clock_in_photo_url text, clock_in_ip inet, clock_in_user_agent text, clock_out_latitude numeric, clock_out_longitude numeric, clock_out_accuracy numeric, clock_out_photo_url text, clock_out_ip inet, work_type text NOT NULL, work_type_rate numeric NOT NULL, total_minutes integer GENERATED ALWAYS AS (extract(epoch FROM coalesce(clock_out_at,clock_in_at)-clock_in_at)/60) STORED, break_minutes integer DEFAULT 0, billable_minutes integer GENERATED ALWAYS AS (extract(epoch FROM coalesce(clock_out_at,clock_in_at)-clock_in_at)/60-break_minutes) STORED, billable_amount numeric, contractor_role contractor_role, pay_rate_applied numeric, payroll_amount numeric, utility_bill_rate_applied numeric, utility_bill_amount numeric, status text DEFAULT 'PENDING', reviewed_by uuid, reviewed_at timestamptz, rejection_reason text, is_deleted boolean DEFAULT false, sync_status text DEFAULT 'SYNCED', created_at timestamptz DEFAULT now(), created_by uuid, updated_at timestamptz DEFAULT now());
  CREATE TABLE time_entry_vehicle_claims(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), time_entry_id uuid UNIQUE, contractor_id uuid, vehicle_type text DEFAULT 'PERSONAL', declared_hours numeric, notes text, vehicle_photo_url text, license_plate_photo_url text, amount numeric DEFAULT 0, capped boolean DEFAULT false, status text DEFAULT 'PENDING', reviewed_by uuid, reviewed_at timestamptz, rejection_reason text);
  CREATE FUNCTION private.apply_time_entry_costing() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
  CREATE TRIGGER tr_apply_time_entry_costing BEFORE INSERT OR UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION private.apply_time_entry_costing();
  CREATE FUNCTION private.compute_vehicle_claim_amount() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
  CREATE TRIGGER tr_compute_vehicle_claim_amount BEFORE INSERT OR UPDATE ON time_entry_vehicle_claims FOR EACH ROW EXECUTE FUNCTION private.compute_vehicle_claim_amount();
  GRANT USAGE ON SCHEMA public,private,auth TO authenticated,service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE contractors ENABLE ROW LEVEL SECURITY; ALTER TABLE utility_billing_rates ENABLE ROW LEVEL SECURITY; ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE storm_events ENABLE ROW LEVEL SECURITY;
  CREATE POLICY fixture_time ON time_entries FOR ALL TO authenticated USING(true) WITH CHECK(true);
  CREATE POLICY fixture_contractors ON contractors FOR ALL TO authenticated USING(true) WITH CHECK(true);
  CREATE POLICY fixture_profiles ON profiles FOR ALL TO authenticated USING(true) WITH CHECK(true);
  CREATE POLICY fixture_storm_read ON storm_events FOR SELECT TO authenticated USING(private.has_permission(auth.uid(),'admin.storms.view'));
  CREATE POLICY fixture_storm_insert ON storm_events FOR INSERT TO authenticated WITH CHECK(private.has_permission(auth.uid(),'admin.storms.edit'));
  GRANT SELECT,INSERT ON storm_events TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON utility_billing_rates TO authenticated;
  GRANT SELECT ON contractors,profiles TO authenticated; GRANT UPDATE ON contractors TO authenticated;
  GRANT SELECT,INSERT,UPDATE,DELETE ON storm_event_roster_revisions,storm_event_roster_members TO authenticated;
`);

await db.query("INSERT INTO profiles(id,role) VALUES($1,'SUPER_ADMIN')", [superAdminId]);
await db.query("SELECT set_config('test.actor_id',$1,false)", [superAdminId]);
await db.exec(await readFile(new URL('../../supabase/migrations/20261004174918_configurable_contractor_time_payroll.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261004185253_protect_closed_shift_evidence_and_agreement_boundaries.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261007130000_role_keyed_utility_billing_rates.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261008220000_storm_compensation.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261008234600_storm_compensation_fk_indexes.sql', import.meta.url), 'utf8'));
// Mirror the currently deployed permission helper: standard ADMIN accounts
// can access ticket permissions only; payroll and storm editing remain
// restricted to the privileged roles, even if stale override rows exist.
await db.exec(`CREATE OR REPLACE FUNCTION private.has_permission(p_profile_id uuid,p_key text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r text; active boolean; def boolean; privileged boolean; effect text; permitted boolean;
BEGIN
 SELECT role::text,(is_active AND NOT must_reset_password) INTO r,active FROM public.profiles WHERE id=p_profile_id;
 IF NOT coalesce(active,false) OR r NOT IN ('CEO','SUPER_ADMIN','ADMIN') THEN RETURN false; END IF;
 IF r='ADMIN' AND p_key NOT IN ('admin.tickets.view','admin.tickets.edit','admin.assessments.view','admin.assessments.edit') THEN RETURN false; END IF;
 SELECT admin_default,c.privileged INTO def,privileged FROM private.permission_catalog c WHERE permission_key=p_key;
 IF NOT FOUND OR (privileged AND r NOT IN ('CEO','SUPER_ADMIN')) THEN RETURN false; END IF;
 SELECT u.effect INTO effect FROM public.user_permissions u WHERE profile_id=p_profile_id AND permission_key=p_key;
 permitted:=CASE WHEN effect IS NOT NULL THEN effect='allow' WHEN r IN ('CEO','SUPER_ADMIN','ADMIN') THEN true ELSE def END;
 IF p_key LIKE '%.edit' THEN permitted:=permitted AND private.has_permission(p_profile_id,regexp_replace(p_key,'\\.edit$','.view')); END IF;
 RETURN coalesce(permitted,false);
END $$;`);
await db.exec(`
  CREATE POLICY fixture_billing_read ON utility_billing_rates FOR SELECT TO authenticated USING(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission(auth.uid(),'admin.payroll.view'));
  CREATE POLICY fixture_billing_insert ON utility_billing_rates FOR INSERT TO authenticated WITH CHECK(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission(auth.uid(),'admin.payroll.edit'));
  CREATE POLICY fixture_billing_update ON utility_billing_rates FOR UPDATE TO authenticated USING(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission(auth.uid(),'admin.payroll.edit')) WITH CHECK(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission(auth.uid(),'admin.payroll.edit'));
  CREATE POLICY fixture_billing_delete ON utility_billing_rates FOR DELETE TO authenticated USING(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission(auth.uid(),'admin.payroll.edit'));
`);
await db.exec("GRANT EXECUTE ON FUNCTION private.has_permission(uuid,text) TO authenticated,service_role;");

const roleRates = (pay, bill) => [
  ['STORM_MANAGER', pay + 50, bill + 100], ['TEAM_LEAD', pay + 40, bill + 80],
  ['SR_DAMAGE_ASSESSER', pay + 30, bill + 60], ['DAMAGE_ASSESSER', pay + 20, bill + 40], ['DRIVER', pay, bill],
].map(([role, pay_rate, bill_rate]) => ({ role, pay_rate, bill_rate }));

async function createStorm(name, pay, bill) {
  const { rows } = await db.query("SELECT public.create_storm_event_with_rates($1::jsonb,$2::jsonb) AS storm", [
    { event_code: `QA-${++sequence}`, name, utility_client: 'ENTERGY', status: 'MOB' }, roleRates(pay, bill),
  ]);
  return rows[0].storm;
}

async function test(name, fn) {
  await fn();
  console.log(`PASS ${name}`);
}

const stormA = await createStorm('Storm A', 60, 120);
const stormB = await createStorm('Storm B', 75, 180);

await test('payroll rates and mutations stay behind the authorized profile and RLS boundary', async () => {
  const contractorActor = randomUUID();
  await db.query("INSERT INTO profiles(id,role) VALUES($1,'CONTRACTOR')", [contractorActor]);
  await db.query("SELECT set_config('test.actor_id',$1,false)", [contractorActor]);
  await db.exec('SET ROLE authenticated');
  const hidden = await db.query('SELECT count(*)::int AS count FROM storm_role_pay_rates');
  assert.equal(hidden.rows[0].count, 0);
  await assert.rejects(() => db.query("INSERT INTO storm_role_pay_rates(storm_event_id,role,hourly_rate) VALUES($1,'DRIVER',1)", [stormA.id]), /Storm payroll editing required|row-level security|policy/i);
  await assert.rejects(() => db.query('SELECT public.save_storm_compensation_rates($1,$2::jsonb)', [stormA.id, roleRates(1, 1)]), /Payroll view and editing permissions are required/i);
  await assert.rejects(() => db.query('SELECT public.create_storm_event_with_rates($1::jsonb,$2::jsonb)', [{ event_code: `QA-${++sequence}`, name: 'Unauthorized', utility_client: 'ENTERGY', status: 'MOB' }, roleRates(1, 1)]), /permissions are required/i);
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('test.actor_id',$1,false)", [superAdminId]);
});

await test('standard Admin cannot cross the live payroll and storm authorization boundary', async () => {
  const adminActor = randomUUID();
  await db.query("INSERT INTO profiles(id,role) VALUES($1,'ADMIN')", [adminActor]);
  await db.query("INSERT INTO user_permissions(profile_id,permission_key,effect) VALUES($1,'admin.storms.view','allow'),($1,'admin.storms.edit','allow'),($1,'admin.payroll.view','allow'),($1,'admin.payroll.edit','allow')", [adminActor]);
  await db.query("SELECT set_config('test.actor_id',$1,false)", [adminActor]);
  await db.exec('SET ROLE authenticated');
  const authorization = await db.query("SELECT auth.uid() AS actor,private.active_profile_role() AS profile_role,private.has_permission(auth.uid(),'admin.storms.edit') AS storms_edit,private.has_permission(auth.uid(),'admin.payroll.view') AS payroll_view,private.has_permission(auth.uid(),'admin.payroll.edit') AS payroll_edit");
  assert.deepEqual(authorization.rows[0], { actor: adminActor, profile_role: 'ADMIN', storms_edit: false, payroll_view: false, payroll_edit: false });
  assert.equal(Number((await db.query('SELECT count(*)::int AS count FROM storm_role_pay_rates WHERE storm_event_id=$1', [stormA.id])).rows[0].count), 0);
  await assert.rejects(() => db.query("SELECT public.create_storm_event_with_rates($1::jsonb,$2::jsonb) AS storm", [
    { event_code: `QA-${++sequence}`, name: 'Unauthorized Admin storm', utility_client: 'ENTERGY', status: 'MOB' }, roleRates(51, 111),
  ]), /permissions are required/i);
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('test.actor_id',$1,false)", [superAdminId]);
});

await test('new storms save separate complete pay and bill rates per role', async () => {
  const a = await db.query('SELECT role,hourly_rate FROM storm_role_pay_rates WHERE storm_event_id=$1 ORDER BY role', [stormA.id]);
  const b = await db.query("SELECT role,hourly_rate FROM utility_billing_rates WHERE storm_event_id=$1 AND role IS NOT NULL ORDER BY role", [stormB.id]);
  assert.equal(a.rows.length, 5);
  assert.equal(Number(a.rows.find(row => row.role === 'DRIVER').hourly_rate), 60);
  assert.equal(Number((await db.query("SELECT hourly_rate FROM storm_role_pay_rates WHERE storm_event_id=$1 AND role='DRIVER'", [stormB.id])).rows[0].hourly_rate), 75);
  assert.equal(Number((await db.query("SELECT hourly_rate FROM utility_billing_rates WHERE storm_event_id=$1 AND role='DRIVER'", [stormA.id])).rows[0].hourly_rate), 120);
  assert.equal(Number(b.rows.find(row => row.role === 'DRIVER').hourly_rate), 180);
  assert.notEqual(Number((await db.query("SELECT hourly_rate FROM utility_billing_rates WHERE storm_event_id=$1 AND role='DRIVER'", [stormA.id])).rows[0].hourly_rate), Number(b.rows.find(row => row.role === 'DRIVER').hourly_rate));
  const billAudit = await db.query("SELECT count(*)::int AS count FROM audit_logs WHERE action='STORM_ROLE_BILL_RATE_SAVED' AND entity_id=$1", [stormA.id]);
  assert.equal(billAudit.rows[0].count, 5);
});

await test('storm compensation foreign keys have covering indexes', async () => {
  const { rows } = await db.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('storm_role_pay_rates_updated_by_idx','storm_contractor_compensation_contractor_id_idx','storm_contractor_compensation_updated_by_idx')");
  assert.equal(rows.length, 3);
});

await test('database guards prevent incomplete storm rate cards outside the atomic RPC', async () => {
  await assert.rejects(() => db.query("INSERT INTO storm_events(event_code,name,utility_client,status) VALUES($1,'Direct insert','ENTERGY','MOB')", [`QA-${++sequence}`]), /five pay and bill roles/i);
  await assert.rejects(() => db.query("DELETE FROM storm_role_pay_rates WHERE storm_event_id=$1 AND role='DRIVER'", [stormA.id]), /five pay and bill roles/i);
  assert.equal(Number((await db.query('SELECT count(*)::int AS count FROM storm_role_pay_rates WHERE storm_event_id=$1', [stormA.id])).rows[0].count), 5);
});

await test('assignment requires a Driver allowance and rejects allowances for other roles', async () => {
  const damageAssessor = randomUUID();
  await db.query("INSERT INTO profiles(id,role) VALUES($1,'CONTRACTOR')", [damageAssessor]);
  await db.query("INSERT INTO contractors(id,profile_id,role) VALUES($1,$1,'DAMAGE_ASSESSER')", [damageAssessor]);
  const driver = randomUUID();
  await db.query("INSERT INTO profiles(id,role) VALUES($1,'CONTRACTOR')", [driver]);
  await db.query("INSERT INTO contractors(id,profile_id,role) VALUES($1,$1,'DRIVER')", [driver]);
  await assert.rejects(() => db.query('SELECT public.assign_contractor_to_storm_with_compensation($1,$2,NULL,3)', [stormA.id, damageAssessor]), /only Drivers/i);
  await assert.rejects(() => db.query('SELECT public.assign_contractor_to_storm_with_compensation($1,$2,NULL,NULL)', [stormA.id, driver]), /Every Driver/i);
  await assert.rejects(() => db.query('SELECT public.assign_contractor_to_storm($1,$2)', [stormA.id, damageAssessor]), /storm-scoped pay and vehicle rates/i);
  const assignedDriver = await addContractor(stormA.id, 'DRIVER', 42, null, 6);
  await assert.rejects(() => db.query('DELETE FROM storm_contractor_compensation WHERE storm_event_id=$1 AND contractor_id=$2', [stormA.id, assignedDriver]), /remove the Driver from the current storm roster/i);
  const { rows } = await db.query('SELECT count(*)::int AS count FROM storm_contractor_compensation WHERE storm_event_id=$1 AND contractor_id IN ($2,$3)', [stormA.id, damageAssessor, driver]);
  assert.equal(rows[0].count, 0);
  assert.equal(Number((await db.query('SELECT count(*)::int AS count FROM storm_contractor_compensation WHERE storm_event_id=$1 AND contractor_id=$2', [stormA.id, assignedDriver])).rows[0].count), 1);
});

await test('invalid role card rolls back storm creation', async () => {
  const invalidRates = roleRates(60, 120).slice(0, 4);
  const before = Number((await db.query('SELECT count(*)::int AS count FROM storm_events')).rows[0].count);
  await assert.rejects(() => db.query('SELECT public.create_storm_event_with_rates($1::jsonb,$2::jsonb)', [{ event_code: `QA-${++sequence}`, name: 'Incomplete', utility_client: 'ENTERGY', status: 'MOB' }, invalidRates]), /five role rates|each role|all five roles/i);
  const after = Number((await db.query('SELECT count(*)::int AS count FROM storm_events')).rows[0].count);
  assert.equal(after, before);
});

async function addContractor(stormId, role, agreementRate, payOverride, vehicleRate) {
  const id = randomUUID();
  await db.query("INSERT INTO profiles(id,role) VALUES($1,'CONTRACTOR')", [id]);
  await db.query('INSERT INTO contractors(id,profile_id,role) VALUES($1,$1,$2)', [id, role]);
  await db.query('INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES($1,$2,$3)', [id, new Date(Date.now() + 60_000).toISOString(), {
    role, base_hourly_rate: agreementRate, work_type_rates: {}, policy: { mode: 'FLAT', multiplier: 1 },
    driver_eligible: role === 'DRIVER', vehicle_allowance_enabled: role === 'DRIVER', vehicle_hourly_rate: 1,
    week_start_day: 1, timezone: 'America/Chicago',
  }]);
  await db.query('INSERT INTO tickets(id,assigned_to,storm_event_id,address) VALUES($1,$1,$2,\'QA\')', [id, stormId]);
  await db.query('SELECT public.assign_contractor_to_storm_with_compensation($1,$2,$3,$4)', [stormId, id, payOverride, vehicleRate]);
  return id;
}

await test('storm base wages override contractor-wide agreements across work types and per-contractor override wins', async () => {
  const base = await addContractor(stormA.id, 'DAMAGE_ASSESSER', 999, null, null);
  const override = await addContractor(stormA.id, 'DAMAGE_ASSESSER', 999, 82, null);
  let clockShift = 0;
  const getRoleRate = async (id, type) => {
    const entryId = randomUUID();
    const clockIn = new Date(Date.UTC(2027, 0, 5, 12 + clockShift++, 0)).toISOString();
    const photo = `${id}/time-entries/${entryId}/clock-in`;
    const clockOut = new Date(Date.parse(clockIn) + 60 * 60 * 1000).toISOString();
    const outPhoto = `${id}/time-entries/${entryId}/clock-out`;
    const { rows } = await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos',$1),('time-entry-photos',$2) RETURNING name`, [photo, outPhoto]);
    assert.ok(rows.length);
    return db.query(`INSERT INTO time_entries(id,contractor_id,ticket_id,clock_in_at,clock_out_at,work_type,work_type_rate,storm_event_id,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url)
      VALUES($1,$2,$2,$3,$4,$5,1,$6,32,-93,5,$7,32,-93,5,$8) RETURNING contractor_role,pay_rate_applied,utility_bill_rate_applied`,
    [entryId, id, clockIn, clockOut, type, stormA.id, photo, outPhoto]);
  };
  for (const type of ['TRAVEL','STANDARD_ASSESSMENT']) {
    const { rows } = await getRoleRate(base, type);
    assert.equal(Number(rows[0].pay_rate_applied), 80);
  }
  const { rows } = await getRoleRate(override, 'TRAVEL');
  assert.equal(Number(rows[0].pay_rate_applied), 82);
  assert.equal(Number(rows[0].utility_bill_rate_applied), 160);
});

await test('clock-in snapshots survive later rate edits and closed storms reject edits', async () => {
  const driver = await addContractor(stormA.id, 'DRIVER', 900, 72, 5);
  const entryId = randomUUID();
  const inPhoto = `${driver}/time-entries/${entryId}/clock-in`;
  const outPhoto = `${driver}/time-entries/${entryId}/clock-out`;
  await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos',$1)", [inPhoto]);
  await db.query(`INSERT INTO time_entries(id,contractor_id,ticket_id,clock_in_at,work_type,work_type_rate,storm_event_id,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url)
    VALUES($1,$2,$2,'2027-01-05T12:00:00Z','TRAVEL',1,$3,32,-93,5,$4)`, [entryId, driver, stormA.id, inPhoto]);
  await db.query('SELECT public.save_storm_compensation_rates($1,$2::jsonb)', [stormA.id, roleRates(100, 200)]);
  const newlyAssigned = await addContractor(stormA.id, 'DAMAGE_ASSESSER', 999, null, null);
  const nextEntryId = randomUUID();
  const nextPhoto = `${newlyAssigned}/time-entries/${nextEntryId}/clock-in`;
  await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos',$1)", [nextPhoto]);
  const nextShift = await db.query(`INSERT INTO time_entries(id,contractor_id,ticket_id,clock_in_at,work_type,work_type_rate,storm_event_id,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url)
    VALUES($1,$2,$2,'2027-01-05T12:00:00Z','TRAVEL',1,$3,32,-93,5,$4) RETURNING pay_rate_applied,utility_bill_rate_applied`, [nextEntryId, newlyAssigned, stormA.id, nextPhoto]);
  assert.equal(Number(nextShift.rows[0].pay_rate_applied), 120);
  assert.equal(Number(nextShift.rows[0].utility_bill_rate_applied), 240);
  await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos',$1)", [outPhoto]);
  await db.query(`UPDATE time_entries SET clock_out_at='2027-01-05T18:00:00Z',clock_out_latitude=32,clock_out_longitude=-93,clock_out_accuracy=5,clock_out_photo_url=$2,
    activity_intervals=$3::jsonb WHERE id=$1`, [entryId, outPhoto, [{ id: randomUUID(), kind: 'VEHICLE_USE', start_at: '2027-01-05T12:00:00Z', end_at: '2027-01-05T17:00:00Z' }]]);
  const entry = (await db.query('SELECT pay_rate_applied,utility_bill_rate_applied,vehicle_hourly_rate_applied,payroll_amount,utility_bill_amount,vehicle_allowance_amount FROM time_entries WHERE id=$1', [entryId])).rows[0];
  assert.equal(Number(entry.pay_rate_applied), 72);
  assert.equal(Number(entry.utility_bill_rate_applied), 120);
  assert.equal(Number(entry.vehicle_hourly_rate_applied), 5);
  assert.equal(Number(entry.payroll_amount), 432);
  assert.equal(Number(entry.utility_bill_amount), 720);
  assert.equal(Number(entry.vehicle_allowance_amount), 25);
  await db.query("UPDATE storm_events SET status='CLOSED' WHERE id=$1", [stormA.id]);
  await assert.rejects(() => db.query('SELECT public.save_storm_compensation_rates($1,$2::jsonb)', [stormA.id, roleRates(1, 1)]), /closed/i);
});

await db.close();
