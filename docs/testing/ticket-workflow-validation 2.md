# Ticket-owned assessment workflow — 2026-10-06

Implemented by Codex /root in `/Users/davidmccarty/Desktop/GRID/Projects/Central Command`.

The ticket is the parent record. From an assigned on-site ticket, **Assessment** opens `/tickets/[id]/assessment`. **Save assessment** validates the checklist and GPS photo evidence, persists a draft against the ticket, and returns to the ticket for answer/evidence readback. Saving does not submit or notify a reviewer. **Submit for team lead review** is a separate ticket action; it requires uploaded linked photo assets and atomically records the immutable assessment revision, changes the ticket stage, and creates the assigned lead's in-app notification.

CEO and Super Admin accounts manage intake and pass tickets to active Admin team leads. A team lead creates/selects a storm-specific crew with one eligible DRIVER and one eligible DAMAGE_ASSESSER or SR_DAMAGE_ASSESSER. Both contractors can read their crew's ticket and evidence; the assigned assessor fills out the assessment. Admin access is limited to ticket workspaces and their own ticket dispatch/review. Team lead approval advances to final review; only the CEO/Super Admin can give final approval. Corrections require notes, notify the crew/lead, and start a new draft/revision while retaining prior submissions.

The user chose **export the approved ticket/assessment PDF and record the handoff**. The ticket's existing Print / Save PDF action includes linked answers, notes and private photo evidence. After delivery, a CEO/Super Admin records the delivery reference/notes. The guarded handoff action requires final approval, records identity/time/reference, and closes the parent ticket. Notifications use the in-app bell inbox; no external messages are sent.

## Persistence and access

- `field_crews` stores storm, team lead, driver and assessor. Guarded functions validate active account role, onboarding, eligibility and the storm roster. Crew and ticket relationships are persisted together.
- `ticket_assessment_drafts` stores the stable future assessment ID, validated answers, photo references, actor, timestamp and optimistic version. `damage_assessments` stores immutable submitted revisions and separate team/final review results.
- The missing private `assessment-photos` bucket now exists. Storage and media access follow ticket/crew scope. Submitted files and their media metadata cannot be overwritten. Photo capture IDs remain the IDs in `photo_evidence` and `media_assets`; authenticated downloads provide readback and PDF evidence.
- IndexedDB separates working edits from saved snapshots, includes actor identity, and preserves photo files, revision/photo IDs, server version and explicit submission intent. Reconnect only submits a snapshot when the assessor explicitly chose Submit. Failed uploads/submissions remain queued for retry; stale-device versions require conflict recovery rather than overwriting the server.
- Field routing/arrival/start actions use server GPS accuracy and geofence validation. Saving a public-danger/oil-leak draft escalates priority without submitting; offline alerts reach the server after sync.

## Verification results

| Check | Result and scope |
|---|---|
| Exact migration regression | **36 passed** in isolated PGlite fixtures, including intake RETURNING, crew roles/scope, save versus submit, stable retries, uploaded evidence gate, correction revisions, review roles and handoff. |
| Live Postgres/RLS rollback | **14 scenario groups passed** with simulated request claims. Ticket intake/dispatch, driver reads, assessor saves/submission, private-object scope, correction/approval notifications, final-role barrier, and utility handoff all persisted and read back inside the rollback fixture. Profile/Auth/ticket/crew/draft/assessment/media/object/notification/audit counts match before and afterward. |
| Focused UI/service/middleware tests | **57 passed** across eight test files. Includes explicit readback-before-submit, no automatic submission, offline save versus queued submission, actor isolation, retry retention, private upload metadata, role restrictions and GPS-gated assessment/correction status transitions. |
| TypeScript / scoped ESLint | Passed. |
| Production build | Webpack compiled and generated all **50 pages**, including the new ticket assessment route, using isolated `.next-ticket-workflow-validation`. |
| Knowledge graph | `graphify update .` completed with AST extraction. |
| Live security advisors | Only the project's pre-existing Auth leaked-password-protection warning; no new workflow-specific security finding. |
| Browser preview | Local app running at `http://127.0.0.1:3000`; in-app browser verifies anonymous `/tickets` redirects to the real sign-in page. |

Applied live migration names: `ticket_draft_crew_review_workflow`, `fix_ticket_intake_scope`, and `require_ticket_crew_before_fieldwork`, in Supabase project `xcvacmreerrypygpritq`. The live rollback test caught an INSERT RETURNING visibility issue; the corrective migration compares the new ticket row's scope directly, and the new regression check protects that behavior. The crew guard is confirmed live at migration `20261006133126`; all 14 live rollback groups passed again after activation. Database types were regenerated from this live project.

Machine-readable results: `ticket-workflow-local.json` and `ticket-workflow-live.json`. Reproducible checks: `scripts/verification/ticket-workflow.mjs` and `scripts/verification/ticket-workflow-live-rollback.sql`.

## Remaining operational acceptance

There are **no active Admin team lead accounts** in the live directory yet. The user will handle account setup when at the office. The current People & access screen manages existing staff permissions; it does not have a staff creation form. Existing single-contractor tickets require team lead and crew dispatch before starting fieldwork; both the UI and database enforce this. A named staff account must be provisioned with the Admin/team lead role before real tickets can be dispatched and submitted through this hierarchy. Contractor compensation role TEAM_LEAD does not automatically grant staff permissions.

Authenticated browser use across real assessor/driver/team lead/chief accounts, physical GPS/photo capture and upload through the Storage API, cross-device/offline/reconnect acceptance, and hosted frontend deployment remain unverified. The live SQL tests use request-claim simulation and temporary Storage object/metadata fixtures, not actual uploaded image bytes. No user credentials were entered, no QA identities/records were retained, and no Git operations were performed.
