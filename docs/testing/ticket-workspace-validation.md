# Contractor Ticket work validation

Completed 2026-10-06 by Codex /root in the active Desktop Central Command checkout.

## Delivered behavior

The assigned-ticket panel now has a separate Start link beside each own open ticket. Start opens `/tickets/[id]/work`, keeping the same ticket throughout travel/arrival, utility forms, checklist/photos, notes, escalation and submission for staff review. Opening the screen itself does not change field status.

Contractor Entergy tools moved out of ticket details into this screen. The entire Clean-up and Damage assessment cards link to their independent forms. Form saves and Back navigation return to Ticket work. On-site form access retains the existing crew arrival and assessor authorization requirements.

The work screen also includes existing travel/arrival actions, the field checklist and section photos, saved/submitted assessment readback, site reference, time clock, assigned-ticket queue and Send ticket for review. Completion checks saved work, unfinished Entergy drafts and pending notes, then calls the existing assessment submission workflow. Driver, crew, GPS/photo, immutable submission and two-stage staff review gates remain in place.

## Live backend

Applied `20261006184941_ticket_workspace_notes_and_escalations.sql` to the verified Central Command Supabase project `xcvacmreerrypygpritq`. Generated the new table/RPC TypeScript definitions from that project and merged only those definitions.

`ticket_work_notes` is append-only. Authenticated callers read accessible ticket notes through RLS and write through the guarded `record_ticket_work_note` RPC. The server binds the actor to Auth identity. Stable note IDs acknowledge identical retries and reject reuse with changed content. Direct insert/update/delete and anonymous access are unavailable.

Environmental and public-safety entries flag the ticket as critical/important and generate deduplicated in-app dispatch notifications and audit records without changing field status. Notes and escalation entries have actor-scoped durable offline queues; the UI distinguishes a pending local entry from dispatch receipt. Staff ticket readback and completed-ticket reports include the saved entries.

The security advisor reported no new notes-table findings. Its pre-existing disabled leaked-password-protection Auth warning remains unchanged.

## Actual signed-in browser evidence

Used the user's existing signed-in contractor session in Chrome against `http://localhost:3000`.

- The assigned row for ticket `2026100102` showed Start, which opened the new work screen.
- Clean-up and Damage assessment cards navigated to their correct separate ticket routes. The current workflow-only ticket displayed the retained arrival requirement before form entry. Back returned to Ticket work.
- The user explicitly approved one permanent QA note. It was saved through the contractor UI, read back from live Supabase, and remained visible after reloading Ticket work with a Saved to ticket label.
- Approved note ID: `dca906d1-94bf-4f23-95ca-2d7abd241b2b`; actor profile `a4eef3ef-bd78-4754-bb79-319b1ee200ab`; ticket `f34a085b-e16c-475e-b4d9-87896d139863`; kind `NOTE`; server time `2026-10-06 19:03:07.765892+00`.
- Exact approved text: “QA verification of the ticket workspace only — not a field observation. Temporary save/readback check by Codex, 2026-10-06.” This entry remains in permanent history as approved.
- Verified 390×844 and 1201×939 responsive layouts, readable form cards and radio controls, and the environmental escalation explanation. No safety report was sent through the browser.

Screenshots: `ticket-workspace/mobile.jpg`, `ticket-workspace/desktop.jpg`, and `ticket-workspace/tools.jpg`.

## Automated and database verification

| Verification | Result |
| --- | --- |
| Full Vitest suite | 639 tests across 115 files passed |
| TypeScript | `npx tsc --noEmit` passed, including after restoring development type paths |
| Scoped ESLint | Touched routes, feature components, services and SyncProvider passed |
| Production webpack build | Compiled, typechecked and generated all 50 static pages; `/tickets/[id]/work` is included |
| Isolated migration/access checks | 15 passed; exact migration loaded in PGlite |
| Live rollback SQL | Six scenario groups passed with simulated request claims |
| Graphify | AST-only update completed; 4,700 nodes, 12,984 edges, 325 communities |

Focused application coverage includes durable offline notes, failed-send retry IDs, account changes, pending/server merge, text validation, completion through the exact linked assessment, unfinished form gates, pending escalation gates, last-minute record rechecks, driver restrictions and closed work behavior.

The live SQL transaction used a temporary cloned ticket and rolled back all changes. It verified authenticated-role save/readback/identity, matching retry, changed retry/direct-insert rejection, hazard persistence/priority/notification/audit idempotence, preserved field status, outsider denial, staff readback and anonymous denial. Before and after that transaction, counts matched: 11 audits, zero work notes, six tickets, zero notifications. The subsequently approved real UI note intentionally changes the notes count to one.

Detailed results: `ticket-work-notes-local.json`, `ticket-work-notes-live.json`; repeatable scripts: `scripts/verification/ticket-work-notes.mjs` and `scripts/verification/ticket-work-notes-live-rollback.sql`.

## Acceptance boundaries

The target ticket is explicitly marked fictional/workflow-only with no field dispatch. Its database status remains `REJECTED` (projected to Open for contractors), with no team lead, crew or driver. No travel/arrival, physical GPS/camera upload, hazard or assessment submission was attempted on that record. Existing dispatch/arrival gates require an eligible dispatched ticket before on-site form entry.

Actual Auth note persistence/readback is verified. Escalation notification/access behavior is verified by live rollback SQL with simulated claims; physical device offline reconnect, private photo upload, full contractor submission and staff approval are separate acceptance items already tracked in the project checklist. This change runs in the active localhost app with a live Supabase backend; no hosted frontend deployment or Git operation was performed.

The isolated build directory was removed after restoring the development generated-type paths. The running development output was retained.
