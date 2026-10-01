# Storm Event SOP Workflow + Schema Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a storm-event SOP workflow that captures Phase 1/2/3 operations as structured data, enforces canonical event naming (`YYMMDD + [Customer(3)][Utility(3)][City(3)]` with auto suffix), and scopes downstream operational/financial records under `storm_event_id`.

**Architecture:** Use a storm-event-root relational model in Supabase Postgres with config-driven customer/utility masters, trigger-backed event-code generation, and RLS-safe workflow tables. In Next.js App Router, keep reads in server components where possible and move admin mutations to Server Actions. Add a Storm Workspace route cluster for Phase 1/2/3, roster revisions, authorization logs, and document/logistics tracking.

**Tech Stack:** Next.js 15 App Router, TypeScript, React 19, Supabase Postgres, Row-Level Security, PL/pgSQL triggers/functions, Zod, Vitest, Playwright, shadcn/ui.

---

## References Reviewed (Due Diligence)
- `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`
- `/Users/davidmccarty/Desktop/Grid2/grid-electric-docs/storm_operation_procedures/Phase 1 Storm Alert  Notification (Full Procedure).md`
- `/Users/davidmccarty/Desktop/Grid2/grid-electric-docs/storm_operation_procedures/Phase 2 (Full Procedure) Mobilization Authorization & Roster Building.md`
- `/Users/davidmccarty/Desktop/Grid2/grid-electric-docs/storm_operation_procedures/📦 Phase 3  (Full Procedure) Logistics Operations.md`
- `/Users/davidmccarty/Desktop/Grid2/sql/20260214_06_create_storm_events_root_workflow.sql`
- `/Users/davidmccarty/Desktop/Grid2/sql/20260217_08_expand_storm_event_statuses.sql`
- `/Users/davidmccarty/Desktop/Grid2/sql/20260218_10_storm_event_utility_template_preload.sql`
- `/Users/davidmccarty/Desktop/Grid2/sql/20260217_09_ticket_templates_ocr_scaffold.sql`
- `/Users/davidmccarty/Desktop/Grid2/sql/02_core_tables.sql`
- `/Users/davidmccarty/Desktop/Grid2/sql/04_time_expense_tables.sql`
- `/Users/davidmccarty/Desktop/Grid2/sql/06_financial_tables.sql`
- `/Users/davidmccarty/Desktop/Grid2/sql/08_rls_policies.sql`
- `/Users/davidmccarty/Desktop/Grid2/src/lib/services/stormEventService.ts`
- `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/create/page.tsx`
- `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/page.tsx`
- `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/dashboard/page.tsx`
- `/Users/davidmccarty/Desktop/Grid2/src/app/(storm)/storms/[stormId]/tickets/new/ticket-new-client-page.tsx`
- `/Users/davidmccarty/Desktop/Grid2/src/lib/services/ticketIntakeService.ts`
- `/Users/davidmccarty/Desktop/Grid2/src/lib/services/ticketService.ts`
- `/Users/davidmccarty/Desktop/Grid2/src/types/database.ts`
- `/Users/davidmccarty/Desktop/Grid2/src/types/index.ts`
- `/Users/davidmccarty/Desktop/Grid2/src/lib/auth/authorization.ts`
- `/Users/davidmccarty/Desktop/Grid2/.agents/skills/next-best-practices/SKILL.md`

## Ratified Decisions (Locked)
- Use SOP naming: `YYMMDD + [Customer(3)][Utility(3)][City(3)]`.
- Collision handling: append `-01`, `-02`, ...
- Date segment source: storm event creation date.
- `City(3)` source: true city.
- `Customer(3)` source: canonical stored customer code.
- Persist Phase 1/2/3 as structured checklist/workflow data.
- Add structured roster model with revision history.
- Utility authorization is documented but does not gate status transitions.
- All relevant records must carry `storm_event_id` even without ticket linkage.
- Utility framework must be utility-agnostic/config-driven for future utilities.

## Implementation Suggestions
- Keep `storm_events.event_code` immutable post-create to preserve external references.
- Store canonical `customer_code`, `utility_code`, `city_code` separately from display names.
- Add explicit `storm_event_id` foreign key to operational/financial roots (`time_entries`, `expense_reports`, `contractor_invoices`) and propagate via service layer defaults.
- Use server actions for admin write operations per `/Users/davidmccarty/Desktop/Grid2/AGENTS.md` rule (`Admin portal: Server Actions`).
- Preserve contractor local-first invariants for contractor mutations (`useSyncMutation`) and avoid direct `supabase.from().insert()` in contractor UI.

## Pseudocode (Core Behavior)

```ts
// Event code generation pseudocode
function generateStormEventCode(input) {
  const date = formatYYMMDD(input.createdAt)
  const base = `${date}${input.customerCode}${input.utilityCode}${input.cityCode}`
  const existing = findCodesStartingWith(base)

  if (existing.length === 0) return base

  const nextSuffix = maxSuffix(existing) + 1
  return `${base}-${String(nextSuffix).padStart(2, '0')}`
}
```

```sql
-- Storm scoping consistency trigger pseudocode
IF NEW.ticket_id IS NOT NULL THEN
  SELECT storm_event_id INTO ticket_storm FROM tickets WHERE id = NEW.ticket_id;
  IF ticket_storm IS NULL OR ticket_storm <> NEW.storm_event_id THEN
    RAISE EXCEPTION 'storm_event_id must match linked ticket storm_event_id';
  END IF;
END IF;
```

```ts
// Phase checklist update pseudocode
async function completeChecklistStep(stormEventId, stepKey, payload) {
  assertSuperAdminOrAdmin()
  upsertStep({ stormEventId, stepKey, status: 'COMPLETE', completedAt: now(), completedBy: userId, evidence: payload })
  appendAuditLog({ entity: 'storm_event_checklist', action: 'STEP_COMPLETED' })
}
```

## Execution Ledger (Fill During Implementation)
Reference policy source: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

| Task | Status | Completed Date (YYYY-MM-DD) | Completed By Agent | Notes |
|---|---|---|---|---|
| Task 1 | TODO |  |  |  |
| Task 2 | TODO |  |  |  |
| Task 3 | TODO |  |  |  |
| Task 4 | TODO |  |  |  |
| Task 5 | TODO |  |  |  |
| Task 6 | TODO |  |  |  |
| Task 7 | TODO |  |  |  |
| Task 8 | TODO |  |  |  |
| Task 9 | TODO |  |  |  |
| Task 10 | TODO |  |  |  |
| Task 11 | TODO |  |  |  |
| Task 12 | TODO |  |  |  |
| Task 13 | TODO |  |  |  |

### Task 1: Worktree Setup + Baseline Safety Checks

**Files:**
- Modify: None
- Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Create dedicated worktree and branch**

Run:
```bash
git worktree add ../Grid2-storm-sop -b codex/storm-sop-workflow
```
Expected: New worktree created and checked out.

**Step 2: Verify clean status in new worktree**

Run:
```bash
git status --short
```
Expected: No output.

**Step 3: Run baseline checks before edits**

Run:
```bash
npm run typecheck
npm run lint
```
Expected: Pass or known pre-existing failures documented.

**Step 4: Capture baseline for regression comparison**

Run:
```bash
npm run test
```
Expected: Current baseline test result recorded in task notes.

**Step 5: Commit baseline note file (optional, if created)**

```bash
git add docs/plans/2026-02-18-storm-event-sop-workflow.md
git commit -m "chore: add storm SOP implementation plan"
```

### Task 2: Add Event Code Domain Utility (TDD First)

**Files:**
- Create: `/Users/davidmccarty/Desktop/Grid2/src/lib/storm/eventCode.ts`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/lib/storm/eventCode.test.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/lib/services/stormEventService.ts`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Write failing tests for code formatting and suffix logic**

```ts
import { buildStormEventCode, nextStormEventCode } from './eventCode'

test('buildStormEventCode produces YYMMDD+CCCUUUCCC', () => {
  expect(buildStormEventCode({ date: '2026-02-18', customerCode: 'QUA', utilityCode: 'ONC', cityCode: 'DFW' }))
    .toBe('260218QUAONCDFW')
})

test('nextStormEventCode appends -01 when base exists', () => {
  const existing = ['260218QUAONCDFW']
  expect(nextStormEventCode('260218QUAONCDFW', existing)).toBe('260218QUAONCDFW-01')
})
```

**Step 2: Run test to verify failure**

Run:
```bash
npm run test -- src/lib/storm/eventCode.test.ts
```
Expected: FAIL (module/function missing).

**Step 3: Implement minimal utility to satisfy tests**

```ts
export function buildStormEventCode(input: { date: string; customerCode: string; utilityCode: string; cityCode: string }) {
  const yymmdd = input.date.slice(2, 4) + input.date.slice(5, 7) + input.date.slice(8, 10)
  return `${yymmdd}${input.customerCode}${input.utilityCode}${input.cityCode}`
}

export function nextStormEventCode(base: string, existing: string[]) {
  const used = existing.filter((code) => code === base || code.startsWith(`${base}-`))
  if (used.length === 0) return base
  const max = Math.max(...used.map((code) => Number(code.split('-')[1] ?? '0')))
  return `${base}-${String(max + 1).padStart(2, '0')}`
}
```

**Step 4: Run test to verify pass**

Run:
```bash
npm run test -- src/lib/storm/eventCode.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/storm/eventCode.ts src/lib/storm/eventCode.test.ts src/lib/services/stormEventService.ts
git commit -m "feat: add SOP storm event code generation utility"
```

### Task 3: Schema Migration A — Customer/Utility Masters + Storm Event Code Columns

**Files:**
- Create: `/Users/davidmccarty/Desktop/Grid2/supabase/migrations/20260218010000_storm_event_sop_master_codes.sql`
- Create: `/Users/davidmccarty/Desktop/Grid2/sql/20260218_11_storm_event_sop_master_codes.sql`
- Modify: `/Users/davidmccarty/Desktop/Grid2/sql/10_seed_data.sql`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Add failing SQL assertion script (pre-migration)**

Create a temporary check query expecting missing objects.

Run:
```bash
# Use Supabase SQL editor or local migration runner
# Expect relation "customers" does not exist
```
Expected: FAIL due to missing tables.

**Step 2: Add master tables and storm_event columns**

```sql
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  customer_code char(3) NOT NULL UNIQUE CHECK (customer_code = upper(customer_code)),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.utilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  utility_code char(3) NOT NULL UNIQUE CHECK (utility_code = upper(utility_code)),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storm_events
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id),
  ADD COLUMN IF NOT EXISTS utility_id uuid REFERENCES public.utilities(id),
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS city_code char(3),
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_sequence integer NOT NULL DEFAULT 0;
```

**Step 3: Seed canonical customer/utility skeleton rows**

Include Oncor/CenterPoint/Duke/FPL/Eversource plus current known customer seeds.

**Step 4: Add indexes and uniqueness**

```sql
CREATE UNIQUE INDEX ux_storm_events_event_code ON public.storm_events (event_code);
CREATE INDEX idx_storm_events_customer ON public.storm_events (customer_id);
CREATE INDEX idx_storm_events_utility ON public.storm_events (utility_id);
```

**Step 5: Validate migration applies cleanly**

Run migration tool and confirm no SQL errors.

**Step 6: Commit**

```bash
git add supabase/migrations/20260218010000_storm_event_sop_master_codes.sql sql/20260218_11_storm_event_sop_master_codes.sql sql/10_seed_data.sql
git commit -m "feat: add customer utility masters and storm event code columns"
```

### Task 4: Schema Migration B — Triggered Event Code Generation + Collision Suffix

**Files:**
- Create: `/Users/davidmccarty/Desktop/Grid2/supabase/migrations/20260218011000_storm_event_code_trigger.sql`
- Create: `/Users/davidmccarty/Desktop/Grid2/sql/20260218_12_storm_event_code_trigger.sql`
- Modify: `/Users/davidmccarty/Desktop/Grid2/sql/20260214_06_create_storm_events_root_workflow.sql`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Write failing DB behavior check for duplicate base code**

- Insert two storms with same date/customer/utility/city.
- Expect second insert to fail before trigger implementation.

**Step 2: Implement generator function + before-insert trigger**

```sql
CREATE OR REPLACE FUNCTION public.generate_storm_event_code()
RETURNS trigger AS $$
DECLARE
  base_code text;
  next_suffix int;
BEGIN
  NEW.event_date := COALESCE(NEW.event_date, (now() AT TIME ZONE 'UTC')::date);
  base_code := to_char(NEW.event_date, 'YYMMDD') || NEW.customer_code || NEW.utility_code || NEW.city_code;

  IF NOT EXISTS (SELECT 1 FROM public.storm_events WHERE event_code = base_code) THEN
    NEW.event_code := base_code;
    RETURN NEW;
  END IF;

  SELECT COALESCE(max((regexp_match(event_code, '-([0-9]+)$'))[1]::int), 0) + 1
  INTO next_suffix
  FROM public.storm_events
  WHERE event_code = base_code OR event_code LIKE base_code || '-%';

  NEW.event_code := base_code || '-' || lpad(next_suffix::text, 2, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Step 3: Ensure `event_code` immutability post-create**

Add update trigger or policy check to reject changes to `event_code`.

**Step 4: Re-run DB behavior check**

Expected: second storm gets `-01` suffix automatically.

**Step 5: Commit**

```bash
git add supabase/migrations/20260218011000_storm_event_code_trigger.sql sql/20260218_12_storm_event_code_trigger.sql sql/20260214_06_create_storm_events_root_workflow.sql
git commit -m "feat: enforce SOP storm code generation with suffix collision handling"
```

### Task 5: Schema Migration C — SOP Workflow Tables (Phases, Checklist, Roster, Authorization, Docs, Logistics)

**Files:**
- Create: `/Users/davidmccarty/Desktop/Grid2/supabase/migrations/20260218012000_storm_sop_workflow_tables.sql`
- Create: `/Users/davidmccarty/Desktop/Grid2/sql/20260218_13_storm_sop_workflow_tables.sql`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Write failing assertions for missing workflow relations**

Expected before migration: `storm_event_phase_steps` etc do not exist.

**Step 2: Add structured workflow/checklist tables**

```sql
CREATE TABLE public.storm_event_phase_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id uuid NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  phase smallint NOT NULL CHECK (phase IN (1,2,3)),
  step_key text NOT NULL,
  step_label text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETE','N/A')),
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  UNIQUE (storm_event_id, step_key)
);
```

**Step 3: Add roster revision tables**

```sql
CREATE TABLE public.storm_event_roster_revisions (...);
CREATE TABLE public.storm_event_roster_members (...);
```

**Step 4: Add documentation + authorization + logistics skeleton tables**

```sql
CREATE TABLE public.storm_event_authorization_logs (...);
CREATE TABLE public.storm_event_documents (...);
CREATE TABLE public.storm_event_logistics_entries (...);
```

**Step 5: Add indexes and audit metadata columns**

Ensure each table has `created_at`, `updated_at`, `created_by`, `updated_by` where applicable.

**Step 6: Commit**

```bash
git add supabase/migrations/20260218012000_storm_sop_workflow_tables.sql sql/20260218_13_storm_sop_workflow_tables.sql
git commit -m "feat: add SOP structured workflow, roster, and logistics tables"
```

### Task 6: Schema Migration D — Storm Scope on Time/Expense/Invoice + Consistency Triggers

**Files:**
- Create: `/Users/davidmccarty/Desktop/Grid2/supabase/migrations/20260218013000_add_storm_scope_to_financial_ops.sql`
- Create: `/Users/davidmccarty/Desktop/Grid2/sql/20260218_14_add_storm_scope_to_financial_ops.sql`
- Modify: `/Users/davidmccarty/Desktop/Grid2/sql/04_time_expense_tables.sql`
- Modify: `/Users/davidmccarty/Desktop/Grid2/sql/06_financial_tables.sql`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Write failing checks for absent `storm_event_id` columns**

Expected: columns missing.

**Step 2: Add `storm_event_id` columns + FKs + indexes**

- `time_entries.storm_event_id`
- `expense_reports.storm_event_id`
- `contractor_invoices.storm_event_id`

**Step 3: Backfill from related ticket/invoice/report references where possible**

- Fill from `tickets.storm_event_id` when ticket linkage exists.
- Leave null temporarily for orphan historical records.

**Step 4: Add trigger to enforce ticket/storm consistency**

If `ticket_id` exists on time/expense record, enforce storm IDs match.

**Step 5: Add NOT NULL for new records only (deferred path)**

Use check constraints `NOT VALID` first; validate after backfill cleanup.

**Step 6: Commit**

```bash
git add supabase/migrations/20260218013000_add_storm_scope_to_financial_ops.sql sql/20260218_14_add_storm_scope_to_financial_ops.sql sql/04_time_expense_tables.sql sql/06_financial_tables.sql
git commit -m "feat: add storm scope to time expense and invoice records"
```

### Task 7: RLS + Access Control for New Storm Workflow Tables

**Files:**
- Create: `/Users/davidmccarty/Desktop/Grid2/supabase/migrations/20260218014000_storm_workflow_rls.sql`
- Create: `/Users/davidmccarty/Desktop/Grid2/sql/20260218_15_storm_workflow_rls.sql`
- Modify: `/Users/davidmccarty/Desktop/Grid2/sql/08_rls_policies.sql`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Write failing policy checks (non-admin cannot write)**

Expected before policy update: behavior is undefined/open depending on defaults.

**Step 2: Add policies**

- Admin/Super Admin read storm workflow tables.
- Super Admin write where required.
- Optional admin write for checklist progression if desired.

**Step 3: Keep existing storm event write constraint (`SUPER_ADMIN`) unless business changes**

No role broadening in this phase.

**Step 4: Verify RLS behavior manually with role test users**

Expected: roles respect policy boundaries.

**Step 5: Commit**

```bash
git add supabase/migrations/20260218014000_storm_workflow_rls.sql sql/20260218_15_storm_workflow_rls.sql sql/08_rls_policies.sql
git commit -m "feat: add RLS policies for storm SOP workflow tables"
```

### Task 8: Update Types + Zod Schemas for New Data Contracts

**Files:**
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/types/database.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/types/index.ts`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/lib/schemas/stormWorkflow.ts`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/lib/schemas/stormWorkflow.test.ts`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Write failing schema tests for SOP form payload validation**

Test examples:
- invalid `customer_code` length
- invalid `city_code` length
- invalid phase step status

**Step 2: Run test to verify fail**

Run:
```bash
npm run test -- src/lib/schemas/stormWorkflow.test.ts
```
Expected: FAIL.

**Step 3: Implement Zod schemas and TypeScript exports**

```ts
export const stormEventCreateSchema = z.object({
  customerId: z.string().uuid(),
  utilityId: z.string().uuid(),
  city: z.string().min(2),
  cityCode: z.string().regex(/^[A-Z]{3}$/),
})
```

**Step 4: Run tests to verify pass**

```bash
npm run test -- src/lib/schemas/stormWorkflow.test.ts
npm run typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/database.ts src/types/index.ts src/lib/schemas/stormWorkflow.ts src/lib/schemas/stormWorkflow.test.ts
git commit -m "feat: add typed storm SOP workflow schemas and contracts"
```

### Task 9: Refactor Admin Mutations to Server Actions (Next Best Practices)

**Files:**
- Create: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/actions.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/lib/services/stormEventService.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/create/page.tsx`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/page.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/actions.test.ts`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Write failing tests for create/update actions**

- Super admin can create storm event.
- Admin cannot create storm event.

**Step 2: Run test and verify fail**

```bash
npm run test -- 'src/app/(admin)/storms/actions.test.ts'
```
Expected: FAIL.

**Step 3: Implement server actions (`'use server'`) for mutations**

```ts
'use server'

export async function createStormEventAction(input: StormEventCreateInput) {
  const user = await requireUser()
  await assertRole(user, 'SUPER_ADMIN')
  const payload = stormEventCreateSchema.parse(input)
  // insert with admin client
  // return { data, error }
}
```

**Step 4: Update client pages to call action instead of direct client-supabase writes**

Preserve optimistic UX and toast behavior.

**Step 5: Run tests and typecheck**

```bash
npm run test -- 'src/app/(admin)/storms/actions.test.ts'
npm run typecheck
```
Expected: PASS.

**Step 6: Commit**

```bash
git add 'src/app/(admin)/storms/actions.ts' src/lib/services/stormEventService.ts 'src/app/(admin)/storms/create/page.tsx' 'src/app/(admin)/storms/page.tsx' 'src/app/(admin)/storms/actions.test.ts'
git commit -m "refactor: move admin storm mutations to server actions"
```

### Task 10: Build Storm Workspace Route Cluster + SOP Screens

**Files:**
- Create: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/[stormId]/page.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/[stormId]/phase-1/page.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/[stormId]/phase-2/page.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/[stormId]/phase-3/page.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/[stormId]/roster/page.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/[stormId]/documents/page.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/components/features/storms/StormWorkspaceTabs.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/components/features/storms/StormSummaryCard.tsx`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Add failing route-level render tests (if route tests exist), or snapshot tests for core components**

Expected: missing components/routes fail.

**Step 2: Implement route shell pages with async params and loading/error boundaries**

Use Next.js async params pattern:

```ts
export default async function StormWorkspacePage({ params }: { params: Promise<{ stormId: string }> }) {
  const { stormId } = await params
  // fetch summary
}
```

**Step 3: Add tabbed navigation between phase routes**

Tabs: Overview, Phase 1, Phase 2, Phase 3, Roster, Documents.

**Step 4: Wire pages to data reads (read-only first pass)**

Keep writes for Task 11.

**Step 5: Commit**

```bash
git add 'src/app/(admin)/storms/[stormId]' src/components/features/storms/StormWorkspaceTabs.tsx src/components/features/storms/StormSummaryCard.tsx
git commit -m "feat: add storm workspace routes and SOP phase screens"
```

### Task 11: Implement SOP Action Components (Checklist, Roster Revisions, Authorization Logs, Logistics)

**Files:**
- Create: `/Users/davidmccarty/Desktop/Grid2/src/components/features/storms/ChecklistBoard.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/components/features/storms/RosterRevisionTable.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/components/features/storms/AuthorizationLogForm.tsx`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/components/features/storms/LogisticsTracker.tsx`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/storms/actions.ts`
- Create: `/Users/davidmccarty/Desktop/Grid2/src/components/features/storms/stormWorkflow.test.tsx`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Write failing component tests for checklist completion and roster revision creation**

Expected: FAIL.

**Step 2: Implement checklist completion via server action**

```ts
await completeChecklistStepAction({ stormEventId, stepKey, status: 'COMPLETE', evidence })
```

**Step 3: Implement roster revision create/lock flow**

- Create revision header.
- Add rows.
- Lock revision when submitted.

**Step 4: Implement non-gating authorization log CRUD**

- Capture source (`VERBAL`, `EMAIL`, `TEXT`, `SIGNED_NTP`).
- Capture evidence URI/text.

**Step 5: Implement logistics entry skeleton CRUD**

- Travel, lodging, rental, timesheet setup tracking.

**Step 6: Run tests**

```bash
npm run test -- src/components/features/storms/stormWorkflow.test.tsx
```
Expected: PASS.

**Step 7: Commit**

```bash
git add src/components/features/storms 'src/app/(admin)/storms/actions.ts'
git commit -m "feat: add SOP checklist roster authorization and logistics workflows"
```

### Task 12: Propagate `storm_event_id` Through Services and Existing Flows

**Files:**
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/lib/services/ticketIntakeService.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/lib/services/ticketService.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/lib/services/timeEntryService.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/lib/services/expenseSubmissionService.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/lib/services/invoiceGenerationService.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/app/(admin)/dashboard/page.tsx`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Write failing service tests where `storm_event_id` missing should error**

Expected: FAIL.

**Step 2: Add required `storm_event_id` in service input contracts**

```ts
interface CreateTimeEntryInput {
  stormEventId: string
  ticketId?: string
  ...
}
```

**Step 3: Wire default active storm context in admin pages**

Use active storm from `/admin/dashboard` selection when creating downstream records.

**Step 4: Ensure ticket-linked rows validate storm consistency**

Service + DB trigger-level enforcement.

**Step 5: Run tests for touched services**

```bash
npm run test -- src/lib/services/timeEntryService.test.ts src/lib/services/expenseSubmissionService.test.ts src/lib/services/invoiceGenerationService.test.ts
```
Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/services/ticketIntakeService.ts src/lib/services/ticketService.ts src/lib/services/timeEntryService.ts src/lib/services/expenseSubmissionService.ts src/lib/services/invoiceGenerationService.ts 'src/app/(admin)/dashboard/page.tsx'
git commit -m "feat: enforce storm scope propagation across operational and financial services"
```

### Task 13: Comprehensive Test Pass (With Subtasks)

**Files:**
- Modify: `/Users/davidmccarty/Desktop/Grid2/tests/e2e/portal-flows-authenticated.spec.ts`
- Create: `/Users/davidmccarty/Desktop/Grid2/tests/e2e/storm-sop-workflow.spec.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/lib/auth/accessControl.integration.test.ts`
- Modify: `/Users/davidmccarty/Desktop/Grid2/src/lib/auth/authorization.test.ts`

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

#### Subtask 13.1: Unit + schema + service tests

**Step 1: Run focused unit tests**

```bash
npm run test -- src/lib/storm/eventCode.test.ts src/lib/schemas/stormWorkflow.test.ts
```
Expected: PASS.

**Step 2: Run service tests**

```bash
npm run test -- src/lib/services/stormEventService.test.ts src/lib/services/ticketIntakeService.test.ts
```
Expected: PASS or add missing tests until PASS.

#### Subtask 13.2: Integration/auth tests

**Step 3: Run integration tests**

```bash
npm run test:integration
```
Expected: PASS for role-based restrictions and storm workflow action access.

#### Subtask 13.3: E2E SOP workflow tests

**Step 4: Add and run e2e for storm create -> phase checklist -> roster revision -> ticket create**

```bash
npm run test:e2e -- tests/e2e/storm-sop-workflow.spec.ts
```
Expected: PASS.

#### Subtask 13.4: Full regression checks

**Step 5: Run project-level checks**

```bash
npm run lint
npm run typecheck
npm run test
```
Expected: PASS (or document unrelated pre-existing failures).

**Step 6: Commit**

```bash
git add tests/e2e/storm-sop-workflow.spec.ts tests/e2e/portal-flows-authenticated.spec.ts src/lib/auth/accessControl.integration.test.ts src/lib/auth/authorization.test.ts
git commit -m "test: add SOP workflow regression and access control coverage"
```

### Task 14: Documentation, Impact Review, and Release Notes

**Files:**
- Modify: `/Users/davidmccarty/Desktop/Grid2/grid-electric-docs/02-DATABASE-SCHEMA.md`
- Modify: `/Users/davidmccarty/Desktop/Grid2/grid-electric-docs/05-API-SPECIFICATIONS.md`
- Modify: `/Users/davidmccarty/Desktop/Grid2/grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md`
- Modify: `/Users/davidmccarty/Desktop/Grid2/grid-electric-docs/08-PROJECT-ROADMAP.md`
- Modify: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md` (only if workflow references must be updated)

**Execution Metadata (fill during implementation):**
- Completed Date: `____-__-__`
- Completed By Agent: `________`
- Agent Guide Reference: `/Users/davidmccarty/Desktop/Grid2/AGENTS.md`

**Step 1: Update schema docs to match migrations exactly**

Include new tables/columns/policies and naming rule.

**Step 2: Update API spec for new storm workflow actions/endpoints contracts**

Describe request/response shape and role constraints.

**Step 3: Update implementation checklist and roadmap status markers**

Record Phase 13 tasks touched and test coverage updates.

**Step 4: Run final sanity check**

```bash
npm run lint
npm run typecheck
```
Expected: PASS.

**Step 5: Prepare required verifier pass impact report**

Include:
- Touched files/tables/actions
- Also checked related screens/types/RLS/tests/docs
- Risks
- Backout steps

**Step 6: Commit**

```bash
git add grid-electric-docs/02-DATABASE-SCHEMA.md grid-electric-docs/05-API-SPECIFICATIONS.md grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md grid-electric-docs/08-PROJECT-ROADMAP.md AGENTS.md
git commit -m "docs: align storm SOP workflow architecture schema and test checklist"
```

## Backout Strategy
1. Revert commits in reverse order (Task 14 -> Task 1) using `git revert <sha>`.
2. Roll back Supabase migrations in reverse deployment order.
3. Disable new storm workspace routes behind a feature flag if partial rollback is required.
4. Keep historical event codes immutable; do not rewrite generated `event_code` values.

## Risk Watchlist
- Data drift between `sql/` and `supabase/migrations/`.
- Incomplete backfill for legacy rows missing `storm_event_id`.
- Role-policy mismatches after adding new workflow tables.
- UI regression if client-side services still perform writes where server actions are required.
- Utility/customer seed incompleteness causing event creation failure.

## Definition of Done
- Storm creation uses canonical SOP naming with collision suffix and immutable event code.
- Phase 1/2/3 checklist completion persists as structured DB records.
- Roster supports revisions and locked historical snapshots.
- Utility authorization records are tracked (non-gating).
- Time/expense/invoice records require and persist `storm_event_id`.
- Admin writes occur through server actions.
- Tests pass (unit/integration/e2e touched scope).
- Docs and impact report updated.
