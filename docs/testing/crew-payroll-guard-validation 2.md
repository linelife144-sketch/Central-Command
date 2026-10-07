# Crew time and vehicle-evidence guard validation

Implemented by Codex `/root/payroll_guard_repair` on 2026-10-07 in the canonical Desktop checkout.

The additive migration `20261007092206_crew_time_tracking_and_vehicle_evidence_guards.sql` changes two current private trigger functions. A time entry accepts its contractor when that contractor is either `tickets.assigned_to` or `tickets.assigned_driver_id`; the existing matching storm and nondeleted ticket predicates remain. A new vehicle claim requires nonnull, distinct vehicle and plate paths under the contractor's shift, with both objects present in the `time-entry-photos` bucket. The checks apply only to INSERT. Existing claims are neither backfilled nor revalidated during review, and the saved wage, billing and allowance calculations remain unchanged.

`supabase/crew_payroll_guard_baseline.json` preserves the exact live function definitions captured by the parent on 2026-10-07 from project `xcvacmreerrypygpritq`. The migration changes only the ticket-membership predicate and new-claim photo validation; the remaining function bodies, transaction advisory lock, SECURITY DEFINER behavior, empty search path and existing trigger attachments are preserved. Direct execution remains denied to PUBLIC, anon and authenticated. No tables, RPC signatures, ticket review semantics, crew dispatch semantics, grants to application roles, or historical data are added or changed by this migration.

The new `scripts/verification/crew-payroll-guards.mjs` fixture composes the configurable payroll costing migration and closed-evidence protections with the captured current onboarding time guard and canonical crew access/assessment helpers. Its actors have distinct contractor and profile IDs. It performs actual inserts, open-activity updates, clock-out updates, claim creation and reviews rather than asserting SQL strings. Its minimal schema and explicitly permissive baseline table policies isolate the trigger behavior; restrictive ownership and Admin write ceilings are still applied. It is not a complete reproduction of all production RLS policies.

The failing run before writing the migration used `node scripts/verification/crew-payroll-guards.mjs --baseline` and exited 1 with the three expected defects:

- The assigned driver could read the crew ticket but clock-in failed with `Select an assigned ticket in this storm`.
- A claim with correctly prefixed nonexistent photo objects was accepted.
- A claim that reused one uploaded path as both vehicle and plate evidence was accepted.

After applying the migration only inside PGlite, `node scripts/verification/crew-payroll-guards.mjs --verify-live-script-fixture` passes **29 checks**. They cover assessor and driver clock-in/activity/clock-out, legacy assessor-only assignment, crew read with assessor-only assessment editing, unrelated actors, mismatched storms, deleted tickets, account/identity guards, GPS and photo validation, immutable activities and closed inputs/evidence, wage/billing/allowance preservation, null/missing/one-uploaded/same-path/wrong-owner/wrong-shift/wrong-bucket claim evidence, ownership, privileged review and private function privileges. A pre-migration pending claim with missing objects is unchanged after migration and can still be reviewed at its saved amount. JSON evidence is `docs/testing/crew-payroll-guards-local.json`.

The rollback SQL artifact `scripts/verification/crew-payroll-guards-live-rollback.sql` selects existing eligible identities and an active storm dynamically, creates one ephemeral ticket and two shifts, validates the fixes through authenticated role contexts, and rolls back all fixture writes. It creates no Auth accounts and sends no email. It uses simulated JWT claims, GPS, future clock-out time and Storage metadata rows. It tests guard membership directly rather than crew dispatch. It requires a privileged reviewer, onboarded assessor and driver with effective agreements and no overlapping shifts, and configured driver vehicle allowance. The artifact compiles and runs in the composed fixture, where before/after ticket, shift, claim and object counts match. **It has not been run on live Supabase by this implementer.**

Additional verification passed:

- `node scripts/verification/configurable-payroll.mjs`: 21 suites. This older fixture intentionally remains separate and does not claim coverage of the current crew/onboarding guards.
- `node scripts/verification/payroll-integrity.mjs`: 16 checks of the earlier snapshot repair.
- Focused Vitest: 50 tests across `payrollService`, `timeEntryService`, `timeEntryUploadQueue` and payroll utilities.
- `npm run typecheck`: passed.
- `npx eslint scripts/verification/crew-payroll-guards.mjs`: passed.
- Self-review compared preserved guard regions against the captured definitions: the complete time guard matches after substituting only the membership predicate, and claim costing plus the entire UPDATE/review branch are unchanged.

Independent spec and quality review, live migration activation, real Storage uploads, authenticated browser/device acceptance and final Graphify refresh are owned by the parent and remain outstanding. No Git operations or live writes were performed by this implementer. Pre-edit copies of existing files are under `/private/tmp/cc-payroll-guard-pre-edit`.

## Parent review and activation — 2026-10-07

Independent spec review by Codex `/root/phase3_audit` passed; independent quality review by Codex `/root/phase4_inventory` approved. Both independently reproduced the three baseline failures and passed the 29 checks plus isolated rollback execution. The additive migration was applied to `xcvacmreerrypygpritq` as `20261007092206_crew_time_tracking_and_vehicle_evidence_guards`; its CLI-created local file and scoped references were aligned to the confirmed live ledger version. Exact live function bodies match the reviewed SQL. SECURITY DEFINER, empty search paths, and denied direct execution by anon/authenticated are confirmed. Security advisors add no finding for these functions; the existing intentionally guarded `set_ticket_disabled` RPC warning and disabled leaked-password protection warning remain unchanged.

Two live rollback attempts were cancelled by the connector. Subsequent read-only checks show unchanged counts: six tickets, ten shifts, one vehicle claim, ten Storage objects, and no other active client query. The user then instructed skipping SQL with destructive actions, so this fixture was skipped. No successful live functional rollback, Storage API upload, signed-in browser or physical-device acceptance is claimed. See `crew-payroll-guards-live.json`. Final graph and broader acceptance remain part of the parent goal. — Codex `/root`
