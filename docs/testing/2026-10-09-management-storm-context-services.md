# B5a/b Management Storm Context and Service Reads

**Date/agent:** 2026-10-09, Codex /root; independent source reviewer /root/review_storm_manager.
**Workspace/project:** Canonical Desktop Central Command; Supabase xcvacmreerrypygpritq.
**Requirements:** CC-01/CC-02/CC-10; AC-01/16/19.
**Status:** B5a/b implementation is saved. Local verification is recorded below. B5c–e, authenticated acceptance, C/F write ownership and E official financial authority remain open. The full master-plan objective remains unfinished.

## Resulting behavior

Storm context refresh returns a verification result, can adopt a created storm from fresh permitted readback, preserves a newer explicit choice, and rejects callbacks retained after the original actor/provider unmounts. A missing requested created storm cannot be verified merely because another selected storm remains available. Failed reads keep the context unavailable until a successful retry; selecting Company-wide cannot turn a failed read into verified company data.

Creation retains the committed storm when subsequent context verification fails, with read-only retry and a link to the saved storm. It cannot submit the same creation form again after commit. Account switching cancels the former actor's form/result. The compatibility global storm writer remains until its active consumer is replaced in B5d; an optional storage failure does not turn a committed creation into a failed save.

Management storm reads verify current storm-view permission, then paginate storm choices and permitted active-ticket counts. Hidden ticket counts are null rather than zero; Storm Events and the dashboard banner display Unavailable while permitted storm selection remains usable. Full detail uses the same fresh permission-aware count contract. Contractor assigned context does not depend on unrelated company counts. Explicit query failures, malformed/null pages, permission denial and required related-read failures surface as unavailable rather than empty success or zero. Storm Events and ticket-start selection distinguish unavailable reads from a genuinely empty company, retain existing creation/navigation controls, support read retry and cancel former-actor reads.

A responsible-manager assignment returns its authoritative saved result without an ancillary ticket-count read that could misreport a committed write as failed. The manager editor reports saved-but-unavailable readback separately and retries only the read. Its real StormWorkspace callback now propagates manager readback failure while ordinary initial loads retain their handled error state. The workspace publishes the refreshed storm only after its related reads succeed, preserving the saved retry state if those reads fail. Regressions cover failures in both the first storm read and the following ticket read, successful read recovery and one mutation across the retry.

Ticket lists apply storm or existing field-assignment filters before pagination. Crew, reviewer Team Lead and assignee/Driver queues retain their existing offline filters and cache writes after complete remote reads. Related utility payload IDs are bounded batches; payload ordering uses ticket_id because ticket_payloads has no id column. Disabled/deleted list behavior and field status actions remain unchanged.

Contractor company mode retains the company directory. Selected-storm mode uses the latest saved roster revision, including planned contractors without Auth profiles and without tickets; old revisions and REMOVED members do not define current membership. Current contractor/payroll read permission is verified, with roster permission additionally required for storm mode. Profile/assignment reads paginate and use bounded IDs. Driver and Assessor counts deduplicate tickets per person; no crew metric is replaced by a sum of member counts. Optional hidden ticket counts are null, displayed/exported as Unavailable; hidden history is also unavailable. Legitimate unlinked identities remain visible, while missing required linked profiles are unavailable rather than falsely inactive.

Recorded time applies storm filters remotely and to local personal entries. Remote labels and vehicle claims are complete beyond the API row limit. Management reads require a connection and current time/payroll read permission. The explicit contractor personal path retains its existing own-row RLS, contractor-keyed cache and pending clock-out precedence. These remain personal recorded shifts, not the future official 16-hour management allocations.

## Live contract audit and justified plan adjustment

Read-only MCP queries confirmed get_my_permissions returns the current JSON permission map and is executable by authenticated callers. They also confirmed list_storm_contractors returns one JSON array, uses the latest revision, and joins profiles. That profile join excludes planned unlinked contractors; a mock of the RPC cannot prove those members would appear live.

B5b therefore uses the existing permitted revision/member tables for directory identity selection, verifying assignments.view and contractor/payroll visibility before accepting rows. Current policies retain management permission checks and restrictive reviewer/worker boundaries. No function, schema, grant, policy, account or business record was changed. The compensation RPC remains intact; compensation/participation mutation integration and related pending-member setup are C dependencies.

Generated live types confirmed payloads use ticket_id and have no id column. The shared pagination helper accepts the actual relation key, uses 500-row pages and 100-ID batches, and rejects unsuccessful/malformed pages without returning prior pages as a complete result.

Metadata inspection is not authenticated RLS acceptance. No new role/session, two-storm browser workflow, live personal cache, device capture, reconnect or export acceptance is claimed.

## Implementation anchors

- [Provider](../../src/components/providers/StormContextProvider.tsx) and its regression suite: actor lifetime, verified selection/adoption, late responses and storage identity.
- [Storm service](../../src/lib/services/stormEventService.ts), [creation](../../src/app/(admin)/admin/storms/create/page.tsx), [Storm Events](../../src/app/(admin)/admin/storms/page.tsx), and [ticket start](../../src/components/features/storms/StormTicketStart.tsx): honest reads, saved creation recovery and actor cancellation.
- [Manager editor](../../src/components/features/storms/StormManagerControl.tsx), [storm workspace](../../src/components/features/storms/StormWorkspace.tsx) and its integration regressions: committed assignment versus unavailable readback, read-only retry and handled initial load failures. [Dashboard banner](../../src/components/features/dashboard/StormEventBanner.tsx): hidden counts render Unavailable.
- [Bounded read helper](../../src/lib/supabase/readRows.ts), [ticket service](../../src/lib/services/ticketService.ts), [contractor service](../../src/lib/services/contractorService.ts), and [recorded time service](../../src/lib/services/timeEntryManagementService.ts): explicit scope, complete pages/related IDs and unavailable states.
- [Query-adapter regressions](../../src/lib/services/dashboardScopeQueries.test.ts): two storms/company, 1,001+ rows, latest roster/planned members, both crew assignments, failed/null later pages, schema-aware payload ordering, permission denial and required profiles.
- [Contractor detail](../../src/app/(admin)/admin/contractors/[id]/page.tsx) and its new regression suite: hidden versus verified empty ticket history. Company directory/CSV likewise renders nullable counts as Unavailable.

## Local verification

Focused storm context/provider/create/caller tests passed 43/43; focused service/field/cache tests later passed 90/90. After history/time-permission corrections, their focused suites passed 37/37. The final twelve-file focused checkpoint passed 123/123. The real workspace readback correction then passed 39/39 across workspace/editor/storm-service suites, after both readback failure cases reproduced the defect. Each newly fixed behavior was reproduced in a failing regression before its correction. Early test-harness errors were corrected before treating failures as product evidence.

Earlier full serial runs passed 817 tests / 142 files, then 820 / 143, then 825 / 143 before the final workspace correction. Final full-suite results, lint/types and AST Graphify are recorded in the completion checkpoint below. The first earlier full run was interrupted after source/test changes; it is not final acceptance evidence.

Repository typecheck reports the existing 16 errors in six archival payroll copies. Strict active-source diagnostic types and scoped lint are checked separately. The production build was not repeated in this service batch: the known strict repository type gate remains, and prior B4 compilation evidence is historical. No archival files were removed and no strictness was weakened.

Session logs include /private/tmp/cc-b5a-review-red-20261009.log, cc-b5a-page-red-20261009.log, cc-b5b-roster-contract-red-20261009.log, cc-b5b-payload-order-red-20261009.log, cc-b5b-missing-data-red-20261009.log, cc-b5b-field-pages-red-20261009.log, cc-b5b-directory-permissions-red-20261009.log, cc-b5b-final-permission-history-red-20261009.log, cc-b5-storm-count-commit-red-20261009.log, cc-b5-storm-detail-count-red-20261009.log, cc-b5-workspace-readback-red-20261009.log, cc-b5-workspace-readback-green-20261009.log and cc-b5-checkpoint-focused-final-20261009.log. Final verification logs are named in the completion checkpoint. These temporary logs are session evidence; this document is the durable summary.

## Completion checkpoint — 2026-10-09, Codex /root

| Check | Observed result | Practical limit |
|---|---|---|
| Final full serial regressions | `npm test -- --maxWorkers=1 --reporter=verbose`: exit 0, 828 tests / 143 files, 107.75 seconds after the final workspace correction. | Existing Vite config and unrelated React test warnings remain; this is local regression evidence. |
| Focused context/services/callers | 123 tests / 12 files pass; final real-workspace readback correction passes 39 tests / 3 files. | Adapter/component evidence, not signed-in browser acceptance. |
| Scoped lint | All 26 changed source/test files pass: 24-file batch plus the final workspace pair. | Scoped lint, not a claim about unrelated files. |
| Strict active-source diagnostic types | Exit 0 using the temporary diagnostic config, retaining strictness and excluding the six known archival payroll copies in addition to existing project exclusions. | Does not replace repository typecheck or production build. |
| Repository typecheck | Exit 2: the same 16 errors across UtilityBillingRateEditor 2/3, payrollService 2/3 and payroll.test 2/3. | Build gate remains; copies were preserved. |
| AST Graphify update | Exit 0 after the final workspace correction; 14,776 nodes / 30,939 edges / 767 communities. | Code graph refreshed; no semantic document extraction or API call. |
| Independent source review | Reviewer confirmed count visibility, committed-save handling and actual workspace retry corrections; no further actionable B5a/b regression reported. | Reviewer inspected source; did not independently execute tests or perform live acceptance. |
| Documentation consistency | 43 local links resolve across the five current checkpoint documents; CC-01–CC-11 and AC-01–AC-19 remain in the master plan, and pending implementation stays unchecked. | Documentation checks do not certify the application. |

Verification logs: /private/tmp/cc-b5-full-suite-closure-20261009.log, cc-b5-checkpoint-focused-final-20261009.log, cc-b5-workspace-readback-green-20261009.log, cc-b5-lint-complete-20261009.log, cc-b5-workspace-lint-20261009.log, cc-b5-active-types-closure-20261009.log, cc-b5-root-types-complete-20261009.log and cc-b5-graphify-closure-20261009.log.

No live business rows, schema, permissions, accounts or financial records were changed by this batch. No Git operation or production deployment was performed. B5a/b are implementation/local-verification checkpoints; B5c–e and connected acceptance remain open.

## Remaining work

- B5c: integrate Tickets, Contractors, Map, Time and Expenses UI/query keys/realtime/action selections with shared context; add shell scope only after each surface is integrated.
- B5d: explicit validated creation defaults, owning-storm detail headers, same-scope exports and removal of the global cross-actor default after consumer replacement.
- B5e: genuine authenticated CEO/manager/reviewer/contractor isolation and same-record two-storm/company readback; offline actor/storm ownership and reconnect acceptance.
- C/F: participation, planned-member setup, storm-owned expense writes/company spending and settlement. E: management official days/exceptions and authoritative payroll/billing.
- C–I: remaining master-plan implementation and connected/device/launch acceptance; separately controlled test-data reset.

The existing dashboards, navigation, Alerts, filters, fieldwork, click-driven status actions, GPS/photo protection, assessments, review, maps, setup, offline behavior and exports are preserved. This checkpoint does not claim CC-01 or AC-16 acceptance.
