# Entergy forms validation — 2026-10-06

Implemented in the active Desktop Central Command checkout by Codex /root. Two independent ticket-linked forms cover the supplied Entergy Clean-up Form and Distribution Change Order (02-25-2019). Clean-up has seven printed inputs; Damage assessment retains equipment/activity choices, locations/GPS, six equipment rows, transformer/feeder/lighting details, customer/site information, switches/bypass/poles, communications/controls, three customer-transfer rows, and sign-off. Additional equipment/customer rows are supported up to 60 each.

The user requested removal of the lighting map section during review. The map drawing and legend, saved-form/report rendering, and client/server submission requirement are removed. Street light and private area light wattage/type inputs remain. Earlier saved map data can still be validated and preserved; it is not displayed. The coverage inventory records this explicit exception to the source form.

## Application and live database

Open an Entergy ticket and select its Clean-up or Damage assessment form from Entergy forms. The assigned assessor or an authorized CEO/Super Admin can fill a form once the assigned crew is on site. Assigned crew readers and authorized staff can read saved/submitted records within the existing ticket scope. Save retains an editable draft; Submit attaches an immutable utility record. These supplemental forms preserve the existing required field assessment and ticket review/approval gates.

Live Supabase project: `xcvacmreerrypygpritq` (Central Command). Installed migrations:

- `20261006175056_entergy_official_ticket_forms`
- `20261006175923_remove_entergy_lighting_map`

The new table has RLS enabled, authenticated SELECT only, no anonymous table/RPC access, and guarded server-bound save/submit functions. Submitted records and their linked private photo objects/metadata are immutable. Identity, ticket assignment, Entergy utility, on-site state, optimistic version, payload choices, required GPS photo views and section-photo associations are validated on the server. Existing source PDFs are available from the form's source link. No Entergy contact or field action was performed.

Actor-scoped IndexedDB stores unsaved editor data and queued save/submission intent. Stable capture IDs and checksums remain linked to the ticket/form/section through reconnect processing and report readback. Online operations verify the current Auth user before processing that actor's queue. Conflict errors preserve device edits and provide an explicit discard-and-reload action.

## Passed checks

- Full Vitest suite: **627/627 tests**, **113/113 files**. Focused Entergy schema, service, field-sheet, report and existing ticket/readback suites: **51/51 tests**, six files.
- `npm run typecheck` and scoped ESLint passed.
- `CC_NEXT_DIST_DIR=.next-entergy-verification npx next build --webpack` passed compilation, TypeScript and generation of all 50 static pages. Both Entergy routes appear in the built route tree.
- Exact initial/follow-up migrations in isolated PGlite: **35/35 checks**. Fixture permission helpers are labeled in `scripts/verification/entergy-forms.mjs`; this does not establish real Auth or actual image-upload acceptance.
- Live Postgres/RLS with simulated request claims: **17/17 scenario groups**. Temporary Auth/profile/crew/ticket/form/media/object/audit records rolled back; baseline row counts matched afterward. Draft/save/readback, conflict/idempotency, linked submission, immutable evidence, assessor/driver/team-lead/unrelated access and lighting submission without a map passed. Storage object rows and media metadata simulated uploads; no image bytes were uploaded by SQL. See `entergy-forms-live.json` and `scripts/verification/entergy-forms-live-rollback.sql`.
- Supabase security advisor reported no database findings. It retains the existing Auth leaked-password-protection warning. No Auth settings changed. [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Desktop and 390×844 browser previews inspected using the actual field-sheet component. Both forms have no horizontal page overflow. Explicit No, multi-checkbox selection, leading-zero DLOC, additional equipment rows and absence of map drawing/legend were verified. Temporary viewport override was reset. Screenshots in `entergy-previews/` are labeled component previews with sample data and no live writes; they do not show an authenticated ticket session.
- `graphify update .` passed AST-only extraction: 3,857 nodes, 10,527 edges, 306 communities. No semantic API call was made.

## Acceptance remaining

Real sign-in with an eligible assigned contractor and authorized staff on the same ticket; physical GPS/photo capture and private Storage API upload; offline reconnect/cross-device readback; completed-ticket print/Save-as-PDF dialog; hosted frontend deployment. Client unit tests, component previews and simulated-claim database checks establish their stated scope only.

No Git operations were performed. Local migration filenames match their deployed history versions.
