// Database Connection Test Script
// Run with: node scripts/test-connection.mjs

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔄 Testing Supabase connection...\n');

  try {
    // Test 1: Auth connection
    console.log('Test 1: Auth connection');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.log('  ❌ Auth connection failed:', authError.message);
    } else {
      console.log('  ✅ Auth connection successful');
    }

    // Test 2: Profiles table
    console.log('\nTest 2: Profiles table');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.log('  ❌ Profiles table access failed:', profilesError.message);
    } else {
      console.log('  ✅ Profiles table accessible');
    }

    // Test 3: Wire sizes data
    console.log('\nTest 3: Wire sizes data');
    const { data: wires, error: wiresError } = await supabase
      .from('wire_sizes')
      .select('*');
    
    if (wiresError) {
      console.log('  ❌ Wire sizes query failed:', wiresError.message);
    } else {
      console.log(`  ✅ Wire sizes data accessible (${wires?.length || 0} entries)`);
    }

    // Test 4: Equipment types data
    console.log('\nTest 4: Equipment types data');
    const { data: equipment, error: equipError } = await supabase
      .from('equipment_types')
      .select('*');
    
    if (equipError) {
      console.log('  ❌ Equipment types query failed:', equipError.message);
    } else {
      console.log(`  ✅ Equipment types data accessible (${equipment?.length || 0} entries)`);
    }

    // Test 5: RLS Policies check (try to access without auth)
    console.log('\nTest 5: RLS Policies');
    const { data: testData, error: rlsError } = await supabase
      .from('profiles')
      .select('*');
    
    if (rlsError && rlsError.message.includes('row-level security')) {
      console.log('  ✅ RLS policies are active');
    } else if (!rlsError) {
      console.log('  ⚠️  RLS policies may not be configured (data returned without auth)');
    } else {
      console.log('  ⚠️  RLS check inconclusive:', rlsError.message);
    }

    console.log('\n✅ Connection tests completed!');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testConnection();
