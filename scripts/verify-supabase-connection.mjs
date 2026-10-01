import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd(), true);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !secret) throw new Error('Supabase connection settings are incomplete.');
if (process.env.NEXT_PUBLIC_ENABLE_SUPER_ADMIN_TESTING === 'true') throw new Error('Browser-local test mode is still enabled.');
if (new URL(url).hostname !== 'xcvacmreerrypygpritq.supabase.co') throw new Error('Unexpected Supabase project.');

const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
if (!health.ok) throw new Error(`Supabase Auth health failed: ${health.status}`);
const anonymous = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: anonymousError, status: anonymousStatus } = await anonymous.from('storm_events').select('id').limit(1);
if (!anonymousError || ![401, 403].includes(anonymousStatus)) throw new Error('Unauthenticated storm access was not denied.');

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: profile, error } = await admin.from('profiles').select('id, email, role, is_active, must_reset_password').eq('email', 'dmccarty@gridelectriccorp.com').single();
if (error) throw error;
if (!profile.is_active || profile.role !== 'SUPER_ADMIN') throw new Error('The testing account is not an active Super Admin.');
console.log(JSON.stringify({
  project: new URL(url).hostname, publicKey: key.startsWith('sb_publishable_') ? 'publishable' : 'legacy anon',
  localTestMode: false, authHealth: health.status, anonymousDataAccess: 'denied',
  testingAccount: { email: profile.email, role: profile.role, active: profile.is_active, mustResetPassword: profile.must_reset_password },
  profileDataApi: 'verified', businessTables: 'require an authenticated user session',
}, null, 2));
