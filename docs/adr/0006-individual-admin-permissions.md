# Individual staff permissions and contractor invitations

Date: 2026-10-03  
Agent: Codex /root  
Status: Applied to live Supabase with explicit user approval; staff save/reload and database enforcement verified. Email delivery and second staff/device acceptance remain open.

## Requested behavior

A Super Admin can open **People & access** (`/admin/users`), select a staff account, and set View and Edit independently for each supported module. Explicit overrides belong to the person, while unchanged settings inherit their role defaults. The contractor portal retains its current access model.

The contractor invitation screen (`/admin/contractors/invite`) accepts one person's name, email, and optional phone. It sends an Auth invitation, binds the Auth identity to a contractor business record, requires the recipient to choose their own password, and records the result. Active staff or accepted accounts are rejected as duplicates. An unaccepted invitation requires an explicit resend.

## Permission catalog

The shared catalog defines 12 modules and 21 permission keys. Unknown keys and caller-supplied roles are rejected.

| Module | View | Edit |
| --- | --- | --- |
| Dashboard | Overview | — |
| Storm events | Storm workspaces | Create and change events |
| Tickets | Ticket queue and records | Create, update, and assign tickets |
| Contractors | Directory and onboarding records | Approve onboarding and eligibility |
| Crew assignments | Roster within a storm workspace | Add approved contractors to that roster |
| Map | Map screen | — |
| Time review | Timesheets | Approve or reject time |
| Expenses | Expense reports | Approve or reject expenses |
| Assessments | Damage assessments | Approve or request rework |
| Payroll & profit | Payroll, reimbursements, billing, and margin | Rate changes and claim review |
| Reports | Report screen | — |
| User administration | Account access directory | Set permissions and send contractor invitations |

Edit requires View for the same module. Account self-service remains available. Data shown in dashboards, maps, and reports also follows the underlying module's database access. Crew rosters remain inside storm workspaces, so their screen context requires Storm events View; contractor selection follows Contractors View. These existing screen relationships are distinct from the individual permission switches.

Super Admin defaults permit all keys. CEO defaults permit general staff modules but exclude user administration, and executive permissions are locked. Admin defaults permit general views and contractor/time/expense/assessment edits; storm, ticket, roster, and payroll edits require an explicit grant. User administration cannot be granted to an Admin or Contractor. A person cannot change their own permissions. The database protects executive accounts and the last active access administrator.

## Enforcement and persistence

`src/lib/auth/permissionCatalog.ts` supplies the catalog, role defaults, route rules, and effective permission calculation. The auth provider refreshes access on window focus and every 30 seconds. Navigation, direct route middleware, application shells, and mutation controls all use the same permission keys.

`supabase/admin_user_permissions.sql` is the consolidated installation SQL. Exact deployed history is preserved in the three CLI-created migration files listed below. It adds permission overrides and revision tokens, permission lookup and save functions, and invitation storage. Saves validate the authenticated actor, serialize account-access changes, reject stale revisions, and commit overrides, revisions, and audit entries together. Authenticated clients cannot write permission or invitation records directly.

The migration replaces staff role checks and adds restrictive module policies on 24 operational tables, with additional profile restrictions (25 public tables in total) and bucket-scoped vehicle-photo restrictions on storage.objects. Existing contractor policies and ownership predicates remain. Profile authorization/deletion triggers protect account roles and activity. Existing ticket creation and roster assignment invoker functions receive permission checks while retaining their transactional business logic. Invitation finalization is a service-role-only invoker function, with an additional verified actor permission check.

The original early baseline remains in `supabase/admin_permissions_access_baseline.json`. The refreshed pre-application snapshot `supabase/admin_permissions_preapply_20261003.json` contains all 127 policies (124 public and 3 storage), three affected functions, profile triggers, relevant columns, and original service-role privileges. It reflects the payroll changes deployed before this permission migration.

Applied with explicit user approval on 2026-10-03 to `xcvacmreerrypygpritq`:

| Live version | Migration | Result |
| --- | --- | --- |
| `20261004010249` | `individual_admin_permissions_and_contractor_invitations` | Catalog, overrides/revisions, RPCs, staff RLS, profile guards, invitation storage/finalizer |
| `20261004010952` | `grant_invitation_finalizer_contractor_access` | Service role SELECT/INSERT on contractors and INSERT on audit_logs, required by the invoker finalizer and failure audit |
| `20261004011222` | `cache_identity_in_admin_permission_policies` | Cache auth identity in the new module policies without changing their access predicates |

Each migration file was generated with Supabase CLI, populated, applied, then matched to its observed live history version. The consolidated SQL includes the follow-up fixes; the original applied file retains its exact deployed contents. Database TypeScript types were regenerated from the live schema. The new permission/invitation tables and RPCs use typed calls; nullable phone and initial revision parameters are explicitly represented in those types.

Preflight corrected the missing Payroll keys in the current-user RPC. Live verification then exposed missing legacy service-role table grants that the original isolated fixture had assumed existed; the follow-up grants and revised fixture address that gap. The pending-migration fallback is dormant now that the RPCs exist; other permission errors still fail closed.

## Invitation activation

The server validates a single-person payload, checks existing Auth/profile identity and trusted role metadata, and calls Supabase's invitation API. The finalizer creates a missing contractor row without overwriting an existing approved business record, records the invitation count/status, sets the password gate, and writes an audit record. Provider or finalization errors return failure rather than a success toast. A partially completed invitation can be retried with Resend invite.

The confirmation page accepts both token-hash email templates and standard invitation redirects carrying Auth-issued session tokens. It removes one-use credentials from browser history after session establishment and routes invitees to password setup. Recovery links use password recovery. The public auth provider now allows this callback to finish before applying protected-route behavior.

`NEXT_PUBLIC_APP_URL` is set in the local override to `http://192.168.1.72:3000` for the user-confirmed LAN preview. Supabase must allow the corresponding `/auth/confirm` redirect. Contractors outside this Wi-Fi need a deployed URL they can reach, plus matching Supabase URL configuration. SMTP/template/redirect configuration and actual inbox acceptance remain unverified.

Reference: [Supabase email redirects](https://supabase.com/docs/guides/auth/redirect-urls), [inviting a user](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

## Validation and remaining acceptance

- All 441 application tests pass across 85 files. TypeScript passes. Scoped ESLint has no errors (two existing unused declarations in ticketIntakeService.ts). An isolated webpack production build succeeds with 41 routes while the user's dev server keeps its build artifacts.
- `node scripts/verification/admin-permissions.mjs` passes 19 isolated PostgreSQL/PGlite checks. The fixture now mirrors the original missing service-role contractor/audit grants, and snapshot coverage requires all 21 catalog keys, including Payroll.
- `scripts/verification/admin-permissions-live-rollback.sql` passes **23 live database/RLS checks** using simulated request identities. Overrides, revisions, audit binding, stale-save rejection, direct denied writes, allowed storm edits, independent Payroll access, profile protections, RPC gates, contractor isolation, service-only invitation finalization, linked business records and resend preservation pass. Every fixture, test identity and temporary edit rolls back; no email is sent. Evidence is in `docs/testing/admin-permissions-live-integrity.json`.
- Real David staff browser acceptance: People & access loads both staff accounts and 12 modules. An explicit Reports allow equivalent to Jeanie's existing default is saved and survives reload; resetting to role defaults is saved afterward. Both Super Admins retain all 21 permissions, no overrides remain, and two legitimate save audits are retained. The enabled invitation form blocks empty submission with required-field validation. Screenshots are in `output/playwright/permissions-live-saved.png` and `invitation-live-validation.png`.
- Real QA Alex contractor browser acceptance after migration: LAN sign-in succeeds, Time Tracking displays the configured $85/h rate, My Tickets shows only assigned ticket `2026100101`, and direct `/admin/users` is redirected to `/forbidden`. The QA session is signed out afterward; no field submission is performed. Screenshot: `output/playwright/permissions-contractor-isolation.png`.
- Live policy comparison confirms all 72 original policies without staff-role predicates remain byte-for-byte equivalent, including contractor ownership predicates. The separate contractor status/history and assessment-read blockers remain outstanding.
- Security advisors report only the existing [leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The performance follow-up resolves all 99 unwrapped identity calls in new module policies; auth-initplan findings return from 124 to the prior 25. Other existing performance findings remain. Full results are in `docs/testing/admin-permissions-live-advisors.json`.
- The activation record `docs/testing/admin-permissions-activation.json` distinguishes real browser checks from simulated database checks.

Remaining acceptance:

1. Verify two independent real staff sessions with an actual module restriction, direct route denial, allowed edits and other modules available. The live database proves denial, but the second staff browser session has not been used.
2. With an explicitly approved recipient, verify SMTP/template/redirect configuration, actual email delivery, separate-computer confirmation/password setup, linked identity, accepted status, duplicate rejection and resend. No invitation emails have been sent.
3. Complete physical device GPS/photo/time/claim workflows over trusted HTTPS as tracked in the implementation plan.

The applied migrations are transactional. A rollback must restore the captured policy/function definitions and revoke only the additional server-role grants through a reviewed migration. Preserve permission, invitation and audit data before removing any new storage.

Payroll extension (2026-10-03): Payroll View/Edit is independent of Time Review. Ordinary Admins receive Payroll View by default, with edits requiring an explicit allow. Payroll readers may read underlying time entries and contractor names; time reviewers may read vehicle-claim amounts. Existing contractor ownership policies still apply. Rate and claim writes require Payroll Edit. Vehicle-photo restrictions apply only to time-entry-photos. The separate payroll-integrity repair was approved and applied as `20261004002801_preserve_payroll_snapshots_and_guard_vehicle_claims`; its 20 live database checks and remaining device acceptance are recorded in the implementation plan.
