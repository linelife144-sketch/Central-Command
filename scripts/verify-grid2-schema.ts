#!/usr/bin/env tsx
/**
 * Grid2 → Central Command Schema Verification Script
 *
 * Verifies that Grid2's migrations have been successfully applied to CC's Supabase.
 * Checks: CC core tables, Grid2 tables, CEO role, contractor naming, RLS status.
 *
 * Uses the Supabase Management API (/v1/projects/{ref}/database/query) for direct
 * SQL execution — avoiding the PostgREST PGRST205 limitation on system catalogs.
 *
 * Exit codes:
 *   0: All checks passed (prints "SCHEMA OK")
 *   1: One or more checks failed (prints specific failures)
 *
 * Usage:
 *   npx tsx scripts/verify-grid2-schema.ts
 *
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL   (e.g. https://xcvacmreerrypygpritq.supabase.co)
 *   - SUPABASE_ACCESS_TOKEN      (personal access token for Management API)
 *
 * Optional (fall-back if access token not present):
 *   - SUPABASE_SERVICE_ROLE_KEY  (used only for env validation message)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root (one level up from scripts/)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ============================================================================
// Configuration — ACTUAL schema state verified via psql
// ============================================================================

// CC Core tables that must exist
const CC_CORE_TABLES = [
  'profiles',
  'tickets',
  'time_entries',
  'expense_reports',
  'damage_assessments',
  'contractors',          // renamed from subcontractors
  'contractor_rates',     // renamed from subcontractor_rates
  'contractor_banking',   // renamed from subcontractor_banking
  'contractor_invoices',  // renamed from subcontractor_invoices
  'tax_1099_tracking',
  'media_assets',
  'sync_queue',
  'notification_logs',  // actual table name (not 'notifications')
  'audit_logs',
  // inventory_items intentionally excluded — CC-specific, not in Grid2 schema
];

// Grid2 tables that must exist after migration
const GRID2_TABLES = [
  'storm_events',
  'customers',
  'utilities',
  'ticket_templates',
  'storm_event_phase_steps',
  'storm_event_roster_revisions',
  'storm_event_roster_members',
  'storm_event_authorization_logs',
  'storm_event_documents',
  'storm_event_logistics_entries',
];

// Tables that should have RLS enabled (Grid2 additions)
const RLS_REQUIRED_TABLES = [
  'storm_events',
  'customers',
  'utilities',
  'ticket_templates',
  'storm_event_phase_steps',
  'storm_event_roster_revisions',
  'storm_event_roster_members',
  'storm_event_authorization_logs',
  'storm_event_documents',
  'storm_event_logistics_entries',
];

// Legacy subcontractor table names that should NOT exist
const LEGACY_SUBCONTRACTOR_TABLES = [
  'subcontractors',
  'subcontractor_rates',
  'subcontractor_banking',
  'subcontractor_invoices',
];

// Seed tables: checked as warnings only (0 rows is a warning, not a failure)
const SEED_TABLES_WARN_IF_EMPTY: string[] = [
  'wire_sizes',       // expected 0 rows — seed data missing (warn only)
];

// ============================================================================
// Types
// ============================================================================

interface VerificationResult {
  passed: boolean;
  warning?: boolean;
  message: string;
  details?: string[];
}

interface CheckContext {
  runSql: (sql: string) => Promise<Record<string, unknown>[]>;
  failures: string[];
  warnings: string[];
}

// ============================================================================
// Management API SQL runner
// ============================================================================

function buildSqlRunner(projectRef: string, accessToken: string) {
  return async function runSql(sql: string): Promise<Record<string, unknown>[]> {
    const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Management API error ${res.status}: ${body}`);
    }

    const data = await res.json() as Record<string, unknown>[];
    return Array.isArray(data) ? data : [];
  };
}

// ============================================================================
// Utility helpers
// ============================================================================

async function getExistingTables(runSql: CheckContext['runSql']): Promise<Set<string>> {
  const rows = await runSql(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  return new Set(rows.map(r => r.table_name as string));
}

async function getRlsStatus(runSql: CheckContext['runSql']): Promise<Map<string, boolean>> {
  const rows = await runSql(`
    SELECT c.relname AS table_name,
           c.relrowsecurity AS rls_enabled
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relkind = 'r'
    ORDER BY c.relname;
  `);
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(row.table_name as string, row.rls_enabled as boolean);
  }
  return map;
}

async function enumHasValue(
  runSql: CheckContext['runSql'],
  enumName: string,
  value: string,
): Promise<boolean> {
  const rows = await runSql(`
    SELECT EXISTS (
      SELECT 1
      FROM   pg_enum e
      JOIN   pg_type t ON t.oid = e.enumtypid
      WHERE  t.typname = '${enumName}'
        AND  e.enumlabel = '${value}'
    ) AS exists;
  `);
  return rows[0]?.exists === true || rows[0]?.exists === 't';
}

async function getRowCount(runSql: CheckContext['runSql'], tableName: string): Promise<number> {
  const rows = await runSql(`SELECT COUNT(*)::int AS cnt FROM public.${tableName};`);
  return Number(rows[0]?.cnt ?? 0);
}

// ============================================================================
// Verification Checks
// ============================================================================

async function checkCoreTables(ctx: CheckContext): Promise<VerificationResult> {
  const existing = await getExistingTables(ctx.runSql);
  const missing = CC_CORE_TABLES.filter(t => !existing.has(t));

  if (missing.length > 0) {
    ctx.failures.push(`Missing CC core tables: ${missing.join(', ')}`);
    return {
      passed: false,
      message: `❌ ${missing.length} CC core table(s) missing`,
      details: missing,
    };
  }

  return {
    passed: true,
    message: `✅ All ${CC_CORE_TABLES.length} CC core tables present`,
  };
}

async function checkGrid2Tables(ctx: CheckContext): Promise<VerificationResult> {
  const existing = await getExistingTables(ctx.runSql);
  const missing = GRID2_TABLES.filter(t => !existing.has(t));

  if (missing.length > 0) {
    ctx.failures.push(`Missing Grid2 tables: ${missing.join(', ')}`);
    return {
      passed: false,
      message: `❌ ${missing.length} Grid2 table(s) missing`,
      details: missing,
    };
  }

  return {
    passed: true,
    message: `✅ All ${GRID2_TABLES.length} Grid2 tables present`,
  };
}

async function checkCeoRole(ctx: CheckContext): Promise<VerificationResult> {
  const hasCeo = await enumHasValue(ctx.runSql, 'user_role', 'CEO');

  if (!hasCeo) {
    ctx.failures.push('CEO role not found in user_role enum');
    return {
      passed: false,
      message: '❌ CEO role missing from user_role enum',
    };
  }

  return {
    passed: true,
    message: '✅ CEO role present in user_role enum',
  };
}

async function checkContractorNaming(ctx: CheckContext): Promise<VerificationResult> {
  const existing = await getExistingTables(ctx.runSql);

  const legacyFound = LEGACY_SUBCONTRACTOR_TABLES.filter(t => existing.has(t));
  const requiredContractorTables = ['contractors', 'contractor_rates', 'contractor_banking', 'contractor_invoices'];
  const contractorMissing = requiredContractorTables.filter(t => !existing.has(t));

  if (legacyFound.length > 0) {
    ctx.failures.push(`Legacy subcontractor tables still exist: ${legacyFound.join(', ')}`);
  }
  if (contractorMissing.length > 0) {
    ctx.failures.push(`Contractor tables missing: ${contractorMissing.join(', ')}`);
  }

  if (legacyFound.length > 0 || contractorMissing.length > 0) {
    return {
      passed: false,
      message: `❌ Contractor naming issue: ${legacyFound.length} legacy tables, ${contractorMissing.length} missing`,
      details: [...legacyFound, ...contractorMissing],
    };
  }

  return {
    passed: true,
    message: '✅ Contractor naming verified (no legacy subcontractor tables)',
  };
}

async function checkRlsEnabled(ctx: CheckContext): Promise<VerificationResult> {
  const rlsStatus = await getRlsStatus(ctx.runSql);
  const notEnabled = RLS_REQUIRED_TABLES.filter(t => !rlsStatus.get(t));

  if (notEnabled.length > 0) {
    ctx.failures.push(`RLS not enabled on: ${notEnabled.join(', ')}`);
    return {
      passed: false,
      message: `❌ RLS not enabled on ${notEnabled.length} table(s)`,
      details: notEnabled,
    };
  }

  return {
    passed: true,
    message: `✅ RLS enabled on all ${RLS_REQUIRED_TABLES.length} Grid2 tables`,
  };
}

async function checkSeedData(ctx: CheckContext): Promise<VerificationResult> {
  // equipment_types should have seed rows (8 expected)
  const equipCount = await getRowCount(ctx.runSql, 'equipment_types');
  const issues: string[] = [];

  if (equipCount === 0) {
    ctx.failures.push('equipment_types has 0 rows — seed data missing');
    issues.push(`equipment_types: 0 rows (expected ≥1)`);
  }

  // wire_sizes: currently 0 rows — warn but do not fail
  const wireCount = await getRowCount(ctx.runSql, 'wire_sizes');
  if (wireCount === 0) {
    const msg = 'wire_sizes: 0 rows (seed data not yet applied — warning only)';
    ctx.warnings.push(msg);
    issues.push(`⚠️  ${msg}`);
  }

  if (equipCount === 0) {
    return {
      passed: false,
      message: `❌ Seed data missing for required tables`,
      details: issues,
    };
  }

  return {
    passed: true,
    warning: wireCount === 0,
    message: wireCount === 0
      ? `✅ equipment_types seeded (${equipCount} rows) ⚠️  wire_sizes empty (warning)`
      : `✅ Seed data present (equipment_types: ${equipCount}, wire_sizes: ${wireCount})`,
    details: wireCount === 0 ? issues.filter(i => i.startsWith('⚠️')) : undefined,
  };
}

async function checkTableCount(ctx: CheckContext): Promise<VerificationResult> {
  const existing = await getExistingTables(ctx.runSql);
  const count = existing.size;
  const MIN_EXPECTED = 30; // verified: 36 tables present

  if (count < MIN_EXPECTED) {
    ctx.failures.push(`Only ${count} tables found in public schema (expected ≥${MIN_EXPECTED})`);
    return {
      passed: false,
      message: `❌ Only ${count} tables in public schema (expected ≥${MIN_EXPECTED})`,
    };
  }

  return {
    passed: true,
    message: `✅ ${count} tables in public schema`,
  };
}

// ============================================================================
// Environment validation
// ============================================================================

function getConfig(): { projectRef: string; accessToken: string } | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  let ok = true;
  if (!supabaseUrl) {
    console.error('❌ Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    ok = false;
  }
  if (!accessToken) {
    console.error('❌ Missing environment variable: SUPABASE_ACCESS_TOKEN');
    ok = false;
  }
  if (!ok) return null;

  // Extract project ref from URL: https://<ref>.supabase.co
  const projectRef = supabaseUrl!.replace('https://', '').split('.')[0];
  if (!projectRef) {
    console.error('❌ Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL');
    return null;
  }

  return { projectRef, accessToken: accessToken! };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<number> {
  console.log('🔍 Grid2 → Central Command Schema Verification');
  console.log('='.repeat(52));

  const config = getConfig();
  if (!config) {
    console.error('\n❌ SCHEMA CHECK FAILED: Missing required environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ACCESS_TOKEN');
    return 1;
  }

  const runSql = buildSqlRunner(config.projectRef, config.accessToken);
  const ctx: CheckContext = { runSql, failures: [], warnings: [] };

  const results: VerificationResult[] = [];

  console.log(`\n📡 Project: ${config.projectRef}`);
  console.log('📋 Running checks...\n');

  try {
    results.push(await checkTableCount(ctx));
    results.push(await checkCoreTables(ctx));
    results.push(await checkGrid2Tables(ctx));
    results.push(await checkCeoRole(ctx));
    results.push(await checkContractorNaming(ctx));
    results.push(await checkRlsEnabled(ctx));
    results.push(await checkSeedData(ctx));
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    return 1;
  }

  // Print results
  console.log('📊 Results:');
  console.log('-'.repeat(52));

  for (const result of results) {
    console.log(result.message);
    if (result.details && result.details.length > 0) {
      for (const detail of result.details.slice(0, 10)) {
        console.log(`   - ${detail}`);
      }
      if (result.details.length > 10) {
        console.log(`   ... and ${result.details.length - 10} more`);
      }
    }
  }

  const allPassed = results.every(r => r.passed);

  // Print warnings if any
  if (ctx.warnings.length > 0) {
    console.log('\n⚠️  Warnings (non-blocking):');
    for (const w of ctx.warnings) {
      console.log(`  • ${w}`);
    }
  }

  console.log('\n' + '='.repeat(52));

  if (allPassed) {
    console.log('✅ SCHEMA OK');
    return 0;
  } else {
    console.log('❌ SCHEMA CHECK FAILED');
    console.log('\nFailures:');
    for (const failure of ctx.failures) {
      console.log(`  • ${failure}`);
    }
    return 1;
  }
}

// Run
main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
