# Required ticket assessments — 2026-10-05 — Codex /root

The implementation replaces the generic assessment editor with the user's top-down field sheet. Definitions and client validation cover phase/framing, taps, tree crews, pole damage/access, conductor/span damage, downed transformers, service damage/configuration, cross arms/insulators, public danger/oil leakage, and final notes. All applicable questions require an answer. Hidden dependent fields are cleared. Free text is limited to damage descriptions and notes; counts without specified ranges require positive whole numbers.

## Verified locally

- Exact migration compiles in PGlite; 29 checks pass, including assignment/identity binding, allowed values, required answers, photo count/types/GPS metadata, immutable submissions, restricted review, completion gate, atomic critical escalation, and linked audit entry. See `field-assessments-local.json`.
- All 43 focused form/schema/service/readback/offline tests pass. Queue retries retain the assessment ID, serialize concurrent processing, and skip another user's device records.
- Source typecheck and scoped ESLint pass. Webpack production build compiles and generates all 50 pages. Stale duplicate generated types in `.next-payroll-final/types` were cleaned with the existing cleanup helper to allow normal typecheck/build.
- Actual components rendered in a temporary, clearly labeled local preview with sample ticket/contractor context. Browser interactions verified phase/framing choices, pole detail expansion and clearing, public-danger escalation alert, and IndexedDB answer restoration after navigation.
- Desktop and phone visual checks pass; phone DOM scrollWidth equals clientWidth (375 CSS pixels within the requested 390px viewport). Screenshots: `field-assessment-desktop.jpg`, `field-assessment-mobile.jpg`.

## Live activation and remaining acceptance

The user authorized activation on 2026-10-06. Migration `20261006120830_top_down_ticket_assessments` is applied to Central Command (`xcvacmreerrypygpritq`). Live schema inspection confirms both structured columns, the assessment guard/escalation triggers, and the intended active-profile, onboarding, module, ownership, and reviewer permission policies. The database still has zero assessment rows. The uniqueness constraint was removed so a ticket can retain revisions after rework; reconnect retries reuse the same local assessment ID.

The deployed migration:

1. Adds versioned field-sheet and photo-evidence JSON columns, retaining historical records.
2. Grants authenticated assessment SELECT/INSERT/UPDATE, subject to existing active-profile, onboarding, module, and ownership restrictions; limits UPDATE to permitted reviewers and immutable submitted content.
3. Permits multiple assessment revisions for rework while retries reuse the same assessment ID.
4. Binds assessor identity/timestamps on the server and requires assignment to an on-site ticket.
5. Atomically flags public danger/oil leakage with assessment priority A and ticket severity CRITICAL/is_important, logs the escalation, and preserves the contractor guard against direct severity changes.
6. Requires an assessment before a ticket can transition to complete/review.

Post-activation verification: the current exact migration passes 34 isolated database checks, the focused local assessment/navigation suites pass 16 tests, TypeScript passes, and lint passes on the changed navigation/dashboard/service files without existing hook-rule violations. Lint on the edited ticket/review components also reports existing `react-hooks/set-state-in-effect` errors in their ticket/review loading effects. `graphify update .` refreshed the code graph. Production webpack build compiled and generated all 50 routes using isolated output `CC_NEXT_DIST_DIR=.next-assessment-verification`; the standard Turbopack build remains blocked by its attempt to bind a port for CSS processing in this sandbox. Supabase advisors report the project's existing leaked-password-protection warning and unrelated existing index/policy notices; no assessment-specific security finding was reported.

Still pending: authenticated live RLS/trigger tests with rollback fixtures and a real contractor submission plus staff readback, GPS/photo upload, and reconnect against the same ticket. No user credentials were entered. Device GPS/photo acquisition and upload persistence are not proven by component tests or client-supplied photo metadata. Frontend code is implemented in this checkout but has not been deployed to a hosted app.

Full regression result: 523 passing tests; four failures in the existing TicketAssign tests due to their stormRosterService mock missing listOptions. No TicketAssign source or test files were modified.

## Photo/report continuation — 2026-10-06 (Codex /root)

The earlier activation-pending section is superseded by the newer live ticket workflow described in `ticket-workflow-validation.md`. During this continuation, live readback confirmed the private `assessment-photos` bucket and `private.assert_ticket_evidence` enforcing section-key photos and persisted evidence linkage. Three direct validator checks passed without writing rows. No new migration was deployed by this continuation.

The completed ticket includes a Print / Save PDF button. It reloads the same ticket and attached assessments under the authenticated RLS session, downloads original linked images privately, excludes abandoned draft photos, rejects unavailable required images, escapes all printable content, and prepares a separate Letter-size print document after images/fonts are ready. The browser print dialog supplies printer selection or Save as PDF. Review notes, revisions and utility handoff metadata are included once.

- Focused validation: 98 tests across 11 files pass.
- Exact current workflow fixture: 36 isolated PGlite checks pass.
- TypeScript, scoped ESLint and isolated webpack production build (50 pages) pass. Final report markup and local-photo actor filtering also pass TypeScript/scoped ESLint.
- A labeled `QA-REPORT-001` fixture generated a three-page Letter PDF via Chromium. Rendered pages were inspected; complete text, section association and caption layout were checked. This uses a placeholder image, not real damage evidence. Temporary files reside under `/private/tmp/cc-ticket-report*`.
- Wider regression: 558 pass, eight fail in `TicketAssign.test.tsx`, `ticketService.test.ts`, and `statusUpdateFlow.test.ts`. Failures concern the existing picker mocks, changed dispatch/status behavior and IndexedDB mocks; photo/report tests pass.
- Graphify AST update completes (no semantic-document rebuild).

Operational acceptance remains: real signed-in capture and Storage API upload, actor-isolated offline/reconnect and cross-device readback, and completed-ticket native print dialog. No credentials were entered and no real assessment/photo fixtures were retained.
