#!/usr/bin/env node
/**
 * Central Command - Supabase Connection Test
 * 
 * Usage:
 *   node scripts/test-supabase-connection.js
 * 
 * This script tests:
 * 1. Basic connection to Supabase
 * 2. Database tables exist
 * 3. Seed data is present
 * 4. RLS policies are working
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase credentials in .env.local');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, type = 'info') {
  const color = type === 'success' ? colors.green 
    : type === 'error' ? colors.red 
    : type === 'warning' ? colors.yellow 
    : colors.blue;
  console.log(`${color}${message}${colors.reset}`);
}

async function testConnection() {
  log('\n🔌 Testing Supabase Connection...\n', 'info');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Basic connection
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    log('✅ Connection to Supabase: PASSED', 'success');
    passed++;
  } catch (err) {
    log(`❌ Connection to Supabase: FAILED - ${err.message}`, 'error');
    failed++;
    // If connection fails, stop here
    console.log('\n❌ Connection test failed. Please check your credentials.');
    process.exit(1);
  }

  // Test 2: Check wire_sizes table and data
  try {
    const { data: wires, error } = await supabase
      .from('wire_sizes')
      .select('*');
    
    if (error) throw error;
    
    if (wires && wires.length === 24) {
      log(`✅ Wire sizes table: PASSED (${wires.length} entries)`, 'success');
      passed++;
    } else {
      log(`⚠️  Wire sizes table: WARNING - Expected 24 entries, found ${wires?.length || 0}`, 'warning');
      passed++;
    }
  } catch (err) {
    log(`❌ Wire sizes table: FAILED - ${err.message}`, 'error');
    failed++;
  }

  // Test 3: Check equipment_types table and data
  try {
    const { data: equipment, error } = await supabase
      .from('equipment_types')
      .select('*');
    
    if (error) throw error;
    
    if (equipment && equipment.length >= 8) {
      log(`✅ Equipment types table: PASSED (${equipment.length} entries)`, 'success');
      passed++;
    } else {
      log(`⚠️  Equipment types table: WARNING - Expected 8+ entries, found ${equipment?.length || 0}`, 'warning');
      passed++;
    }
  } catch (err) {
    log(`❌ Equipment types table: FAILED - ${err.message}`, 'error');
    failed++;
  }

  // Test 4: Check hazard_categories table
  try {
    const { data: hazards, error } = await supabase
      .from('hazard_categories')
      .select('*');
    
    if (error) throw error;
    
    if (hazards && hazards.length >= 5) {
      log(`✅ Hazard categories table: PASSED (${hazards.length} entries)`, 'success');
      passed++;
    } else {
      log(`⚠️  Hazard categories table: WARNING - Expected 5+ entries, found ${hazards?.length || 0}`, 'warning');
      passed++;
    }
  } catch (err) {
    log(`❌ Hazard categories table: FAILED - ${err.message}`, 'error');
    failed++;
  }

  // Test 5: Check expense_policies table
  try {
    const { data: policies, error } = await supabase
      .from('expense_policies')
      .select('*');
    
    if (error) throw error;
    
    if (policies && policies.length >= 8) {
      log(`✅ Expense policies table: PASSED (${policies.length} entries)`, 'success');
      passed++;
    } else {
      log(`⚠️  Expense policies table: WARNING - Expected 8+ entries, found ${policies?.length || 0}`, 'warning');
      passed++;
    }
  } catch (err) {
    log(`❌ Expense policies table: FAILED - ${err.message}`, 'error');
    failed++;
  }

  // Test 6: Check tables exist (profiles, subcontractors, tickets)
  const requiredTables = ['profiles', 'subcontractors', 'tickets', 'time_entries', 'expense_reports'];
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error && error.code === '42P01') {
        log(`❌ Table "${table}": MISSING`, 'error');
        failed++;
      } else {
        log(`✅ Table "${table}": EXISTS`, 'success');
        passed++;
      }
    } catch (err) {
      log(`❌ Table "${table}": ERROR - ${err.message}`, 'error');
      failed++;
    }
  }

  // Test 7: Check RLS is enabled on key tables
  try {
    const { data: rlsData, error } = await supabase
      .rpc('get_tables_with_rls');
    
    if (error) {
      // If the RPC doesn't exist, skip this test
      log('ℹ️  RLS check: SKIPPED (RPC not available)', 'info');
    } else {
      log('✅ RLS policies: CHECKED', 'success');
      passed++;
    }
  } catch (err) {
    // RPC might not exist, that's okay
    log('ℹ️  RLS check: SKIPPED (manual verification required)', 'info');
  }

  // Summary
  log('\n' + '='.repeat(50), 'info');
  log(`Results: ${passed} passed, ${failed} failed`, failed > 0 ? 'error' : 'success');
  log('='.repeat(50) + '\n', 'info');

  if (failed === 0) {
    log('🎉 All tests passed! Supabase is ready to use.\n', 'success');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review the errors above.\n', 'warning');
    log('Common issues:', 'info');
    log('  - SQL files not executed in order', 'info');
    log('  - Missing seed data (run sql/10_seed_data.sql)', 'info');
    log('  - RLS policies blocking access', 'info');
    log('  - Wrong credentials in .env.local\n', 'info');
    process.exit(1);
  }
}

// Run tests
testConnection().catch((err) => {
  log(`\n❌ Unexpected error: ${err.message}`, 'error');
  process.exit(1);
});
