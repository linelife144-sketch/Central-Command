# Workflow alignment — first-batch evidence

**Date:** 2026-10-09
**Agent:** Codex /root
**Workspace:** `/Users/davidmccarty/Desktop/GRID/Projects/Central Command`
**Scope:** B1–B3 in the [execution plan](../plans/2026-10-09-workflow-alignment-execution.md). The [master plan](../plans/2026-10-08-central-command-workflow-master-plan.md) remains the full objective. This entry does not close CC-01, CC-10, or connected product acceptance.

## Implemented behavior

- One actor-owned storm selection now supplies the primary Dashboard, Payroll, and Reports. Company-wide mode is explicit. Selection survives route/remount changes within the same browser session and resets when the actor changes. A missing/unavailable selected storm does not silently substitute company totals.
- The shared shell displays this selector only on those integrated dashboards. Other pages retain their current behavior until B5 connects their data. Switching scope remounts integrated dashboard content, and request versions prevent late responses from restoring the prior scope.
- Primary ticket/review counts, recent tickets, payroll and expense summaries, Reports, and the Payroll reimbursement queue receive the same storm ID. Selected-storm contractor counts use the storm roster. Assessment scope derives through its ticket; claim scope derives through its recorded shift.
- Crew metrics count stable `crew_id` values. An old individual assignment without a crew is not counted as a crew.
- Ticket/report aggregates, expense lists, and both regular and privileged recorded-payroll reads paginate beyond the API row limit. Reports and their CSV/Excel/PDF exports carry storm/company scope. Offline expense reads keep other-storm and unlinked reports out of a selected-storm list.
- Existing dashboard cards, navigation, alerts, review controls, exports, fieldwork, evidence, and financial calculations remain. No application role, official-time source, database schema, account, or business record was changed in this batch.

Payroll still reads saved personal-shift snapshots. Rate editing remains in Payroll pending C1. This is preparatory query/context alignment; it does not implement management's official 16-hour time or certify official payroll/billing reconciliation.

## Source anchors

| Boundary | Files |
|---|---|
| Actor-owned selection and shell | `src/components/providers/StormContextProvider.tsx`, `src/components/features/storms/StormScopeSelector.tsx`, `src/app/layout.tsx`, `src/components/common/layout/AppShell.tsx` |
| Primary and Reports readback | `src/components/features/dashboard/DashboardMetrics.tsx`, `DashboardRecentTickets.tsx`, `StormEventBanner.tsx`, `PayrollSummaryCard.tsx`, `ExpensesSummaryCard.tsx`, `ReportsDashboard.tsx` |
| Payroll and claim review | `src/components/features/payroll/PayrollDashboard.tsx`, `VehicleReimbursementReview.tsx` |
| Scoped/paginated I/O | `src/lib/services/dashboardReportingService.ts`, `dashboardTicketService.ts`, `ticketService.ts`, `expenseSubmissionService.ts`, `payrollService.ts`, `src/lib/db/dexie.ts` |

## Local verification

| Check | Result and limit |
|---|---|
| `npm test` | **749 tests / 137 files passed**, exit 0. Final run includes the expense/regular payroll pagination regression and privileged financial pagination regression. Log: `/private/tmp/cc-workflow-tests-final-20261009.log`. |
| Scoped ESLint on the 27 changed application/test files | **Passed**, exit 0, no warnings/errors. Log: `/private/tmp/cc-workflow-lint-final-20261009.log`. |
| Active-source diagnostic TypeScript check | **Passed**, exit 0. Temporary config extends the repository's strict configuration and excludes exactly the six known archival copies listed below; normal inputs/settings remain intact. Command: `npx tsc --noEmit --project /private/tmp/cc-workflow-active-tsconfig-20261009.json`. Log: `/private/tmp/cc-workflow-active-types-20261009.log`. This is not a passing root typecheck. |
| `npm run typecheck` | **Failed**, exit 2, 16 diagnostics in six archival files below. No diagnostic was reported in the active changed files. Log: `/private/tmp/cc-workflow-root-types-final-20261009.log`. |
| Isolated production webpack build | **Incomplete**, exit 1. Earlier batch compilation succeeded in 13.8 seconds, then the same archival errors blocked type checking. This run preceded the final pagination edits and is not final build acceptance. Command: `CC_NEXT_DIST_DIR=.next-workflow-alignment-build node node_modules/next/dist/bin/next build --webpack`. Log: `/private/tmp/cc-workflow-build-20261009.log`. The tool-added alternate build type paths were restored to normal development paths. |
| `graphify update .` | **Passed**, exit 0 after the final code/test edits. AST-only graph: 14,693 nodes, 30,705 edges, 754 communities. Log: `/private/tmp/cc-workflow-graphify-final-20261009.log`. |

The archival failures are in `src/components/features/payroll/UtilityBillingRateEditor 2.tsx`, `UtilityBillingRateEditor 3.tsx`, `src/lib/services/payrollService 2.ts`, `payrollService 3.ts`, `src/lib/utils/payroll.test 2.ts`, and `payroll.test 3.ts`. They use obsolete work-type billing shapes where current types require contractor roles. These failures were already recorded by the October 8 compensation work. No copies were deleted, no permanent exclusion was added, and shared types were not weakened to obtain a pass.

Focused regression coverage includes provider persistence/actor isolation/missing storms, company versus storm selection, two-storm source filters, joined assessment/claim predicates, crew-ID counting, filtering recent tickets before limiting, stale-response suppression, scoped exports, offline expense ownership, and datasets beyond 1,000 records. Expense/regular payroll pagination and offline scope regressions failed before their fixes and passed afterward. Privileged pagination is additionally checked for 1,001 same-storm records plus one other-storm record. The existing active-storm resolver test now mocks the Supabase client rather than requiring real credentials; its resolver assertions remain.

## Documentation verification

The brief, scope, implementation plan, master plan, execution plan, checklist, README, agent guide, documentation index, roadmap, and this evidence file were checked: **11 documents and 65 local Markdown link targets passed**. CC-01–CC-11 are covered in the master plan, scope, and execution plan; the master plan defines all AC-01–AC-19 scenarios. Historical implementation records remain under their labeled headings. Current preservation rules explicitly supersede older removal directions and individual-contractor assignment wording. The machine-readable check is saved at `/private/tmp/cc-workflow-documentation-validation-20261009.json`.

## Read-only live metadata and browser limits

Read-only Central Command metadata (`xcvacmreerrypygpritq`) confirmed the assessment-to-ticket and claim-to-time-entry foreign keys used by the joins. Application roles remain CEO/SUPER_ADMIN/ADMIN/CONTRACTOR. No management-owned official-time tables or responsible-manager column were found. Existing roster/compensation tables and the newer applied `20261009152535_align_owner_work_types` migration remain relevant to later tasks. Metadata showed two storms and three nondeleted tickets with no crew-assigned ticket; no rows were changed by this task.

The available browser session navigated to `/admin/dashboard` on the existing local server and reached `/forbidden` (Access Forbidden). No credentials or privileges were changed. This supplies no authenticated management readback, PostgREST/RLS acceptance, two-storm UI reconciliation, private upload, physical device, reconnect, print, or deployment proof. The automated database-adapter tests use a mock client and establish query construction/pagination behavior only.

## Open work and next batch

Keep the master-plan goal active. Next: B4 coordinated Storm Manager authority and responsible-manager relationship; B5 storm context across remaining dashboards, creation paths, caches/offline records, and exports. Then follow C–I dependencies for participation/rate location, operational teams/crew dispatch, official time, Payroll/company expenses, summaries/billing inputs, reviewed batch intake, and connected acceptance.

Before later financial acceptance, refresh all bulk related-record reads (including claim/name lookup limits) and live query behavior. Resolve the archival typecheck/build failures without speculative deletion. Authenticated AC-01/16/19 readback for this batch remains open. Launch reset and full invoice issuance remain separate controlled/deferred workstreams as specified by the master plan.
