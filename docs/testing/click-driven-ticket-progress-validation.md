# Click-driven contractor ticket progress — 2026-10-06

## Implemented

Contractor **Start** is a shared action on the Assigned tickets row and Ticket work entry. A dispatched Assigned ticket records En Route through `record_ticket_field_action(ticket_id, 'START')` before Ticket work opens. Starting is available to the assigned driver or assessor. The assigned assessor's field checklist route records On Site before the editable checklist renders, including direct navigation. Repeats are idempotent.

The RPC checks the signed-in contractor, assignment, matching active dispatched crew and legal transition under a ticket row lock. The status-history trigger records the authenticated actor and server timestamp; the action sets an explicit reason, and GPS fields remain null. Contractor field-stage labels and filters use Assigned, En Route and On Site; admins keep their detailed review stages. Realtime and local change notifications refresh the ticket lists, detail/work views, map and contractor dashboard.

Start/checklist transitions do not request location. Open navigation stays available as its own link. Existing GPS validation for photos and time entries is unchanged. Actor-scoped offline Start/checklist actions preserve order and sync before assessment uploads; changed assignments and failures remain queued with an error instead of overwriting later server state. The legacy GPS status RPC is revoked from `anon` and `authenticated`; `authenticated` can execute the new RPC.

The user reported that the ticket-details Start entry disappeared. It is restored in the Assigned tickets row. The duplicate bottom work panel and the redundant Location & Contact card have been removed from ticket details. A signed-in contractor browser snapshot on `/tickets/f34a085b-e16c-475e-b4d9-87896d139863` shows exactly one Start link, in the Assigned tickets row; the existing Utility Ticket Details block still shows the incident address.

The Start link on current legacy ticket 2026100102 opens Ticket work as an entry point only. That record is `REJECTED` with no team lead, crew or driver; it is not eligible for the new transition and was not changed. A live query found zero dispatched Assigned tickets.

## Database rollout and checks

- Applied migration `20261006204808_click_driven_ticket_field_progress` to Central Command Supabase project `xcvacmreerrypygpritq`; the local migration filename matches the live migration ledger version.
- Merged the generated Supabase `record_ticket_field_action` function signature into `src/types/database.ts`.
- Live privilege check: `authenticated` can execute `public.record_ticket_field_action`; `anon` cannot. Neither role can execute `public.update_ticket_field_status`.
- Live target verification after migration: ticket 2026100102 remains `REJECTED`, with no team lead, crew or assigned driver.
- Supabase security advisors report the existing Auth leaked-password-protection warning. Performance advisors report broad existing unindexed foreign keys, RLS policy, unused-index and duplicate-index findings; none names the new RPC. These database-wide findings were not changed as part of this workflow.

## Verification

- Isolated PGlite ticket workflow: 49 checks pass, including driver Start, assessor checklist arrival without coordinates, actor-specific reasons, null GPS history, no duplicate history on repeat, driver checklist denial, anon denial and retirement of the GPS RPC. The runnable harness writes `docs/testing/ticket-workflow-local.json`.
- Application tests: 653 tests pass across 117 files (`npm run test -- --maxWorkers=4 --testTimeout=15000`).
- `npm run typecheck`: passed.
- Scoped ESLint across the changed frontend, service, workflow tests and generated types: passed.
- Production webpack build: `CC_NEXT_DIST_DIR=/private/tmp/cc-click-driven-ticket-progress-build-20261006 npm run build -- --webpack` compiled successfully and generated all 50 pages. The default `.next` path is a shared cache symlink whose `trace` file denied writes; temporary Next type paths added during the successful isolated build were removed from `tsconfig.json` afterward.
- `graphify update .`: passed; graph contains 20,568 nodes, 54,962 edges and 763 communities.

## Acceptance still open

No live status transition was performed because the live project currently has no dispatched Assigned ticket. Real contractor and authorized-staff readback on the same eligible ticket, GPS-denied device acceptance and offline reconnect on devices remain unverified. The signed-in browser check verifies rendered contractor UI only; it does not establish an En Route or On Site database write for ticket 2026100102.
