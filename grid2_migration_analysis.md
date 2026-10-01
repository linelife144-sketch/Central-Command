# Grid2 → CC Database Migration Analysis

**Date:** July 1, 2026  
**Database:** CC Restored Supabase (24 public tables)  
**Migrations analyzed:** 16 files in `supabase/migrations/20260214*` through `20260222*`  

---

## CC Restored Schema Baseline

| Object | State |
|--------|-------|
| **Tables (24)** | `profiles`, `contractors`, `contractor_rates`, `contractor_banking`, `contractor_invoices`, `tickets`, `time_entries`, `expense_reports`, `expense_items`, `damage_assessments`, `media_assets`, `tax_1099_tracking`, `ticket_routes`, `ticket_status_history`, `audit_logs`, `equipment_assessments`, `equipment_types`, `expense_policies`, `hazard_categories`, `inventory_items`, `invoice_line_items`, `notification_logs`, `sync_queue`, `wire_sizes` |
| **`profiles` columns** | `id`, `email`, `first_name`, `last_name`, `phone`, `role`, `is_active`, `is_email_verified`, `last_login_at`, `mfa_enabled`, `mfa_secret_encrypted`, `created_at`, `updated_at`, `created_by`, `updated_by` |
| **`user_role` enum** | `SUPER_ADMIN`, `ADMIN`, `TEAM_LEAD`, `CONTRACTOR`, `READ_ONLY` |
| **`ticket_status` enum** | `DRAFT`, `ASSIGNED`, `REJECTED`, `IN_ROUTE`, `ON_SITE`, `IN_PROGRESS`, `COMPLETE`, `PENDING_REVIEW`, `APPROVED`, `NEEDS_REWORK`, `CLOSED`, `ARCHIVED`, `EXPIRED` |
| **`storm_events` table** | ❌ Does **not** exist |
| **`storm_project` table** | ❌ Does **not** exist |
| **`contractors` table** | ❌ Does **not** exist (uses `contractors`) |
| **Functions** | `is_admin()`, `update_updated_at_column()` exist |
| **Existing RLS on `profiles`** | `select_own`, `select_admin`, `update_own`, `insert_admin`, `delete_admin` |
| **Key CC-only data** | `profiles` is **empty** (no users); `jcampbell@gridelectriccorp.com` does **not** exist; Grid2 CEO/Super Admin UUIDs do **not** exist |

---

## Classification Table

| # | Migration File | Verdict | Reason / Recommendation |
|---|----------------|---------|------------------------|
| 1 | `20260214174200_rename_storm_project_to_storm_event.sql` | **SAFE** | Fully defensive (all `IF EXISTS` guards). No `storm_projects` exist in CC → **no-op**. |
| 2 | `20260214182500_allow_two_super_admins_and_promote_jeanie.sql` | **UNSAFE** | Requires `jcampbell@gridelectriccorp.com` in `profiles`. Raises `EXCEPTION` if not found. **Skip or adapt** (replace with a CC super-admin email). |
| 3 | `20260214194000_create_storm_events_root_workflow.sql` | **SAFE** | Creates `storm_events` table from scratch. All referenced objects (`profiles`, `tickets`) exist in CC. Idempotent `IF NOT EXISTS` throughout. |
| 4 | `20260215001000_fix_profiles_policy_recursion.sql` | **CONDITIONAL** | Recreates `is_admin()`, `is_super_admin()`, `current_user_role()` and **replaces all `profiles` RLS policies**. This overwrites CC's existing security model. **Review first** — the new policies are better (no recursion) but may differ from CC intent. |
| 5 | `20260217174000_expand_storm_event_statuses.sql` | **SAFE*** | Updates `storm_events.status`. Safe **if migration #3 has already created `storm_events`**. Runs as no-op if table is empty. |
| 6 | `20260217181000_ticket_templates_ocr_scaffold.sql` | **CONDITIONAL** | Creates new tables (`ticket_attachments`, `ticket_payloads`, `ticket_extraction_sessions`) — safe. Adds columns to `tickets` and a `CHECK` constraint on `utility_client` with a hard-coded allow-list. **Potential issue:** future updates to tickets with utility clients outside the list will fail. Also adds trigger referencing `storm_events` (needs #3). |
| 7 | `20260218001000_storm_event_utility_template_preload.sql` | **SAFE*** | Creates `ticket_templates`; adds `ticket_template_key` / `config_snapshot` to `storm_events`. Safe if `storm_events` exists (needs #3, #6). |
| 8 | `20260218100000_storm_event_sop_master_codes.sql` | **SAFE*** | Creates `customers` and `utilities` tables; extends `storm_events` with `customer_id`, `utility_id`, `city_code`, `event_date`, `event_sequence`. Safe if `storm_events` exists (needs #3). |
| 9 | `20260218101000_storm_event_code_trigger.sql` | **SAFE*** | Adds auto-generating/immunity triggers on `storm_events`. Safe if `storm_events`, `customers`, `utilities` exist (needs #3, #8). |
| 10 | `20260218102000_storm_sop_workflow_tables.sql` | **SAFE*** | Creates 6 new SOP workflow tables (`storm_event_phase_steps`, `roster_revisions`, `roster_members`, `authorization_logs`, `documents`, `logistics_entries`). Has **smart FK fallback**: checks for `contractors` first, falls back to `contractors`. References `storm_events` and `profiles`. |
| 11 | `20260218103000_add_storm_scope_to_financial_ops.sql` | **CONDITIONAL** | Renames `contractor_invoices` → `contractor_invoices` (guarded). Adds `storm_event_id` + FKs to `time_entries`, `expense_reports`, `contractor_invoices`. Adds cross-table consistency triggers. Modifies existing CC financial tables. **Safe if `storm_events` exists** (needs #3). |
| 12 | `20260218104000_storm_workflow_rls.sql` | **SAFE*** | RLS policies for `customers`, `utilities`, and the 6 SOP workflow tables from #10. Assumes those tables exist. |
| 13 | `20260219055000_add_ceo_enum_value.sql` | **SAFE** | Adds `'CEO'` value to `user_role` enum. Backward-compatible. **Must be committed in its own transaction** before any migration that references `CEO`. |
| 14 | `20260219060000_add_ceo_role_and_promote_profile.sql` | **CONDITIONAL** | Updates `is_admin()` and `is_super_admin()` to include `CEO` role — useful. `UPDATE profiles` for specific UUID silently no-ops (0 rows) if user doesn't exist — **not a failure**. Recreates policies on `storm_events`, `ticket_*`, `customers`, `utilities`, and SOP tables. **Requires prior migrations (#3-#12) and #13 committed first.** |
| 15 | `20260219193000_add_ceo_role_and_lock_executive_profiles.sql` | **UNSAFE** | Requires two specific Grid2 UUIDs to exist and raises `EXCEPTION` if they don't: `76f09c58-c683-43ef-b4cd-2dd8b6b21b4c` (CEO) and `eb7fa895-aabf-4048-b806-0224bd01fa84` (Super Admin). These profiles are **not in CC**. **Skip or heavily adapt** (remove the hard-coded UUID checks and the fixed-role trigger). |
| 16 | `20260222120000_rename_contractor_to_contractor.sql` | **CONDITIONAL** | Idempotent renames: `contractors`→`contractors`, `contractor_rates`→`contractor_rates`, etc., plus column renames and policy renames. Will transform CC's legacy naming to Grid2's `contractor` naming as intended. **Well-guarded**, but irreversible and CC app code may still reference `contractors`. **Ensure app references are updated first.** |

> ***Note:** SAFE* classifications assume prior numbered migrations in this list have already been applied successfully. The 16 files are timestamp-ordered and should run sequentially.

---

## Critical Issues

### 1. Migration #2 — Jeanie Campbell Promotion (UNSAFE)
```sql
WHERE lower(email) = 'jcampbell@gridelectriccorp.com'
```
- **Problem:** CC database has **no profiles at all** (empty `profiles` table). Jeanie doesn't exist.
- **Impact:** Migration raises `EXCEPTION` and aborts.
- **Fix:** Either populate Jeanie's profile first, or remove the promotion block and just keep the super-admin trigger logic.

### 2. Migration #15 — Hard-coded Executive UUIDs (UNSAFE)
```sql
WHERE id = '76f09c58-c683-43ef-b4cd-2dd8b6b21b4c'::uuid  -- CEO
WHERE id = 'eb7fa895-aabf-4048-b806-0224bd01fa84'::uuid  -- SUPER_ADMIN
```
- **Problem:** These are Grid2-specific user UUIDs. The migration **raises EXCEPTION** if they don't exist, then locks them forever with a trigger.
- **Impact:** Complete migration failure.
- **Fix:** Remove the UUID existence checks, remove the `enforce_fixed_executive_roles` trigger, and keep only the `is_admin()` / `is_super_admin()` updates.

### 3. Migration #16 — contractor → contractor Rename (CONDITIONAL)
- **Problem:** CC's entire schema uses `contractor` naming. Grid2 app expects `contractor`.
- **Impact:** This migration will rename 4 tables + columns + indexes + policies. **After this runs, any CC app code still referencing `contractor_*` will break.**
- **Fix:** Ensure all application code, API routes, type definitions, and SQL queries are updated to `contractor` before or simultaneously. The migration itself is well-written and idempotent.

### 4. Enum Transaction Trap (CEO)
- **Problem:** PostgreSQL requires enum values to be **committed** before they can be used in expressions.
- **Migration #13** adds `CEO` to `user_role`.
- **Migration #14** uses `'CEO'::public.user_role`.
- **If both run in the SAME transaction, #14 will fail.** They must be separate committed transactions (standard behavior when running migrations one-at-a-time).

---

## Suggested Execution Plan

| Step | Action |
|------|--------|
| **1.** | Run migrations **#1, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12** in order. These build the Grid2 storm/SOP schema on top of CC. |
| **2.** | Run migration **#13** (`add_ceo_enum_value`) — commit it. |
| **3.** | Run migration **#14** (`add_ceo_role_and_promote_profile`) — it will safely update functions/policies even though the CEO UUID doesn't exist. |
| **4.** | **SKIP #2** entirely, or replace with a CC-specific super-admin promotion. |
| **5.** | **SKIP #15** entirely, or replace with a stripped version that only updates `is_admin()` / `is_super_admin()` without hard-coded UUID checks. |
| **6.** | Run migration **#16** only after confirming all app code references `contractors` instead of `contractors`. |

---

## File Created
- `/Users/davidmccarty/Desktop/Central Command/grid2_migration_analysis.md` (this report)
- `/Users/davidmccarty/Desktop/Central Command/test_migrations.py` (rollback test script)

---

## Schema Testing Notes
- Used `psql` with `BEGIN … ROLLBACK` dry-run transactions to test each migration.
- Databases with self-contained `BEGIN; … COMMIT;` blocks inside migration scripts commit regardless of outer rollback, so some objects were partially created during testing. The baseline used for this report was captured **before** any test modifications.
