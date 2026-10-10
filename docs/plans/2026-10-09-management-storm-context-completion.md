# Remaining Management Storm Context Implementation Plan

> **For coding agents:** Use the project's [executing-plans skill](../../.agents/skills/executing-plans/SKILL.md) to implement this plan task by task. Read the current brief, scope, parent execution plan and progress checklist first.

**Goal:** Complete B5's shared storm/company context across the existing Tickets, Contractors, Map, Time and Expenses dashboards and management creation/export paths, preserving every existing useful capability.

**Architecture:** Reuse the actor-owned StormContextProvider and pass explicit storm IDs to existing services. Filter on persisted ownership or the current roster revision; selection is a display/query context, never authority to reassign a saved record. Keep contractor assignment/identity isolation and existing reviewer access independent of management's storm-list permission.

**Tech stack:** Existing Next.js 16, React, TypeScript, Supabase, TanStack Query, Dexie and Vitest.

**Date/agent:** 2026-10-09, Codex /root. This document records source audit and decomposition. B5a/b implementation is recorded in the dated checkpoint below; B5c–e and connected acceptance remain pending.

**References:** [Master requirements and acceptance](2026-10-08-central-command-workflow-master-plan.md), [parent execution plan](2026-10-09-workflow-alignment-execution.md), [B4 evidence](../testing/2026-10-09-storm-manager-authority.md).

**Workspace:** Canonical Desktop checkout. Preserve existing uncommitted work. The owner's prohibition on Git operations takes precedence over skill worktree/commit defaults. Do not create another checkout, commit, remove archival files, or reset business/test rows.

## Evidence and preservation boundaries

The source audit used Graphify navigation followed by active source reads. The table records the baseline before B5a/b implementation; the dated checkpoint and status below identify completed changes. These observations do not prove authenticated runtime acceptance.

| Surface | Current evidence | Smallest required change |
|---|---|---|
| Shared context | `src/components/providers/StormContextProvider.tsx` validates actor-keyed session selection against a permitted list. `selectStorm` accepts only IDs in the current render's list. | Refresh and adopt a newly created permitted storm atomically; handle failed/denied reads without apparent empty success. |
| Shell | `src/components/common/layout/AppShell.tsx` displays shared scope on primary Dashboard, Payroll and Reports only. | Add each remaining route to the scope list only after its queries/actions are integrated. |
| Tickets | `src/app/tickets/page.tsx` mounts `TicketList`; staff uses unscoped `getTickets()`. The service already accepts `stormEventId`. | Carry scope through staff list, related reads, cache/request keys and creation links. Preserve contractor assignment reads and reviewer capabilities. |
| Contractors | `src/app/(admin)/admin/contractors/page.tsx` queries company records with an actor-only key. `contractorService.ts` counts assignee-only tickets and swallows several permission failures. | Use current storm roster membership, scoped member ticket counts and an actor/scope key; preserve the company directory, Alerts, filters, details and export. |
| Map | `src/app/(admin)/admin/map/page.tsx` reads company tickets in an effect with no scope input. | Scope markers and route inputs; cancel late reads and clear out-of-scope selection/route state. Keep maps, geofences and route controls. |
| Time | `src/components/features/time-tracking/TimeEntryList.tsx` and `timeEntryManagementService.ts` have no storm filter. Both remote/local mappers already preserve `storm_event_id`. | Add explicit filter to remote and local reads, preserve personal pending clock-out merges, and represent unavailable admin reads honestly. |
| Expenses | `ExpenseReviewList.tsx` has no storm input; `expenseProcessingService.ts` delegates to expense submission, whose remote/local list filters already support storm ID. | Pass scope through the review page/list and guard stale reads and bulk selection. Reuse existing lower-level filtering. |
| Ticket creation | `TicketForm.tsx` chooses query storm, then global `active_storm_event_id`, then a first-storm fallback. Storm creation writes that global key. | Use a validated explicit route storm or actor context for a new form. Company mode requires a deliberate storm choice. Preserve manual intake and explicit storm-bound templates. |
| Contractor expense creation | `ExpenseForm.tsx` passes optional ticket ID but no storm ownership into its create call. | Keep this as a C/F dependency: establish eligible participation and an explicit persisted storm before claiming complete write/offline alignment. |
| Detail routes | Saved ticket/shift/expense ownership exists independently of selection. | Display and act on the record's own storm; never imply another selected storm owns it or rewrite the saved owner. |

Keep existing dashboards, navigation, Alerts, search/date/status filters, utility payloads, assessments, click-driven field status actions, GPS/photo captures, review/rework, disable/restore, print, exports and offline drafts. No omission in this plan authorizes removal.

B4 adds native Storm Manager authority and explicit responsibility, while legacy management profiles remain compatible. Management is not limited to its assigned storm. A contractor pay role never grants management access. An ADMIN reviewer may have ticket/assessment access without permission to list all storms; do not gate that existing access on StormContextProvider.ready.

## Shared implementation contract

- Company-wide selection is the existing `ALL` value. An omitted service storm filter means company scope only for an authorized management caller; it does not change RLS.
- A selected storm uses persisted `storm_event_id` or a verified ticket-to-storm relationship. Roster membership comes from the latest saved roster revision; do not infer participation from assigned tickets. The live `list_storm_contractors` compensation RPC joins profiles and omits unlinked planned contractors. B5b therefore reads revision/member identities directly under the existing RLS and fresh directory/roster permissions; compensation/participation mutation integration remains C work.
- Read identity includes actor ID, selection and relevant filters. Late responses, queued refreshes and realtime callbacks must not restore data/actions from a previous actor or scope.
- Apply filters before pagination, limits, aggregation and export. Exhaust all relevant pages or chunked related-ID reads; do not silently cap totals at the Supabase row limit.
- A denied/failed required read is unavailable/error, not an empty roster, zero totals or apparent save success. A genuinely empty successful result is a separate state.
- Scope changes clear selection of bulk action IDs and map route/marker IDs. Mutation completion must refresh its originating scope, and must not repopulate the currently viewed different scope.
- A saved draft or queued operation retains the original actor and storm. Reconnect revalidates authority and ownership; changing the selector cannot move a pending record.
- Preserve server-owned rates, monetary snapshots and current personal-time review behavior. Official-time authority is implemented in E, not by relabeling existing clock records here.
- Test ordinary company mode, two storms, denied reads, delayed responses, actor switches, offline pending data and stale mutation completion separately.

## B5a — Context lifecycle and honest storm reads

**Requirements:** CC-01/CC-02; AC-01/19. Depends on B1 and B4.

**Files:**

- Modify `src/components/providers/StormContextProvider.tsx` and `src/lib/services/stormEventService.ts`.
- Extend `src/components/providers/StormContextProvider.test.tsx` and `src/lib/services/stormEventService.test.ts`.
- Integrate `src/app/(admin)/admin/storms/create/page.tsx` and its existing test.
- Modify `src/app/(admin)/admin/storms/page.tsx` and `src/components/features/storms/StormTicketStart.tsx`; add their matching `.test.tsx` files for unavailable/empty/retry and actor switch.
- Review `StormManagerControl.tsx` and the real `StormWorkspace.tsx` readback callback; extend their regression suites for a committed assignment followed by failed first/related reads and read-only retry. Keep hidden ticket counts nullable in the storm list/detail/banner; contractor context must not depend on company count reads.

1. Write failing provider tests for created storm adoption after list refresh, refresh failure, missing created storm, actor switch during refresh and a newer explicit selection during an old refresh.
2. Run `npx vitest run src/components/providers/StormContextProvider.test.tsx src/lib/services/stormEventService.test.ts`; confirm the new cases fail for the intended reason.
3. Add a bounded refresh contract, for example `refresh(options?: { selectStormId?: string }): Promise<boolean>`. Validate any requested ID against the newly fetched permitted list before persisting it. Use the existing request version/actor remount guard; do not call old `selectStorm(createdId)` immediately after a refresh and rely on a stale closure.
4. Make required management storm reads surface authentication/permission/schema failures. Retain the explicit contractor assigned-context fallback and template compatibility where still needed; failed compatibility reads are not proof of an empty company.
5. After successful atomic create, adopt the new storm through the provider and navigate. If creation committed but context refresh failed, report that the storm was created and offer context retry; do not invite duplicate creation or report the database write failed.
6. Stop writing the global `active_storm_event_id` only when all active consumers are replaced in B5d. Do not remove unrelated local storage.
7. Run provider/service/create regressions and scoped lint/types. Record code evidence separately from authenticated acceptance.

The B5a closure review found that the real workspace callback swallowed reload errors, leaving the editor's saved/readback retry unreachable. The implementation now signals failure specifically to the manager callback, retains handled initial load errors and waits for related reads before publishing the refreshed manager. Both first-read and related-read failure regressions reproduce then verify the corrected integration. Broader actor-owned detail completion remains B5d.

## B5b — Scoped service contracts and complete related reads

**Requirements:** CC-01/CC-10; AC-01/16/19. Depends on B5a's read/error contract.

**Files:**

- Modify `src/lib/services/contractorService.ts`, `ticketService.ts`, `stormEventService.ts`, and `timeEntryManagementService.ts`; extend their existing tests.
- Create `src/lib/supabase/readRows.ts` for bounded ordered pages and ID batches; extend `src/lib/services/dashboardScopeQueries.test.ts` and the existing production/local-mode adapter test.
- Inspect `src/lib/services/stormRosterService.ts`, `expenseProcessingService.ts`, `expenseSubmissionService.ts`, and `src/lib/testing/localTestStore.ts` with their existing tests.

1. Add failing two-storm/company-mode service cases, more-than-one-page cases, failed roster/profile/ticket reads, contractor identity separation, Driver/Assessor ticket counts and local pending time ownership.
2. Run `npx vitest run src/lib/services/contractorService.test.ts src/lib/services/ticketService.test.ts src/lib/services/timeEntryManagementService.test.ts src/lib/services/expenseProcessingService.test.ts` and confirm targeted failures.
3. Extend contractor list filters with `stormEventId?: string`. For selected scope, get member IDs from the latest saved revision and fetch only those identities, including planned members without tickets/accounts. Live RPC readback confirmed the existing compensation reader omits unlinked members; use direct permitted revision/member reads for the directory rather than changing that RPC in B5b. Keep the no-filter company directory behavior.
4. Avoid an import cycle: stormRosterService already imports contractorService. Use typed low-level revision/member reads in contractorService or factor a shared reader; do not import stormRosterService back into it.
5. Scope member ticket reads and count each contractor's member-linked work using both `assigned_to` and `assigned_driver_id`, deduplicated by ticket ID per member. Do not replace company crew metrics with a sum of individual member counts.
6. Paginate contractor/storm/ticket/time reads with stable ordering, including crew/team-lead/assignee queues before their existing cache writes. Use `ticket_id` for payload ordering because that relation has no `id` column. Reject malformed/null pages and missing required linked profiles. Fresh directory authority must match current contractor/payroll read permission; unavailable optional ticket counts are `null`, displayed/exported as Unavailable without denying the permitted directory.

   Paginate contractor/ticket/time reads with stable ordering. Chunk and exhaust related profile/payload/assignment reads where needed. Preserve disabled/deleted/status semantics and current ticket field mappings.
7. Add `stormEventId?: string` to TimeEntryListFilters; apply it to remote query and local entry matching using the already preserved storm ID. Preserve contractor-keyed offline cache and pending clock-out precedence. Required management reads while offline/unavailable must not fabricate empty success.
8. Reuse expense submission's existing remote/local storm filter and pagination. Check the exact review filter type reaches it; do not duplicate that query implementation.
9. Verify generated live types and current RPC permissions before changing calls. This task expects service-only changes; any needed database change requires a separately reviewed additive migration.
10. Run focused service and existing offline regression suites. Keep live/RLS acceptance open.

## B5c — Remaining management dashboard integration

**Requirements:** CC-01/CC-10; AC-01/16/18/19. Depends on B5b.

**Files:**

- Modify `src/app/tickets/page.tsx`, `src/components/features/tickets/TicketList.tsx`, and its existing test.
- Modify `src/app/(admin)/admin/contractors/page.tsx`; add `src/app/(admin)/admin/contractors/page.test.tsx`.
- Modify `src/app/(admin)/admin/map/page.tsx`; add `src/app/(admin)/admin/map/page.test.tsx`.
- Modify `src/app/(admin)/admin/time-review/page.tsx`, `src/components/features/time-tracking/TimeEntryList.tsx`, and its existing test.
- Modify `src/app/(admin)/admin/expense-review/page.tsx`, `src/components/features/expenses/ExpenseReviewList.tsx`, and its existing test.
- Modify `src/components/common/layout/AppShell.tsx` after each surface is integrated.

1. Write failing component tests proving the service sees storm A/B/company scope and a deferred A response cannot overwrite B. Include actor switching and permission-limited ADMIN reviewer access without global storm-list permission.
2. Run focused TicketList, TimeEntryList and ExpenseReviewList suites plus the newly added page tests and confirm failures.
3. Add explicit scope props only to management callers; keep contractor assignment reads and personal cache identity untouched. Make headers/data agree and retain every existing control.
4. Use an actor/selection/filter query key, for example `['contractors', profile.id, selection, filters]`. Do not show the previous scope's rows as current during loading/error.
5. Scope realtime refresh channels/callbacks and roster invalidation. Contractors needs changes to roster revisions/members as well as profiles, contractors and tickets. Remove subscriptions on actor/scope change without removing realtime behavior.
6. Clear out-of-scope map selection/route inputs and bulk-review selections. Disable obsolete actions while scope is unavailable. Preserve reviews and server-side actor checks.
7. After each route passes, include its actual path in AppShell's scope integration list. Tickets is `/tickets`, not `/admin/tickets`.
8. Keep existing time review behavior explicitly distinguished from the future official-time dashboard. Do not claim official financial reconciliation from scoped personal records.
9. Run focused tests, scoped lint and active-source types; inspect the same existing UI controls in authenticated browser acceptance when available.

## B5d — Creation defaults, details and exports

**Requirements:** CC-01/CC-05/CC-11; AC-01/16/17/18/19. Depends on B5a/c; contractor participation/expense writes also depend on C/F.

**Files:**

- Modify `src/components/features/tickets/TicketForm.tsx`; add `src/components/features/tickets/TicketForm.test.tsx`.
- Inspect `src/components/features/storms/StormTicketStart.tsx`, `TicketFormRenderer.tsx`, `src/app/tickets/[id]/page.tsx`, `src/components/common/layout/TopBar.tsx`, and `src/hooks/useCurrentStormName.ts`.
- Inspect existing Contractors/Time/Expenses export and creation callers; retain their established destinations and formats.
- Audit `src/components/features/expenses/ExpenseForm.tsx`, `src/lib/db/dexie.ts` and `src/lib/services/expenseSubmissionService.ts` for the C/F ownership handoff.

1. Write failing tests for explicit route storm, validated selected storm, company mode requiring selection, unavailable storm, preserved draft ownership, actor switch and export scope metadata.
2. Run TicketForm and existing storm-ticket-intake regressions before implementing.
3. For a new management form, prefer a permitted explicit route storm; otherwise use the validated selected storm. Company mode keeps an explicit required choice. Retain utility/template resolution and manual selection; never silently fall back to an unrelated first storm.
4. Replace the global cross-actor default consumer, then stop its writer. Preserve old saved drafts and all unrelated storage keys.
5. Verify detail route headers/links against the record's own persisted storm. Shared selection is not authority to rewrite it. If a detail is outside the current dashboard scope, label its owning storm clearly; do not display a contradictory global storm header.
6. Export the same filtered rows shown on screen with actor-authorized storm/company scope and analysis filters. Keep existing columns/Alerts/detail links and unavailable/empty distinctions.
7. Enumerate expense and participation creation gaps as explicit pending C/F tasks. Contractor expenses without a ticket still need an eligible persisted storm; company spending must not require a fabricated contractor. No automatic backfill or current-record ownership inference.
8. Verify offline queue ownership and reconnect errors after the C/F contracts land. B5 cannot be called fully accepted while these write paths remain incomplete.
9. Run creation/detail/export regressions and refresh AST Graphify after code changes.

## B5e — Connected acceptance and handoff

**Requirements:** CC-01/CC-10/CC-11; AC-01/16/17/18/19. Depends on required B5a–d and C/F write contracts.

1. Run the scoped regression suites, full `npm test`, scoped lint, repository types and an isolated production build. Preserve strict config; record archival errors without deleting files to manufacture a pass.
2. Read current live schema/RPC definitions and permissions when those interfaces changed. Distinguish local adapter tests from authenticated RLS proof.
3. In real authenticated management sessions, use storms with different utilities and linked ticket/roster/time/expense records. Switch each dashboard A → B → Company-wide and compare the same IDs, filters and exports.
4. Verify an ADMIN reviewer still reaches allowed ticket/assessment work without broader management access; verify a contractor cannot obtain company scope by pay role or UI manipulation.
5. Verify actor switch, denied read, slow response, removal of selected storm and stale action completion show honest states with no cross-scope rows.
6. Verify offline drafts/queued writes preserve originating actor/storm through scope switch and reconnect, without duplicating or applying stale authority.
7. Record completed code, local evidence, live schema/readback, browser acceptance and device/offline acceptance separately in `docs/testing/`, then update implementation_plan.md and the progress checklist with agent identifier.
8. Leave CC-01/AC-16 open until C/F ownership and E's official financial source are integrated. Continue C–I from the parent plan.

## Change impact and downstream ownership

| Changed contract | Direct dependents | Required follow-through |
|---|---|---|
| Provider refresh/adoption/error | Shell, storm create, all dashboard callers | No stale selection, false empty scope or duplicate-create prompt. |
| Contractor roster-scoped list | Contractors, assignment options, names/counts/export | Preserve company option callers; current roster semantics; both member assignments; no circular import. |
| Ticket scope/pagination | TicketList, Map, related payloads, metrics/exports | Filter before limit; utility data and field access remain coherent. |
| Time storm filter/local matching | Time review, contractor personal history, later E/F | Preserve pending clock-out data; no early official-time conversion. |
| Expense review scope | Expenses, dashboard summary, later F/G | Same persisted storm rows; pending/unavailable honest; separate settlement/cost. |
| Creation/detail ownership | Ticket intake, future participation and expenses, offline queue | Validate explicit owner; no global cross-actor fallback or silent reassignment. |
| Export/cache identity | Reports, CSV/PDF callers, realtime, reconnect | Same actor/scope/filters/records and authority checks at execution time. |

C1/C2 own storm wage defaults/overrides, allowance and mobilization/release. C3/D own operational membership and crew assignment. E owns official 16-hour days/exceptions and server calculations. F owns company expenses and reimbursement settlement. G owns final reconciled summaries/exports. H owns reviewed multi-ticket intake. I owns connected/device/launch acceptance and the separately approved reset. This plan does not collapse or complete those dependencies.

## Status — Codex /root

- [x] Audit active B5 source paths and relationships; retain downstream dependencies.
- [x] Save bounded implementation/test/acceptance tasks.
- [x] B5a context lifecycle/read errors and source review corrections implemented; local evidence in [the checkpoint](../testing/2026-10-09-management-storm-context-services.md). Authenticated acceptance remains open. — Codex /root, 2026-10-09
- [x] B5b scoped services/related pagination, field queue cache preservation and unavailable read contracts implemented; local verification is recorded separately from live acceptance. — Codex /root, 2026-10-09
- [ ] B5c remaining dashboards.
- [ ] B5d creation/detail/export contracts; C/F writes remain dependent.
- [ ] B5e connected authenticated/offline acceptance.
