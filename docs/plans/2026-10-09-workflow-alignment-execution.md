# Workflow Alignment Execution Plan

> Execute with the project's executing-plans workflow. The [master plan](2026-10-08-central-command-workflow-master-plan.md) remains the full objective; this document decomposes its first implementation batch and records the remaining dependencies.

**Evidence:** [First-batch implementation and verification](../testing/2026-10-09-workflow-alignment-batch1.md). Use its limitations when interpreting the completed code tasks below.

**Later checkpoint:** [B4 authority implementation/readback](../testing/2026-10-09-storm-manager-authority.md) records native role support, responsible-manager setup/detail and applied guards. [B5 context completion](2026-10-09-management-storm-context-completion.md) is decomposed from current source; B5a/b context/service implementation is recorded in [the checkpoint](../testing/2026-10-09-management-storm-context-services.md), while B5c–e and connected acceptance remain pending. The baseline below describes the earlier pre-B4 snapshot.

**Goal:** Align the existing application with CC-01–CC-11 without removing its established dashboards or capabilities.
**Architecture:** Shared, actor-owned storm context supplies explicit storm IDs to existing services. Management authority, participation, official time, and financial sources are subsequent coordinated workstreams, not inferred from dashboard labels.
**Tech stack:** Existing Next.js 16, React, TypeScript, Supabase, and Vitest.
**Workspace:** Canonical Desktop checkout, existing `admin` branch. No attached managed worktree exists. The owner's prohibition on Git operations takes precedence over the skill's worktree/commit defaults; preserve the current uncommitted implementation and perform no Git operations.

## Refreshed baseline — 2026-10-09, Codex /root

- Source: the primary banner independently picks an active storm, while metrics/recent tickets/expense reviews are global. Payroll has an independent storm selector; Reports has no storm input. Primary and Payroll contractor counts read the company directory.
- Database metadata: application roles remain CEO/SUPER_ADMIN/ADMIN/CONTRACTOR; no official-time tables or responsible-manager column were found. Assessment storm ownership derives through `ticket_id`. Expense reports have nullable `storm_event_id`. Existing storm roster and compensation records should be reused.
- Migration ledger: the three compensation migrations in the master baseline are applied; `20261009152535_align_owner_work_types` is newer and must be retained/reconciled before time work. This is metadata evidence, not authenticated runtime acceptance.
- Keep: current field status actions, captured evidence, alerts, layouts, permission checks, roster/compensation APIs, exports, company-wide analysis, and existing financial snapshots.

## First batch

### B1 — Shared management storm selection (CC-01; ADD/MODIFY; AC-01/19)

Files: new `src/components/providers/StormContextProvider.tsx`, new `src/components/features/storms/StormScopeSelector.tsx`, `src/app/layout.tsx`, `src/components/common/layout/AppShell.tsx`, and `src/components/features/payroll/PayrollDashboard.tsx`.

1. Write provider tests for selection across remounts, actor isolation, unavailable/removed storm, delayed reads, and contractor sessions without management reads.
2. Run the focused provider suite and confirm failures before implementing.
3. Persist only the selected storm ID/company mode in session storage keyed by authenticated profile ID. Resolve against the permitted storm list; never silently switch a missing storm to company-wide totals or select the first storm.
4. Keep one provider above route groups. Initially display the selector only on the integrated primary/Payroll/Reports dashboards; an unintegrated page must not imply that its data is scoped.
5. Make Payroll's existing selector update the shared context; retain analysis dates and all controls. Hide old data while a new scope loads; invalidate delayed requests.
6. Run the provider and Payroll suites, types, and scoped lint.

### B2 — Scoped dashboard service contracts (CC-01/10; MODIFY; AC-01/19)

Files: `src/lib/services/dashboardReportingService.ts`, `src/lib/services/dashboardTicketService.ts`, `src/lib/services/expenseSubmissionService.ts`, `src/lib/services/payrollService.ts`, and focused service tests.

1. Write regression tests for two storms, company-wide mode, scoped review counts, source-derived assessment/vehicle storm filters, filtered-before-limit recent tickets, and export scope.
2. Run and confirm failures.
3. Pass optional explicit `stormEventId` through ticket/review/report queries and expense reads. Join assessments to their tickets and vehicle claims to their shifts; preserve RLS and server-owned money.
4. Count crews by `crew_id` rather than assignee IDs. Paginate aggregate row reads so totals do not silently stop at the server row limit.
5. Attach storm/company scope to report results and exports; exclude unlinked expenses from storm-only results without reassigning them.
6. Run service regressions. Read-only live metadata verifies join relationships; authenticated API/browser proof remains a separate gate.

### B3 — Consistent primary/Payroll/Reports readback (CC-01/10; MODIFY; AC-01/16/19)

Files: primary dashboard components, `ReportsDashboard.tsx`, Payroll dashboard/review components, and focused component tests.

1. Write tests proving selected storm reaches every primary card/report request and stale responses cannot restore a previous scope.
2. Run and confirm failures.
3. Use shared selection in banner, metrics, recent tickets, Payroll, expense summary, and Reports. Read storm roster for selected-storm contractor counts. Preserve all cards/navigation/actions.
4. Mark company mode clearly. Preserve recorded-shift source until official-time work changes it; this batch cannot claim AC-08–15 or official financial reconciliation.
5. Run focused/regression tests, typecheck, scoped lint, an isolated build if tooling permits, and Graphify update.
6. Record exact evidence and outstanding authenticated/two-storm readback; do not mark full CC-01 complete while other dashboard/creation paths remain.

## Remaining work, preserved full scope

| Next task | Requirements and dependencies | Required evidence / affected boundaries |
|---|---|---|
| B4 Management authority | CC-02; follows baseline | Full Storm Manager capability compatibility across server/DB/session/navigation; pay role cannot grant access; one audited responsible manager; AC-02. |
| B5 Context completion | CC-01; B1/B2 | Tickets, Contractors, Map, Time, Expenses, creation defaults, cache/offline/export scope; AC-01/16/19 with same records. |
| C1 Setup and rate location | CC-03; B4/B5 | Move controlled rate edits to storm detail, keep Payroll reference, effective boundaries and snapshots; AC-03/13. |
| C2 Add/participation | CC-04; B4/C1 | Existing pending identity/account setup plus storm defaults/overrides/allowance and mobilization/release; AC-03/04/12. |
| C3 Operational teams/crews | CC-04; C2 | Stable team/lead/lead-driver/crew membership history, role/pair/capacity validation; separate reviewer identity; AC-05. |
| D1 Unified crew assignment | CC-05; C3/B5 | One crew operation from Tickets/Contractors; eligibility, same-storm and stale validation; AC-06/17. |
| D2 Connected field preservation | CC-06; D1/B4 | Existing forms/evidence/drafts/status/review/rework remain usable; actor authority on reconnect; AC-06/17/18. |
| E1 Official participation/time schema | CC-07; B4/C2 | Management-owned day allocations, 16-hour continuation until release, exceptions, timezone/history; AC-08/10/11/12. |
| E2 Official calculations | CC-07/08; E1/C1 | Server-authoritative snapshots, revisions, official versus personal separation and Driver allowance; AC-09/13/15. |
| F1 Payroll integration | CC-08; E2 | Individual/crew/team totals, range optional, personal observations outside money; AC-09/13/15/16. |
| F2 Storm/company expenses | CC-09; B4/B5 | Storm writes/offline/readback, payer/vendor/categories/billability, company spending without false contractor, no duplicate settlement; AC-14/16. |
| G1 Summaries/graphs | CC-10; D2/F1/F2 | Daily/cumulative costs/billing, category and crew graphs, contractor readback, counts and same-filter drill-down; AC-16/18/19. |
| G2 Billing source exports | CC-11; E2/F2 | Traceable labor/approved billable expense lines; no implication of invoice issuance/payment; AC-16. |
| H1 Reviewed batch intake | CC-05; B5/D1 | Multi-candidate/source-page review, uncertainty and duplicate-safe retries; preserve supported templates/manual intake; AC-07. |
| I1 Connected acceptance | All required workstreams | Authenticated roles, same linked records, physical evidence/private files/offline/reconnect/print; AC-01–19. |
| I2 Launch reset preparation | After I1 | Reviewable inventory/manifest/recovery/bootstrap/offline-cache runbook; execute only with separate reset approval. |
| Deferred invoice product | CC-11 DEFER | Full issuance/numbering/delivery/external integration awaits product definition; preserve existing functionality. |

Each later task must refresh its exact source/schema anchors and write a bounded test-first plan before changing its records/interfaces. The table supplies dependencies and coverage, not a claim that those tasks are ready or complete.

## Execution status

- [x] Refresh first-batch source and read-only live metadata. — Codex /root, 2026-10-09
- [x] Decompose first batch and retain CC-01–CC-11 dependency/acceptance coverage. — Codex /root, 2026-10-09
- [x] B1 shared management selection for primary Dashboard, Payroll, and Reports; provider/component regressions pass. — Codex /root, 2026-10-09
- [x] B2 scoped service contracts and aggregate pagination; mock-adapter, offline, crew-ID, and export regressions pass. Live API acceptance and later related-record bulk limits remain open. — Codex /root, 2026-10-09
- [x] B3 dashboard integration and local verification recorded: 749 tests/137 files, scoped lint, active-source diagnostic types, and Graphify pass. Full repository types/build remain blocked by archival copies. — Codex /root, 2026-10-09
- [ ] Authenticated two-storm browser/readback acceptance.
- [x] B4a–c application/database/setup-detail implementation: three migrations applied/read back, 18 isolated database groups and 772 tests/140 files pass; scoped lint/active-source types pass. — Codex /root, 2026-10-09
- [ ] B4 authenticated native-manager/RLS and genuine concurrent-transaction acceptance; CC-02 remains open.
- [x] B5 source audit and bounded task decomposition saved; preserve C/F write and E financial dependencies. — Codex /root, 2026-10-09
- [x] B5a/b context lifecycle, honest reads, scoped/paginated services and field queue cache preservation implemented; see [dated local evidence](../testing/2026-10-09-management-storm-context-services.md). — Codex /root, 2026-10-09
- [x] B5a/b review corrections and final local checkpoint: 828 tests/143 files, scoped lint, strict active-source diagnostic types and AST Graphify pass; root types retain the known 16 archival errors. — Codex /root, 2026-10-09
- [ ] B5c–e dashboard/creation/export integration and connected context acceptance; C/F writes and E official time remain dependencies.
- [ ] Remaining workstreams above; full master-plan goal remains active.
