# Grid2 → Central Command Migration Execution Plan

**Date**: 2026-06-30  
**Author**: Perses (Long-Horizon Orchestrator)  
**Status**: **PLAN ONLY** — No execution performed.  
**Goal**: Execute **Path B** — apply Grid2’s mature 84% UI (storm theme, OCR, GPS workflows, PWA offline stack, storm events, full reporting) onto Central Command’s live Supabase backend (`xcvacmreerrypygpritq`).

---

## 1. Goal

Replace Central Command’s immature frontend (31% complete, ~20 screens) with Grid2’s production-ready frontend (84% complete, 52+ screens) while preserving Central Command’s operational Supabase project and `.env` credentials.

**Success Criteria**:
- All Grid2 pages render correctly against CC’s Supabase.
- No console errors on major flows (auth, onboarding, ticket list, admin dashboard).
- Storm theme + PWA offline behavior fully functional.
- Build passes (`npm run build`).
- No accidental use of Grid2’s dead Supabase project (`bsiuuibnjccjkmgktfce`).

---

## 2. Current Context & Assumptions

### Known State
- **Grid2** (source of truth for UI): `~/Grid2/` — 84% complete, uses `src/` root, `@supabase/ssr`, Atten font, 750-line storm theme globals.css, 16 migrations (including CEO role, storm events, OCR templates, full inventory).
- **Central Command** (target): `~/Desktop/Central Command/` — 31% complete, uses root-level files, `@supabase/supabase-js`, Geist font, 331-line basic globals.css, 13 migrations, live Supabase ref `xcvacmreerrypygpritq`.
- Schema divergence is **severe** (role enums, `contractors` vs `subcontractors`, missing `must_reset_password`, missing `storm_events`, missing OCR tables).
- User preference: Use **Pi Agent** (RPC mode) as primary coding engine + Hermes sub-agents for parallel validation/research. Hermes remains the orchestrator.

### Key Assumptions
- Path C (recovering Grid2’s Supabase dashboard) will be attempted first by the user and will fail or be inconclusive.
- We have explicit user approval before any destructive action (`supabase db reset`).
- Pi binary is installed and `ANTHROPIC_API_KEY` is available.
- No meaningful production data exists in CC’s current Supabase that cannot be re-seeded.

---

## 3. Proposed Approach — Hierarchical Plan-Execute with Parallel Streams

Use **Pattern B (Hierarchical Plan-Execute)** from `execution-patterns`:
1. Decompose into 6 phases.
2. Within each phase, identify independent workstreams and dispatch them **in parallel** (Pi batches + Hermes `delegate_task` batches).
3. Verify every deliverable with `verification-before-completion`.
4. Run `milestone-review` + `grounding-check` at every phase boundary.

**Parallelism Strategy**:
- Database work (Phase 2) is **fully serial** (schema must exist before any UI can query it).
- Source migration (Phase 3) and config merge (Phase 4) have **multiple independent sub-tasks** that can run concurrently (different directories, different files).
- Build error triage (Phase 5) benefits from parallel sub-agents investigating different error clusters.

---

## 4. Detailed Phase Plan with Parallel Opportunities

### Phase 0 — Path C Attempt (User Action, ~5–15 min)
**Owner**: User (not delegated)  
**Goal**: Attempt to recover Grid2’s original Supabase project (`bsiuuibnjccjkmgktfce`).

**Tasks**:
- T0.1: Visit https://supabase.com/dashboard and attempt password reset for the account that owns Grid2.
- T0.2: If project is paused → unpause and verify connectivity.
- T0.3: If dashboard access succeeds → stop here (no migration needed).

**Parallelism**: None (user action).  
**Exit Criteria**: User reports Path C result.

---

### Phase 1 — Backup & Pre-flight (Serial, ~15–25 min)
**Owner**: Hermes (orchestrator) with Pi for git work  
**Goal**: Protect CC’s current state before any destructive changes.

**Tasks** (all **serial** — each depends on previous):
- T1.1: Create dedicated migration git branch: `git checkout -b feat/grid2-cc-migration`
- T1.2: Backup current `.env` to `~/Desktop/Perses/cc-env-backup-YYYYMMDD.env`
- T1.3: Run `npx supabase db dump --linked --file ~/Desktop/Perses/cc-db-backup-YYYYMMDD.sql`
- T1.4: Copy CC’s current `supabase/migrations/` to `~/Desktop/Perses/cc-migrations-backup/`
- T1.5: Verify `.env` contains `xcvacmreerrypygpritq` (never Grid2’s ref)
- T1.6: Load all required skills (`plan-decomposition`, `supabase-database-operations`, `pi-agent`, etc.)
- T1.7: Update `todo` list with Phase 2 tasks

**Parallelism**: None (sequential safety steps).  
**Files changed**: Git branch only.  
**Validation**: `git status`, dump file exists and is non-empty, `.env` check passes.

---

### Phase 2 — Database Migration (Serial → Sub-tasks can parallelize after reset)
**Owner**: Hermes + Pi (for verification scripts)  
**Goal**: Replace CC’s schema with Grid2’s full 16-migration chain.

**Critical Path (serial)**:
- T2.1: Copy all 16 Grid2 migration files into CC’s `supabase/migrations/` (preserve timestamps)
- T2.2: Overwrite `types/database.ts` with Grid2’s version
- T2.3: **Destructive step** (requires explicit user confirmation): `npx supabase db reset --linked`
- T2.4: `npx supabase db push --linked` (apply Grid2’s 16 migrations)

**Parallel verification tasks** (run immediately after T2.4):
- T2.5a: Sub-agent verifies tables exist (`storm_events`, `contractors`, `ticket_templates`, `inventory_items`, `profiles` has `must_reset_password` and `CEO` role)
- T2.5b: Sub-agent checks RLS policies are attached
- T2.5c: Sub-agent confirms seed data (82 inventory items, 24 wire sizes, 8 equipment types)
- T2.5d: Pi writes a quick verification script `scripts/verify-grid2-schema.ts` and runs it

**Parallelism**: After the reset/push, 4 verification tasks run in parallel (Hermes sub-agents + Pi).  
**Files changed**: `supabase/migrations/*`, `types/database.ts`, new verification script.  
**Risk**: Data loss — mitigated by T1.3 backup.

**Exit Criteria**: All 4 verification tasks report success + `verification-before-completion` passes.

---

### Phase 3 — Source Migration (Highly Parallelizable)
**Owner**: Pi Agent (primary) + Hermes sub-agents for review

**Goal**: Bring Grid2’s `src/` tree into CC’s root-level structure and resolve the `@/*` path alias change.

**Independent Workstreams** (can be dispatched in **parallel batches**):

#### Workstream 3A — App / Routes (Pi)
- T3A.1: Copy `Grid2/src/app/` → `Central Command/app/` (merge root layout carefully — do not overwrite)
- T3A.2: Update all imports from `@/components/...` → `@/components/...` (no change needed here) but flatten `src/app` references

#### Workstream 3B — Components (Pi)
- T3B.1: Copy `Grid2/src/components/` → `Central Command/components/`
- T3B.2: Flatten any internal `src/` import paths

#### Workstream 3C — Lib / Utils (Pi)
- T3C.1: Copy `Grid2/src/lib/` → `Central Command/lib/` (merge, do not overwrite CC’s `supabase/` clients yet)
- T3C.2: Update internal path aliases

#### Workstream 3D — Stores + Hooks + Types (Pi + Sub-agent)
- T3D.1: Copy `Grid2/src/stores/` → `Central Command/stores/`
- T3D.2: Copy `Grid2/src/hooks/` (if exists) → `Central Command/hooks/`
- T3D.3: Merge `Grid2/src/types/` into `Central Command/types/` (database.ts already replaced in Phase 2)

#### Workstream 3E — Public Assets & PWA (Pi)
- T3E.1: Copy Grid2’s `public/sw.js` and any service worker registration files
- T3E.2: Verify `public/` static assets (logos, icons) are not duplicated

**Parallelism**: 5 independent workstreams dispatched simultaneously via:
- One Pi RPC call per workstream (or batch if Pi supports multiple prompts)
- Hermes `delegate_task` for verification of each workstream

**Files changed**: Hundreds across `app/`, `components/`, `lib/`, `stores/`, `types/`.  
**Validation**: After all workstreams, run `npx tsc --noEmit` (type check) in parallel with directory diff reports.

---

### Phase 4 — Configuration Merge (Highly Parallelizable)
**Owner**: Pi + Hermes sub-agents

**Independent Workstreams**:

#### Workstream 4A — package.json (Pi — high risk)
- T4A.1: Merge dependencies (keep CC’s newer versions of Next 16, Zod 4, @supabase/ssr 0.8, etc.)
- T4A.2: Add Grid2-only packages (`@playwright/test`, `@vitest/ui`, `eslint-config-next`, etc.)
- T4A.3: Reconcile version conflicts (Zod 3→4, Tailwind Merge 2→3, etc.)

#### Workstream 4B — Layout & Providers (Pi)
- T4B.1: Replace CC’s root `layout.tsx` font imports with Atten Extra Bold
- T4B.2: Inject `ServiceWorkerProvider`, `SyncProvider`, `OfflineBanner` from Grid2
- T4B.3: Keep CC’s `Agentation` (v3.0.2) placement

#### Workstream 4C — Styling (Pi)
- T4C.1: Replace `app/globals.css` entirely with Grid2’s 753-line storm theme version
- T4C.2: Update any component-specific CSS that referenced old variables

#### Workstream 4D — Supabase Clients (Pi)
- T4D.1: Replace CC’s `lib/supabase/client.ts` and `server.ts` with Grid2’s `@supabase/ssr` versions
- T4D.2: Add Grid2’s `middleware.ts` and `admin.ts` if missing

#### Workstream 4E — Next.js / TS Config (Hermes sub-agent)
- T4E.1: Merge `next.config.ts` (Grid2’s webpack cache fix vs CC’s minimal config)
- T4E.2: Update `tsconfig.json` path alias from `@/* → ./src/*` → keep CC’s root alias or adopt `src/` structure
- T4E.3: Copy `components.json` and `postcss.config.mjs` if differences exist

**Parallelism**: 5 workstreams dispatched in parallel (Pi handles the high-risk ones; Hermes sub-agents handle config diffing).

**Files changed**: `package.json`, `app/layout.tsx`, `app/globals.css`, `lib/supabase/*`, `next.config.ts`, `tsconfig.json`.

**Validation**:
- `npm install` (after merge)
- `npx tsc --noEmit`
- Spot-check 3–4 pages render in dev mode

---

### Phase 5 — Build, Test & Fix (Parallel Triage)
**Owner**: Pi (primary fixer) + multiple Hermes sub-agents (error investigation)

**Goal**: Reach a clean `npm run build`.

**Strategy**:
1. Run `npm run build` once.
2. Cluster errors into independent groups (e.g., import path errors, Zod API breaks, Next 15→16 breaks, missing env vars, Tailwind class issues).
3. Dispatch **parallel sub-agents** to investigate each cluster:
   - Sub-agent A: Fix all `@/src/...` import paths
   - Sub-agent B: Fix Zod v4 API usage in Grid2 components
   - Sub-agent C: Update any deprecated Next.js APIs
   - Sub-agent D: Resolve Tailwind class name conflicts
4. Pi applies fixes across files.
5. Re-run build until clean.

**Parallelism**: 4–6 sub-agents working on different error categories simultaneously.

**Validation**: `npm run build` succeeds with zero errors/warnings. `verification-before-completion` passes.

---

### Phase 6 — Cleanup, Documentation & Archive (Mostly Serial)
**Owner**: Hermes + Pi for final commit

**Tasks**:
- T6.1: Remove any Grid2 `.env.local` references or dead Supabase URLs
- T6.2: Update `AGENTS.md` (both projects) to reflect unified codebase
- T6.3: Write ADR documenting schema swap decision and data loss
- T6.4: Commit with message: `feat: migrate Grid2 UI onto Central Command backend (Path B)`
- T6.5: Archive Grid2 repo (`mv ~/Grid2 ~/Grid2-archive-2026-06-30`)
- T6.6: Final grounding check + user demo

**Parallelism**: Low (mostly cleanup). T6.3 (ADR) can be written while T6.1/T6.2 run.

---

## 5. Files Likely to Change (High-Level)

| Category | Files | Estimated Count |
|----------|-------|-----------------|
| Database | `supabase/migrations/*` (Grid2’s 16 files), `types/database.ts` | ~17 |
| Source (Phase 3) | `app/**`, `components/**`, `lib/**`, `stores/**`, `types/**` | 300+ |
| Config | `package.json`, `app/layout.tsx`, `app/globals.css`, `lib/supabase/*`, `next.config.ts`, `tsconfig.json` | 8–12 |
| New | `scripts/verify-grid2-schema.ts`, ADRs, updated `AGENTS.md` | 3–5 |

**Total estimated files touched**: 320–350.

---

## 6. Validation & Testing Strategy

| Stage | Command / Check | Owner |
|-------|------------------|-------|
| After Phase 2 | `npx supabase db diff --linked` + verification script | Hermes sub-agents |
| After Phase 3 | `npx tsc --noEmit` | Pi |
| After Phase 4 | `npm install && npx tsc --noEmit` | Pi |
| After Phase 5 | `npm run build` (zero errors) | Pi + sub-agents |
| Final | Manual smoke test: login → onboarding → ticket list → admin dashboard → offline mode | User + Hermes |
| Post-merge | `git diff --stat` review | Hermes |

---

## 7. Risks, Tradeoffs & Open Questions

### High Risks
- **R1**: `supabase db reset` destroys any existing CC data (mitigated by backup in Phase 1)
- **R2**: Next.js 15 → 16 + Zod 3 → 4 breaking changes may require significant code changes
- **R3**: 300+ import path fixes are error-prone (mitigated by parallel sub-agents + systematic search/replace)

### Tradeoffs
- **Parallel speed vs safety**: More parallel work = faster completion but higher chance of merge conflicts in `package.json` / `layout.tsx`.
- **Pi vs Hermes sub-agents**: Pi writes code; Hermes sub-agents only investigate — reduces risk of Pi hallucinating fixes.

### Open Questions (to be answered before execution)
1. Has the user attempted Path C and what was the outcome?
2. Is there any production data in CC’s current Supabase that must be preserved?
3. Preferred git workflow: single migration branch or feature branches per phase?
4. Should we adopt Grid2’s `src/` directory structure in CC, or flatten everything to root level?

---

## 8. Recommended First Action After Plan Approval

1. User confirms Path C result.
2. If Path C fails → Load `grid2-cc-migration` skill + core orchestration skills.
3. Execute **Phase 1** tasks in order (Hermes-led).
4. After Phase 1 backup complete → Begin Phase 2 (database migration).

---

**Plan saved to**: `.hermes/plans/2026-06-30_213000-grid2-cc-migration-plan.md`

**Next step (when user is ready)**: Say “Execute Phase 1” or “Begin Path B” and I will load the necessary skills and start the first `todo` list.