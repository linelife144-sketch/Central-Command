# Storm Manager Authority Implementation Plan

> Use the project's executing-plans workflow. This decomposes B4 / CC-02 / AC-02 while retaining the full workflow master plan and B5–I scope.

**Goal:** Support Storm Manager as application management authority and require one explicit responsible manager for each newly created storm.
**Architecture:** Preserve `SUPER_ADMIN` as a compatible legacy token. Verified profile authority drives app guards; an internal database role-normalization helper preserves existing policy/function contracts while new native profiles use `STORM_MANAGER`. Storm responsibility is a single indexed profile relationship, validated and audited on creation/change; it does not limit a manager's company-wide management authority.
**Tech Stack:** Existing Next.js 16, TypeScript, Supabase/Postgres, Vitest and isolated PGlite.

## Pre-activation baseline and invariants — 2026-10-09

The pre-activation live read-only definitions are saved in `supabase/workflow-role-baseline-20261009.json`. That snapshot lacked application role `STORM_MANAGER`; a pay role already used that name. Most financial/field policies call `private.active_profile_role()`, but permissions, account guards, pay agreements and trusted Auth provisioning also read raw roles. Current activation/readback is recorded in the Status section below; do not rerun applied work from this baseline. Preserve all field/GPS/photo/offline/reviewer behavior and CEO protection. Do not promote accounts, backfill managers by inference, reset rows, or impose a company-wide cap on native Storm Managers merely because each storm has one responsible manager. Existing test storms can remain visibly unconfigured until explicitly assigned; all new storms require a manager.

## B4a — Coordinated application authority (MODIFY/ADD)

Files: `src/types/index.ts`, `src/lib/auth/roleGuards.ts`, `src/lib/auth/permissionCatalog.ts`, `src/lib/auth/serverPermissions.ts`, `src/lib/supabase/middleware.ts`, `src/stores/authStore.ts`, `src/lib/provisioning/userProvisioning.ts`, and existing field/contractor/access components with direct privileged-role comparisons.

1. Add failing role-matrix tests proving native/legacy manager portal, landing, default permissions, inactive/denied overrides, and management actions; contractor/pay-role information does not confer authority.
2. Run `npx vitest run src/lib/auth/stormManagerAuthority.test.ts` and verify failure.
3. Add the native profile role to shared guards/types and provisioning aliases; replace mounted direct comparisons with shared management/admin predicates. Preserve legacy role handling and existing permission restrictions.
4. Include native manager sessions in middleware/provider/server regressions. Run focused auth/field/contractor tests and scoped lint/types.

## B4b — Database compatibility and responsible-manager relationship (ADD/MODIFY)

Files: CLI-created enum and authority migrations under `supabase/migrations/`; `scripts/verification/storm-manager-authority.mjs`; generated `src/types/database.ts` after activation.

1. Build isolated regression coverage using actual inspected helper definitions, authenticated role/RLS, management permissions and audit data. Assert native/legacy/CEO compatibility, contractor pay-role isolation, required manager, eligibility, explicit reassignment, stale writes, self/CEO/last-manager protections, grants and immutable evidence boundaries.
2. Create the enum migration separately so Postgres commits the added enum value before use. Create the authority/relationship migration with explicit reviewed helper replacements; avoid broad source rewriting of unrelated functions/policies.
3. Normalize native authority to the existing internal management token only for helper contracts. Keep raw verified profile identities for the app and new audit events. Update the raw-role permission/account/Auth/pay-agreement paths explicitly. Preserve grants and harden new function execution with empty search paths and narrow authenticated entry points.
4. Add `storm_events.responsible_manager_id` referencing profiles plus its FK index. Validate an active, setup-complete manager on creation/assignment. Lock the target profile to coordinate assignment with deactivation; assigned managers must be replaced before deactivation/demotion. Audit the responsible-manager change. New creation persists storm, manager and rate card atomically.
5. Provide manager options and compare-before-update RPCs. Contractor/Admin/anonymous writes must fail. Existing null ownership is migration compatibility only, not a new-storm default.
6. Verify locally before additive live activation; read back exact definitions, column/index/permissions and unchanged business row counts, then regenerate types and run advisors. No destructive live rollback fixtures.

## B4c — Management selection in setup/detail (ADD/MODIFY)

Files: `src/lib/services/stormEventService.ts`, new manager selector/editor under `src/components/features/storms/`, `src/app/(admin)/admin/storms/create/page.tsx`, `src/components/features/storms/StormWorkspace.tsx`, local test store, service/component tests.

1. Write service/component tests for mapped manager ID, explicit creation, unavailable options, saved readback, permission visibility and stale reassignment errors.
2. Require explicit responsible manager in create; show current manager and controlled change in detail. Retain all fields/rate configuration/roster actions. Do not use the pay-role roster as the manager-options source.
3. Carry the identity through local mode and persisted readback; handle retry/read failure honestly and suppress delayed option reads.
4. Run focused tests, full `npm test`, scoped lint, strict types and production build where existing archival errors permit; refresh Graphify. Record authenticated browser acceptance separately.

## Status — Codex /root, 2026-10-09

Implementation/readback and verification are recorded in [B4 evidence](../testing/2026-10-09-storm-manager-authority.md). Live ledger versions are 20261009184240 (enum), 20261009185436 (authority), and 20261009192037 (additive lifecycle guards). A replacement-guard follow-up variant was rejected by automatic approval review and was not applied; the saved follow-up adds two narrow guards while preserving the existing authority objects. Business-row counts remain unchanged.

- [x] Refresh source/graph/live authority baseline and review CC-02 preservation/dependencies.
- [x] B4a application authority and coordinated role regressions. — Codex /root
- [x] B4b database compatibility/relationship and additive lifecycle guards applied/read back; 18 isolated groups pass. — Codex /root
- [x] B4c setup/detail integration and manager projection correction; final 772 tests/140 files, scoped lint and active-source types pass. Repository types/build remain gated by archival copies. — Codex /root
- [x] Independent source review and test-first correction of its three findings. — Codex /root, reviewer /root/review_storm_manager
- [ ] Authenticated AC-02 and two-storm same-record acceptance.
- [ ] Genuine simultaneous database transaction acceptance.
- [x] Audit/decompose remaining B5 context work in [the next plan](2026-10-09-management-storm-context-completion.md); implementation remains pending. — Codex /root
- [ ] B5 and C–I remain in the parent execution plan; full goal remains active.
