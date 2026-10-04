# Individual staff permissions and contractor invitations

Date: 2026-10-03  
Agent: Codex /root  
Status: Local implementation verified; live database application awaiting explicit approval.

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

Super Admin defaults permit all keys. CEO defaults permit general staff modules but exclude user administration, and executive permissions are locked. Admin defaults permit general views and contractor/time/expense/assessment edits; storm, ticket, and roster edits require an explicit grant. User administration cannot be granted to an Admin or Contractor. A person cannot change their own permissions. The database protects executive accounts and the last active access administrator.

## Enforcement and persistence

`src/lib/auth/permissionCatalog.ts` supplies the catalog, role defaults, route rules, and effective permission calculation. The auth provider refreshes access on window focus and every 30 seconds. Navigation, direct route middleware, application shells, and mutation controls all use the same permission keys.

`supabase/admin_user_permissions.sql` is the canonical **unapplied SQL draft**, not an entry in migration history. It adds permission overrides and revision tokens, permission lookup and save functions, and invitation storage. Saves validate the authenticated actor, serialize account-access changes, reject stale revisions, and commit overrides, revisions, and audit entries together. Authenticated clients cannot write permission or invitation records directly.

The draft replaces staff role checks and adds restrictive module policies on 24 operational tables, with additional profile restrictions (25 public tables in total) and bucket-scoped vehicle-photo restrictions on storage.objects. Existing contractor policies and ownership predicates remain. Profile authorization/deletion triggers protect account roles and activity. Existing ticket creation and roster assignment invoker functions receive permission checks while retaining their transactional business logic. Invitation finalization is a service-role-only invoker function, with an additional verified actor permission check.

The read-only live access baseline in `supabase/admin_permissions_access_baseline.json` contains the 66 existing policies and three affected function definitions captured before application. It contains schema definitions, not account secrets. Re-read the baseline before applying if other migrations land first.

While the draft is pending, only the specifically missing permissions RPC/table falls back to legacy role defaults on existing screens. Other permission errors fail closed. New administration APIs return an explicit 503 explaining that the database update is awaiting approval; they cannot save permissions or send invitations during this state.

## Invitation activation

The server validates a single-person payload, checks existing Auth/profile identity and trusted role metadata, and calls Supabase's invitation API. The finalizer creates a missing contractor row without overwriting an existing approved business record, records the invitation count/status, sets the password gate, and writes an audit record. Provider or finalization errors return failure rather than a success toast. A partially completed invitation can be retried with Resend invite.

The confirmation page accepts both token-hash email templates and standard invitation redirects carrying Auth-issued session tokens. It removes one-use credentials from browser history after session establishment and routes invitees to password setup. Recovery links use password recovery. The public auth provider now allows this callback to finish before applying protected-route behavior.

`NEXT_PUBLIC_APP_URL` is set in the local override to `http://192.168.1.72:3000` for the user-confirmed LAN preview. Supabase must allow the corresponding `/auth/confirm` redirect. Contractors outside this Wi-Fi need a deployed URL they can reach, plus matching Supabase URL configuration. SMTP/template/redirect configuration and actual inbox acceptance remain unverified.

Reference: [Supabase email redirects](https://supabase.com/docs/guides/auth/redirect-urls), [inviting a user](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

## Validation and activation gates

- All 355 application tests pass. Regression coverage includes independent module flags, direct links, fail-closed snapshots, identity changes, strict payload validation, duplicate/resend behavior, provider/finalization errors, and callback variants.
- TypeScript and scoped ESLint pass. The production build is run from an isolated temporary checkout so the user's running development server keeps its own build artifacts.
- `node scripts/verification/admin-permissions.mjs` passes 17 isolated PostgreSQL/PGlite checks for SQL execution, RLS read/write denial, stale revision rejection, audit persistence, self/executive protection, password gates, contractor isolation, service-only finalization, linked records, and preservation of approved contractor data on resend. These are not live Supabase acceptance tests.
- The actual new components were checked with sample accounts at desktop and phone sizes: toggles, save feedback, protected contractor settings, navigation, and invitation form layout. Images in `output/playwright/*permissions*preview.jpg` and `*invite*preview.jpg` are explicitly labeled visual previews. No preview action changed a live account or sent email.
- Live security advisors report the pre-existing leaked-password-protection warning. Advisors must be rerun after approved application; this current result does not validate unapplied SQL.

Before enabling the features:

1. Obtain explicit approval to apply the prepared access-control change to live project `xcvacmreerrypygpritq`. Automatic review rejected the earlier attempt because the broad persistent deployment was not specifically authorized.
2. Resolve the CLI migration-file generation block. Its sandbox escalation was rejected because the workspace is out of credits; do not reroute the CLI to bypass that review. Generate the tracked migration through the normal Supabase CLI workflow, then populate it from the approved draft.
3. Apply the approved migration, regenerate database TypeScript types, remove temporary `as never` casts for the newly typed tables/RPCs, and rerun checks/advisors.
4. Verify two real staff sessions: saved overrides persist after reload, denied direct URLs and direct database mutations fail, allowed changes succeed, and other modules remain available. Preserve a functioning access administrator throughout.
5. Use an explicitly approved recipient to verify one email delivery, confirmation on a separate browser/computer, password setup, Auth/profile/contractor identity binding, and accepted status. Verify duplicate rejection and resend separately. No invitation emails have been sent as part of this implementation turn.
6. Recheck existing contractor ticket isolation and portal behavior against live RLS. Pre-existing contractor status/history and assessment-read blockers remain separate work and are not declared fixed by this staff-permissions change.

The draft is transactional, so an application error rolls it back. After a successful application, a rollback must restore the captured policy/function definitions and remove the new restrictions through a reviewed migration. Preserve permission, invitation, and audit data before removing any new storage; do not use a blind table drop as rollback.


Payroll extension (2026-10-03): Payroll View/Edit is independent of Time Review. Ordinary admins receive Payroll View by default, with edits requiring an explicit allow. Payroll readers may read underlying time entries and contractor names; time reviewers may read vehicle-claim amounts. Existing contractor ownership policies still apply. Rate and claim writes require Payroll Edit in the unapplied draft. Storage restrictions apply only to time-entry-photos and preserve existing ownership checks. The separate payroll-integrity repair changes two existing trigger functions without grants or role promotions and is also unapplied after automatic approval review rejected its live deployment.
