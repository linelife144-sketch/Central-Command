# Grid2 → Central Command Migration Execution Plan — v2 (Framework-Aligned)

**Date**: 2026-06-30
**Author**: Perses (Long-Horizon Orchestrator)
**Version**: 2.0 — restructured into the long-horizon milestone/checkpoint framework
**Supersedes**: `2026-06-30_213000-grid2-cc-migration-plan.md` (v1 — kept for reference)
**Status**: **PLAN ONLY** — No execution performed.
**Pattern**: Hierarchical Plan-Execute (Pattern B) with parallel workstreams; Search-Based (Pattern C) reserved for M5 build triage.

---

## §0 — What Changed in v2 (Changelog)

v1 was a solid phase plan. v2 makes it **executable under the long-horizon framework** by adding the machinery that prevents divergence over a 320+ file, multi-session, destructive migration:

1. **Phases → Milestones (M0–M6).** Each milestone now has a single **verifiable deliverable** (a gate you can prove is met), not just a bag of tasks.
2. **Formal Checkpoints (CP-0 … CP-6).** Every milestone boundary is now an explicit **GO / HOLD / ABORT gate** with: verification commands + expected output, a grounding sub-agent, the `milestone-review` checklist, and a **rollback trigger**. You cannot cross a checkpoint on vibes.
3. **Task right-sizing.** v1's mega-tasks ("fix all Zod v4 usage", "merge layout carefully") are broken into atomic, 2–10 min, independently-verifiable units with **explicit exit criteria** each.
4. **Opaque-milestone honesty.** Per the `plan-decomposition` waterfall anti-pattern: **M0–M2 are decomposed in full detail; M3–M4 are detailed-but-provisional; M5 (build triage) is intentionally left opaque** and decomposed only *after* the first `npm run build` produces the real error set. No fake-specific tasks for errors we can't see yet.
5. **Grounding cadence.** Explicit triggers: milestone boundaries + every ~5 consecutive tool calls + on any failure + before the destructive reset.
6. **Claim gating / evidence ledger** for the one irreversible action (`supabase db reset`).
7. **Rollback & abort protocol** — a real one, tied to the Phase 1 backups.
8. **Information-folding plan** — what gets written to memory at each milestone so marathon-session context stays clean.
9. **`todo` seed array** (§12) ready to paste into the `todo` tool at execution start.

---

## §1 — Goal & Success Gates

**Goal**: Execute **Path B** — graft Grid2's production-ready 84% frontend (storm theme, OCR, GPS workflows, PWA offline stack, storm events, full reporting) onto Central Command's live Supabase backend (`xcvacmreerrypygpritq`), preserving CC's operational project and credentials.

**Donor**: Grid2 (`~/Grid2/`) — provides UI, schema migrations, config.
**Recipient**: Central Command (`~/Desktop/Central Command/`) — keeps its Supabase project, `.env`, and identity.

**Success = ALL of these gates are provably GREEN (evidence, not assertion):**

| # | Success Gate | How it is proven |
| --- | -------------- | ------------------ |
| SG1 | Grid2's 16 migrations applied to CC's Supabase | `npx supabase migration list --linked` shows all applied |
| SG2 | Schema has Grid2 tables (`storm_events`, `contractors`, OCR templates, `must_reset_password`, `CEO` role) | Verification script output |
| SG3 | Seed data present (82 inventory, 24 wire sizes, 8 equipment types) | Row-count query output |
| SG4 | Type check clean | `npx tsc --noEmit` exits 0 |
| SG5 | Production build clean | `npm run build` exits 0, zero errors |
| SG6 | No dead Supabase ref (`bsiuuibnjccjkmgktfce`) anywhere | `grep -r bsiuuibnjccjkmgktfce` returns nothing |
| SG7 | Major flows render without console errors | Manual smoke test: auth → onboarding → ticket list → admin dashboard → offline mode |
| SG8 | Storm theme + PWA offline behavior functional | Smoke test + service worker registration confirmed in devtools |

**A milestone is only "done" when its checkpoint's gate criteria (a subset of SG1–SG8) are proven.**

---

## §2 — Execution Framework Mapping

| Framework element | How this migration uses it |
| ------------------- | ---------------------------- |
| **Primary pattern** | Pattern B (Hierarchical Plan-Execute) — milestones with parallel sub-workstreams, verified at each boundary |
| **Secondary pattern** | Pattern C (Search-Based) — M5 only, to triage build-error clusters in parallel |
| **Coding engine** | Pi Agent (RPC) writes code; Hermes sub-agents investigate/verify (never both on same file simultaneously) |
| **Grounding** | Full `grounding-check` template at every CP; quick-check variant every ~5 tool calls mid-milestone |
| **Milestone review** | Full `milestone-review` checklist at every CP before GO |
| **Verification** | `verification-before-completion` — every task's exit criterion is a tool-output artifact |
| **Claim gating** | Evidence ledger enforced at CP-2 (the destructive reset) — §9 |
| **Info folding** | Memory summary written at each CP; detailed history dropped — §11 |
| **Parallelism cap** | ≤3 concurrent sub-agents per batch (delegation.max_concurrent_children) |

---

## §3 — Milestone Map (High-Level)

```dart
M0  Path C Attempt (user gate)          — CP-0: migrate or abort-entirely
M1  Backup & Pre-flight (serial)        — CP-1: recoverability proven
M2  Database Migration (serial+parallel)— CP-2: schema+seed verified  ⚠️ DESTRUCTIVE
M3  Source Migration (parallel×5)       — CP-3: tsc --noEmit clean
M4  Configuration Merge (parallel×5)    — CP-4: npm install + tsc clean
M5  Build, Test & Fix (parallel triage) — CP-5: npm run build clean   [OPAQUE until entered]
M6  Cleanup, Docs & Archive (serial)    — CP-6: SG1–SG8 all green, user demo
```

**Decomposition depth (waterfall discipline):**

- **M0–M2**: fully decomposed below (we know exactly what these look like).
- **M3–M4**: decomposed to workstream + atomic-task level, but treated as **provisional** — re-confirm task list against actual `~/Grid2/src/` tree contents at milestone entry.
- **M5**: **INTENTIONALLY OPAQUE.** Only a meta-procedure is given. Real tasks are created *after* the first build run reveals the error clusters. Do not pre-invent Zod/Next/Tailwind fix tasks.

---

## §4 — Detailed Milestones

> **Task ID convention**: `T<milestone>.<n>` (e.g. T1.3). **Exit criterion** = the verifiable proof the task is done. **Every task must produce tool output that satisfies its exit criterion before being marked complete.**

---

### M0 — Path C Attempt (User Gate, ~5–15 min)

**Deliverable**: A definitive decision — migrate (Path B) or stand down (Path C succeeded, no migration needed).
**Owner**: User (not delegated).

| Task | Action | Exit criterion |
|------|--------|----------------|
| T0.1 | User attempts password reset for the account owning Grid2 at supabase.com/dashboard | User reports success/failure |
| T0.2 | If project paused → unpause, verify connectivity | Project shows "Active" |
| T0.3 | If dashboard access succeeds → STOP, no migration | User confirms Grid2 backend reachable |

#### ✅ CP-0 — Path Decision Gate

- **Verification**: User states Path C outcome explicitly.
- **Grounding**: none (user decision).
- **Gate decision**:
  - Path C **SUCCEEDED** → **ABORT MIGRATION** (Grid2 backend recovered; no Path B needed). Update memory, close plan.
  - Path C **FAILED / inconclusive** → **GO** to M1.
- **Rollback trigger**: n/a (nothing changed yet).

---

### M1 — Backup & Pre-flight (Serial, ~15–25 min)

**Deliverable**: CC's current state is fully recoverable — a proven ability to restore `.env`, DB, and migrations if the migration fails.
**Owner**: Hermes orchestrator (Pi for git).

| Task | Action | Exit criterion |
| ------ | -------- | ---------------- |
| T1.1 | `git checkout -b feat/grid2-cc-migration` | `git branch --show-current` = `feat/grid2-cc-migration` |
| T1.2 | Copy `.env` → `~/Desktop/Perses/cc-env-backup-20260630.env` | Backup file exists, non-empty, contains `xcvacmreerrypygpritq` |
| T1.3 | `npx supabase db dump --linked --file ~/Desktop/Perses/cc-db-backup-20260630.sql` | Dump file exists, size > 0 bytes, contains `CREATE TABLE` |
| T1.4 | Copy CC's `supabase/migrations/` → `~/Desktop/Perses/cc-migrations-backup/` | Backup dir contains all 13 CC migration files |
| T1.5 | Verify `.env` `NEXT_PUBLIC_SUPABASE_URL` = `https://xcvacmreerrypygpritq.supabase.co` (no `/rest/v1/` suffix, never Grid2's ref) | grep confirms exact URL |
| T1.6 | Confirm Pi binary installed + `ANTHROPIC_API_KEY` present | `pi --version` succeeds; env var set |
| T1.7 | `git add -A && git commit -m "chore: pre-migration checkpoint"` on the branch | `git log -1` shows the checkpoint commit |

**Parallelism**: none (sequential safety steps — each is a prerequisite for trusting the next).

#### ✅ CP-1 — Recoverability Gate

- **Verification (all must pass)**:
  - `test -s ~/Desktop/Perses/cc-db-backup-20260630.sql && echo OK` → `OK`
  - `test -s ~/Desktop/Perses/cc-env-backup-20260630.env && echo OK` → `OK`
  - `ls ~/Desktop/Perses/cc-migrations-backup/*.sql | wc -l` → 13
  - `git branch --show-current` → `feat/grid2-cc-migration`
- **Grounding**: Quick-check variant — "Are all backups proven restorable before I touch the DB?"
- **Milestone-review**: run checklist §1–§2 (task completion + integration — trivially clean here).
- **Gate decision**: **GO** only if ALL four verifications pass. Any failure → **HOLD**, fix, re-verify.
- **Rollback trigger**: n/a (nothing destructive yet). This checkpoint EXISTS to guarantee rollback is *possible* from CP-2 onward.

---

### M2 — Database Migration (Serial → parallel verify) ⚠️ DESTRUCTIVE

**Deliverable**: CC's Supabase project runs Grid2's full 16-migration schema with seed data intact.
**Owner**: Hermes + Pi (verification scripts).

**Critical path (strictly serial):**

| Task | Action | Exit criterion |
| ------ | -------- | ---------------- |
| T2.1 | Copy all 16 Grid2 migration files → CC's `supabase/migrations/` (preserve timestamps) | `ls supabase/migrations/*.sql \| wc -l` reflects Grid2's 16 |
| T2.2 | Overwrite `types/database.ts` with Grid2's version | File diff shows Grid2 tables/enums present |
| T2.3 | **⚠️ EVIDENCE-GATED DESTRUCTIVE STEP** — see §9 before running. Requires explicit user "yes". `npx supabase db reset --linked` | Command exits 0; reset confirmed |
| T2.4 | `npx supabase db push --linked` | `npx supabase migration list --linked` shows all 16 applied |

**Parallel verification batch (dispatch immediately after T2.4 — ≤3 at a time, so 2 waves):**

| Task | Sub-agent goal | Exit criterion |
| ------ | ---------------- | ---------------- |
| T2.5a | Verify core tables exist (`storm_events`, `contractors`, `ticket_templates`, `inventory_items`; `profiles` has `must_reset_password` + `CEO` role) | Sub-agent returns table/column presence proof |
| T2.5b | Verify RLS policies attached to all new tables | Policy-count query > 0 per table |
| T2.5c | Verify seed data (82 inventory, 24 wire sizes, 8 equipment types) | Row-count query matches |
| T2.5d | Pi writes + runs `scripts/verify-grid2-schema.ts` | Script exits 0, prints "SCHEMA OK" |

#### ✅ CP-2 — Schema & Seed Gate (the point of no easy return)

- **Verification**: all four T2.5* sub-agents report success + T2.5d script prints `SCHEMA OK`.
- **Grounding**: **FULL** `grounding-check` template — this is the highest-risk boundary. Verify: schema matches Grid2, seed correct, no dead ref, `.env` untouched.
- **Milestone-review**: full checklist, all sections.
- **Gate decision**:
  - **GO** → M3, only if SG1+SG2+SG3 proven.
  - **HOLD** → if a table/seed is missing, re-run push or fix migration, re-verify.
  - **ABORT** → if reset corrupted the project irrecoverably: execute §8 rollback (restore from `cc-db-backup-20260630.sql`).
- **Rollback trigger**: reset fails midway, migrations error out unrecoverably, OR grounding returns ADRIFT on schema integrity. Rollback = restore CC DB from the T1.3 dump.

---

### M3 — Source Migration (Parallel ×5) — *provisional, re-confirm at entry*

**Deliverable**: Grid2's `src/` tree lives in CC's structure and `npx tsc --noEmit` is the only remaining gate (type-level, not runtime).
**Owner**: Pi (primary) + Hermes sub-agents (per-workstream verification).
**Decomposition note**: Re-list files against actual `~/Grid2/src/` contents at M3 entry before dispatching — the task list below is provisional.

**Import-path strategy decision (make BEFORE copying — §7 open question 4):** commit to *one* of {adopt Grid2's `src/` layout in CC} OR {flatten to CC root + keep `@/*` alias}. Do not copy files until this is decided; mixing strategies mid-copy causes the 300-file import breakage.

**5 independent workstreams (dispatch in parallel; each writes to disjoint directories):**

- **WS-3A — App/Routes (Pi)**: T3A.1 copy `Grid2/src/app/` → `app/` (merge root `layout.tsx`, never blind-overwrite). T3A.2 reconcile route-group structure. *Exit: `app/` tree present, no duplicate route conflicts.*
- **WS-3B — Components (Pi)**: T3B.1 copy `Grid2/src/components/` → `components/`. T3B.2 flatten internal `src/` import paths per chosen strategy. *Exit: `components/` present, no `@/src/` imports remain.*
- **WS-3C — Lib/Utils (Pi)**: T3C.1 copy `Grid2/src/lib/` → `lib/` (do NOT overwrite CC's supabase clients — those are M4). T3C.2 update path aliases. *Exit: `lib/` merged, supabase clients untouched.*
- **WS-3D — Stores/Hooks/Types (Pi + sub-agent)**: T3D.1 copy `stores/`. T3D.2 copy `hooks/` (if exists). T3D.3 merge `types/` (database.ts already replaced in M2 — do not clobber). *Exit: dirs present, `types/database.ts` still = Grid2's.*
- **WS-3E — Public/PWA (Pi)**: T3E.1 copy `sw.js` + SW registration files. T3E.2 dedupe static assets. *Exit: `public/sw.js` present, no duplicate logos/icons.*

**Parallelism**: 5 workstreams simultaneously (disjoint dirs = safe to parallelize). Hermes `delegate_task` verifies each after Pi writes.

#### ✅ CP-3 — Type-Integrity Gate

- **Verification**: `npx tsc --noEmit` exits 0 (SG4). `grep -r "@/src/" .` returns nothing. `git diff --stat` reviewed for surprises.
- **Grounding**: FULL template — confirm no source was overwritten that shouldn't be (root layout, supabase clients, database.ts).
- **Milestone-review**: full checklist. Watch scope-creep flag (>20% unplanned tasks).
- **Gate decision**: **GO** if `tsc --noEmit` = 0. **HOLD** if type errors remain (may bleed into M4 — acceptable to carry a documented list forward only if they're config-dependent).
- **Rollback trigger**: source copy overwrote a critical file → `git checkout` the file from the CP-1 commit.

---

### M4 — Configuration Merge (Parallel ×5) — *provisional, re-confirm at entry*

**Deliverable**: `npm install` succeeds and `npx tsc --noEmit` stays clean with merged deps + configs.
**Owner**: Pi (high-risk merges) + Hermes sub-agents (config diffing).

**5 independent workstreams:**

- **WS-4A — package.json (Pi, HIGH RISK)**: T4A.1 keep CC's newer versions (Next 16, Zod 4, @supabase/ssr 0.8) as baseline. T4A.2 add Grid2-only packages (`@playwright/test`, `@vitest/ui`, `eslint-config-next`, etc.). T4A.3 reconcile MAJOR version conflicts (Zod 3→4, Tailwind Merge 2→3). *Exit: valid JSON, `npm install` succeeds.*
- **WS-4B — Layout/Providers (Pi)**: T4B.1 swap fonts → Atten Extra Bold. T4B.2 inject `ServiceWorkerProvider`, `SyncProvider`, `OfflineBanner`. T4B.3 preserve CC's `Agentation` v3.0.2 dev-only placement. *Exit: layout compiles, providers nested correctly.*
- **WS-4C — Styling (Pi)**: T4C.1 replace `app/globals.css` with Grid2's 753-line storm theme. T4C.2 fix component CSS referencing old vars. *Exit: globals.css = storm theme, no undefined-var references.*
- **WS-4D — Supabase Clients (Pi)**: T4D.1 replace `lib/supabase/client.ts` + `server.ts` with Grid2's `@supabase/ssr` versions. T4D.2 add `middleware.ts` + `admin.ts` if missing. **CRITICAL: point at CC's `xcvacmreerrypygpritq`, URL without `/rest/v1/` suffix (known PGRST125 trap).** *Exit: clients use CC ref, `@supabase/ssr` pattern.*
- **WS-4E — Next/TS Config (Hermes sub-agent)**: T4E.1 merge `next.config.ts` (Grid2 webpack cache fix). T4E.2 finalize `tsconfig.json` path alias per M3 strategy decision. T4E.3 copy `components.json` + `postcss.config.mjs` diffs. *Exit: configs valid, alias consistent with M3.*

**Parallelism**: 5 workstreams (Pi takes 4A/4B/4C/4D; sub-agent takes 4E). Note 4A + 4B + 4D all touch app-critical wiring — sequence 4A (package.json) *first*, then 4B/4C/4D/4E in parallel, since installs must resolve before layout imports validate.

#### ✅ CP-4 — Config-Integrity Gate

- **Verification**: `npm install` exits 0. `npx tsc --noEmit` exits 0. Spot-check 3–4 pages render in `npm run dev` (login, ticket list, admin, one storm view). `.env` still CC's ref (SG6 partial).
- **Grounding**: FULL template — verify no Grid2 dead-ref crept into supabase clients, `.env` untouched, version reconciliation sound.
- **Milestone-review**: full checklist.
- **Gate decision**: **GO** to M5 if install + tsc clean and dev pages render. **HOLD** if install fails (dep conflict) or dev pages error.
- **Rollback trigger**: package.json merge unrecoverable → `git checkout package.json package-lock.json` from CP-3 state, re-merge.

---

### M5 — Build, Test & Fix (Parallel Triage) — 🔲 **OPAQUE UNTIL ENTERED**

**Deliverable**: `npm run build` exits 0 with zero errors/warnings (SG5).
**Owner**: Pi (fixer) + multiple Hermes sub-agents (Pattern C error investigation).

**Why opaque**: The actual errors (Next 15→16 breaks, Zod 3→4 API changes, Tailwind class conflicts, import edge cases) are **unknowable until the first build runs**. Per the waterfall anti-pattern, inventing specific fix-tasks now is fiction. Instead, follow this **meta-procedure**, then decompose into real tasks:

```dart
M5 META-PROCEDURE (Pattern C — Search-Based):
  1. Run `npm run build` ONCE. Capture full error output.
  2. CLUSTER errors into independent categories (import paths / Zod v4 /
     Next 16 API / Tailwind / missing env / type mismatches).
  3. CREATE real todo tasks T5.x — one per cluster — NOW (not before).
  4. Dispatch ≤3 parallel sub-agents per wave, one investigating each cluster,
     each returning a precise fix plan with file:line evidence.
  5. Pi applies fixes cluster-by-cluster.
  6. Re-run build. Repeat 2–5 until clean.
  7. Grounding check every ~5 fix-cycles OR if the same error survives 3 fixes
     (architecture-question trigger — do not attempt fix #4 blindly).
```

**Anti-pattern guard**: If a cluster resists 3 fix attempts → STOP, spawn grounding sub-agent, question the approach (per Error-Correction rules). Do not brute-force fix #4.

#### ✅ CP-5 — Build Gate

- **Verification**: `npm run build` exits 0, zero errors, zero warnings (SG5). `grep -r bsiuuibnjccjkmgktfce` returns nothing (SG6).
- **Grounding**: FULL template — confirm fixes addressed root causes, not symptoms; no `@ts-ignore`/`any` band-aids left behind.
- **Milestone-review**: full checklist. Explicit scope-creep audit (build fixes tend to sprawl).
- **Gate decision**: **GO** to M6 only when build is genuinely clean. **HOLD** otherwise — loop meta-procedure.
- **Rollback trigger**: build reveals the migration approach is fundamentally broken (e.g. Next 16 + Grid2 architecture incompatible) → escalate to user with evidence before any further work.

---

### M6 — Cleanup, Documentation & Archive (Serial)

**Deliverable**: A committed, documented, demo-ready unified codebase; Grid2 archived; all SG1–SG8 green.
**Owner**: Hermes + Pi (final commit).

| Task | Action | Exit criterion |
| ------ | -------- | ---------------- |
| T6.1 | Remove any Grid2 `.env.local` refs / dead Supabase URLs | `grep -r bsiuuibnjccjkmgktfce` = nothing (SG6) |
| T6.2 | Update `AGENTS.md` (both projects) to reflect unified codebase | AGENTS.md describes single codebase |
| T6.3 | Write ADR documenting schema swap + data-loss decision | `docs/adr/NNNN-grid2-cc-migration.md` exists |
| T6.4 | `git commit -m "feat: migrate Grid2 UI onto Central Command backend (Path B)"` | `git log -1` shows commit |
| T6.5 | Archive Grid2: `mv ~/Grid2 ~/Grid2-archive-2026-06-30` | Old path gone, archive path exists |
| T6.6 | Final grounding check + user smoke-test demo | SG7 + SG8 confirmed by user |

**Parallelism**: low. T6.3 (ADR) may be drafted by a sub-agent while T6.1/T6.2 run.

#### ✅ CP-6 — Completion Gate (Final)

- **Verification**: **ALL of SG1–SG8 proven green** (see §1 table). Full manual smoke test passes.
- **Grounding**: FULL template — comprehensive, "is the goal actually achieved?"
- **Milestone-review**: full checklist + lessons-learned capture.
- **Gate decision**: **DONE** only when every success gate has tool/user evidence. Otherwise loop back to the failing milestone.
- **Rollback trigger**: n/a (if we're here, the build is clean; issues are demo-fixable).

---

## §5 — Checkpoint Reference Table (consolidated)

| CP | Gate name | Hard verification | Grounding | GO requires | Rollback action |
| ---- | ----------- | ------------------- | ----------- | ------------- | ----------------- |
| CP-0 | Path decision | User states outcome | none | Path C failed | — |
| CP-1 | Recoverability | DB dump + env + migrations backed up, branch created | quick | 4/4 backups verified | — (enables later rollback) |
| CP-2 | Schema & seed ⚠️ | 4 verify sub-agents + script `SCHEMA OK` | **FULL** | SG1+SG2+SG3 | restore DB from T1.3 dump |
| CP-3 | Type integrity | `tsc --noEmit`=0, no `@/src/` | **FULL** | SG4 | `git checkout` overwritten files |
| CP-4 | Config integrity | `npm install`=0, `tsc`=0, dev pages render | **FULL** | install+tsc clean | `git checkout` package.json+lock |
| CP-5 | Build | `npm run build`=0, no dead ref | **FULL** | SG5+SG6 | escalate to user w/ evidence |
| CP-6 | Completion | ALL SG1–SG8 + smoke test | **FULL** | everything green | — |

**Hard rule**: No milestone may be marked complete, and no next milestone may begin, until its checkpoint returns **GO**. A grounding **ADRIFT** verdict at any CP = STOP, re-align, do not cross.

---

## §6 — Grounding Cadence

| Trigger | When | Template |
| --------- | ------ | ---------- |
| Milestone boundary | Every CP-1…CP-6 | FULL (`grounding-check`) — except CP-1 (quick) |
| Every ~5 tool calls | Mid-milestone, especially M3/M5 | Quick-check variant |
| Before destructive reset (T2.3) | Once | FULL + evidence ledger (§9) |
| On any unexpected failure | Immediately | FULL |
| Same error survives 3 fixes (M5) | Immediately | FULL — question architecture |
| Session resume | Start of any resumed session | FULL (per `session-resume-protocol`) |

---

## §7 — Open Questions to Resolve BEFORE Execution

These must be answered at M0/M1 entry — several are decomposition-blocking:

1. **Path C outcome?** (Gates the entire plan at CP-0.)
2. **Any production data in CC's Supabase that must survive the reset?** (Changes whether CP-2 needs a data-migration sub-step, not just a schema reset.)
3. **Git workflow**: single `feat/grid2-cc-migration` branch (plan default) or feature-branch-per-milestone? (Affects M1 + M6.)
4. **Directory structure**: adopt Grid2's `src/` layout in CC, or flatten to CC root with `@/*` alias? **BLOCKING for M3** — must be decided before any file copy (mixing strategies breaks 300+ imports).

---

## §8 — Rollback & Abort Protocol

Because M2 is destructive, rollback must be real and rehearsed:

**Full DB restore (from CP-2 ABORT):**

```
1. npx supabase db reset --linked        # clean slate
2. psql "$CC_DB_URL" < ~/Desktop/Perses/cc-db-backup-20260630.sql   # restore
   (or: npx supabase db push using ~/Desktop/Perses/cc-migrations-backup/)
3. Verify with row counts vs pre-migration snapshot
```

**Source/config rollback (CP-3/CP-4 ABORT):**

```dart
git checkout <path> from the CP-1 checkpoint commit, OR
git reset --hard <cp1-commit-sha> to abandon the whole branch
```

**Env safety (always):** `.env` is never edited by the migration. If it ever is, restore from `cc-env-backup-20260630.env`.

**Abort escalation (CP-5):** If the build proves the approach is architecturally unsound, STOP, present evidence to David, do not brute-force. Path A (graft-and-rewrite) remains a fallback.

---

## §9 — Claim Gating / Evidence Ledger (for T2.3 — the irreversible reset)

Before running `npx supabase db reset --linked`, the following claims MUST be classified **GROUNDED** (verified), not assumed:

| Claim | Required evidence | Classification gate |
| ------- | ------------------- | --------------------- |
| "The linked project is CC (`xcvacmreerrypygpritq`), NOT Grid2's dead ref" | `npx supabase projects list` / `.env` grep shows CC ref | Must be GROUNDED |
| "A restorable DB backup exists" | CP-1 verified `cc-db-backup-20260630.sql` non-empty w/ `CREATE TABLE` | Must be GROUNDED |
| "No irreplaceable production data will be lost" | User answered §7-Q2 explicitly | Must be GROUNDED |
| "User has given explicit go-ahead for the reset" | User said "yes, run the reset" in-session | Must be GROUNDED |

**Rule**: If ANY row is still ASSUMPTION or UNKNOWN, do NOT run T2.3. Resolve it first. This is the one action with no cheap undo.

---

## §10 — Information Folding Plan (Marathon Hygiene)

At each checkpoint, write a compact memory summary and let detailed history fold away:

| After | Memory entry to write |
| ------- | ---------------------- |
| CP-1 | "M1 done: backups at ~/Desktop/Perses/cc-*-20260630.*, branch feat/grid2-cc-migration." |
| CP-2 | "M2 done: Grid2 16 migrations applied to CC Supabase, seed verified. Decision: reset executed with backup." |
| CP-3 | "M3 done: src/ tree grafted, import strategy = <chosen>. tsc clean." |
| CP-4 | "M4 done: configs merged, storm theme + PWA providers in, supabase clients on CC ref." |
| CP-5 | "M5 done: build clean. Key fix clusters: <list>." |
| CP-6 | "Migration complete. SG1–SG8 green. Grid2 archived." |

Do NOT store transient state (task-by-task progress) in memory — that's `todo`'s job.

---

## §11 — Files Likely to Change

| Category | Files | Est. count |
| ---------- | ------- | ----------- |
| Database | Grid2's 16 migrations, `types/database.ts` | ~17 |
| Source (M3) | `app/**`, `components/**`, `lib/**`, `stores/**`, `types/**` | 300+ |
| Config (M4) | `package.json`, `app/layout.tsx`, `app/globals.css`, `lib/supabase/*`, `next.config.ts`, `tsconfig.json` | 8–12 |
| New | `scripts/verify-grid2-schema.ts`, ADR, updated `AGENTS.md` | 3–5 |

**Total estimated**: 320–350 files.

---

## §12 — `todo` Seed Array (paste at execution start)

```python
todo(todos=[
    # M0
    {"id": "m0",   "content": "M0: Path C attempt (user) — CP-0 decision gate", "status": "pending"},
    # M1
    {"id": "m1",   "content": "M1: Backup & pre-flight — deliverable: CC fully recoverable", "status": "pending"},
    {"id": "t1.1", "content": "T1.1 create branch feat/grid2-cc-migration", "status": "pending"},
    {"id": "t1.2", "content": "T1.2 backup .env → cc-env-backup-20260630.env", "status": "pending"},
    {"id": "t1.3", "content": "T1.3 dump DB → cc-db-backup-20260630.sql", "status": "pending"},
    {"id": "t1.4", "content": "T1.4 backup CC migrations dir", "status": "pending"},
    {"id": "t1.5", "content": "T1.5 verify .env = CC ref, no /rest/v1/ suffix", "status": "pending"},
    {"id": "t1.6", "content": "T1.6 confirm Pi + ANTHROPIC_API_KEY", "status": "pending"},
    {"id": "t1.7", "content": "T1.7 commit pre-migration checkpoint", "status": "pending"},
    {"id": "cp1",  "content": "CP-1 recoverability gate — 4/4 backups verified", "status": "pending"},
    # M2 (destructive)
    {"id": "m2",   "content": "M2: DB migration ⚠️DESTRUCTIVE — deliverable: Grid2 schema+seed on CC", "status": "pending"},
    {"id": "t2.1", "content": "T2.1 copy 16 Grid2 migrations into CC", "status": "pending"},
    {"id": "t2.2", "content": "T2.2 overwrite types/database.ts", "status": "pending"},
    {"id": "t2.3", "content": "T2.3 ⚠️ EVIDENCE-GATED reset (see §9) — needs user yes", "status": "pending"},
    {"id": "t2.4", "content": "T2.4 db push (apply 16 migrations)", "status": "pending"},
    {"id": "t2.5", "content": "T2.5 parallel verify: tables/RLS/seed/script (≤3 at a time)", "status": "pending"},
    {"id": "cp2",  "content": "CP-2 schema&seed gate — FULL grounding + SG1/2/3", "status": "pending"},
    # M3
    {"id": "m3",   "content": "M3: Source migration (parallel×5) — deliverable: tsc clean", "status": "pending"},
    {"id": "t3.0", "content": "T3.0 DECIDE import strategy (src/ vs root) BEFORE copy", "status": "pending"},
    {"id": "t3a",  "content": "WS-3A app/routes", "status": "pending"},
    {"id": "t3b",  "content": "WS-3B components", "status": "pending"},
    {"id": "t3c",  "content": "WS-3C lib/utils (leave supabase clients)", "status": "pending"},
    {"id": "t3d",  "content": "WS-3D stores/hooks/types (keep database.ts)", "status": "pending"},
    {"id": "t3e",  "content": "WS-3E public/PWA sw.js", "status": "pending"},
    {"id": "cp3",  "content": "CP-3 type-integrity gate — tsc --noEmit=0 (SG4)", "status": "pending"},
    # M4
    {"id": "m4",   "content": "M4: Config merge (parallel×5) — deliverable: install+tsc clean", "status": "pending"},
    {"id": "t4a",  "content": "WS-4A package.json merge (FIRST, high risk)", "status": "pending"},
    {"id": "t4b",  "content": "WS-4B layout/providers + fonts", "status": "pending"},
    {"id": "t4c",  "content": "WS-4C globals.css storm theme", "status": "pending"},
    {"id": "t4d",  "content": "WS-4D supabase clients → CC ref (@supabase/ssr)", "status": "pending"},
    {"id": "t4e",  "content": "WS-4E next.config + tsconfig + components.json", "status": "pending"},
    {"id": "cp4",  "content": "CP-4 config-integrity gate — install+tsc clean, dev renders", "status": "pending"},
    # M5 (opaque)
    {"id": "m5",   "content": "M5: Build/test/fix (OPAQUE — decompose after 1st build)", "status": "pending"},
    {"id": "t5.0", "content": "T5.0 run npm run build once, cluster errors, CREATE t5.x tasks", "status": "pending"},
    {"id": "cp5",  "content": "CP-5 build gate — npm run build=0, no dead ref (SG5/6)", "status": "pending"},
    # M6
    {"id": "m6",   "content": "M6: Cleanup/docs/archive — deliverable: SG1–8 green, demo", "status": "pending"},
    {"id": "t6.1", "content": "T6.1 remove dead Supabase refs", "status": "pending"},
    {"id": "t6.2", "content": "T6.2 update AGENTS.md both projects", "status": "pending"},
    {"id": "t6.3", "content": "T6.3 write ADR", "status": "pending"},
    {"id": "t6.4", "content": "T6.4 commit migration", "status": "pending"},
    {"id": "t6.5", "content": "T6.5 archive Grid2", "status": "pending"},
    {"id": "t6.6", "content": "T6.6 final grounding + user smoke demo", "status": "pending"},
    {"id": "cp6",  "content": "CP-6 completion gate — ALL SG1–8 + smoke test", "status": "pending"},
])
```

---

## §13 — Recommended First Action After Approval

1. User answers §7 open questions (esp. Q1 Path C outcome, Q2 data, Q4 dir strategy).
2. If Path C failed → load `grid2-cc-migration`, `supabase-database-operations`, `pi-agent` skills.
3. Paste §12 `todo` seed.
4. Execute **M1** in order; do not cross **CP-1** until all 4 backups verify.
5. At **CP-2**, run the §9 evidence ledger before the reset — no exceptions.

**Say "Execute M1" or "Begin Path B" when ready.**

---

**Plan saved to**: `.hermes/plans/2026-06-30_220000-grid2-cc-migration-plan-v2.md`
