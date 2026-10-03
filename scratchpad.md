# 📝 Developer & Agent Scratchpad

Use this scratchpad to organize your work during development sessions. You can write checklists, design notes, context snapshots, and debug logs here to maintain continuity across runs.

---

## 🚀 Current Session Goal

Make two admin capabilities actually work end to end:

1. Invite exactly one contractor at a time by email from the contractor invitations screen.
2. Let a Super Admin set and later change what each individual user can see and what they can change.

- **Target Phase/Milestone:** Phase 4 — Polish & Launch, after the deferred auth migrations
- **Active Task:** Single-contractor email invite + per-user permissions

---

## What is true today

### Invite

- `/admin/contractors` already has an **Invite Contractor** link to `/admin/contractors/invite`.
- That page is only CSV instructions. It tells staff to run `npm run provision:users`, but `scripts/provision-users-from-csv.ts` is not in this checkout. `package.json` also references the missing `scripts/upsert-single-contractor.ts`.
- There is no `inviteUserByEmail`, `generateLink`, or other Auth admin invite call anywhere in `src/`.
- The only API routes are `src/app/api/auth/profile/route.ts` and `src/app/api/tickets/ocr-extract/route.ts`. Neither can create or invite a user.
- `src/lib/supabase/admin.ts` can create a service-role client, but only on the server. The invite page is a server component with no form and no server action.
- `src/app/auth/confirm/page.tsx` already accepts an `invite` OTP type, so the email link can land there once Supabase sends one.
- Auth user creation already has a DB trigger, `private.provision_auth_profile()`, that inserts a `profiles` row. A contractor invite must also create the matching `contractors` row. The trigger does not do that.
- Current CSV provisioning expects a temporary password. The requested flow must not. The contractor sets their own password from the email link.
- Supabase Auth email delivery and the invite redirect URL are external setup. Code alone cannot prove the email arrived.

### Permissions

- Access is role-wide, not per user. `profiles.role` is `CEO | SUPER_ADMIN | ADMIN | CONTRACTOR` in the live helpers.
- `src/lib/supabase/middleware.ts` allows every admin-class role into all of `/admin/**` and every contractor into all of `/contractor/**`.
- `src/lib/auth/roleGuards.ts`, `portalAccess.ts`, and `authorization.ts` repeat that model. The only management actions are storm, ticket, and contractor-assignment writes, and all three require CEO or Super Admin.
- Sidebar, bottom nav, and command search render a fixed list for the portal. They do not know about an individual user.
- RLS uses `public.is_admin()` and `public.is_super_admin()`, which only inspect `profiles.role`. There is no `user_permissions` table.
- `src/stores/authStore.ts` is a second, stale role check. Live auth goes through `AuthProvider` and `/api/auth/profile`. Both must carry the same permission snapshot or the UI and server will disagree.
- Hiding a nav link is not enforcement. Middleware, page/API checks, and RLS all have to agree.

---

## 📋 Task Checklist

### 1. Single contractor email invite

- [ ] **1.1 Confirm external Auth email setup before coding the screen.** In the Supabase project, confirm invite email is enabled, the site URL and redirect allow-list include `/auth/confirm`, and a real test inbox can receive the message. Record the result in the debugging log below. Do not store a service-role key in client code or `NEXT_PUBLIC_*`.
- [ ] **1.2 Add one server-only invite endpoint.** Create `POST /api/admin/contractors/invite`. Authenticate the caller, require an active CEO or Super Admin profile, and reject everyone else with 403. Validate a single payload: `first_name`, `last_name`, `email`, and optional `phone`. Force the role to `CONTRACTOR`. Do not accept `role`, `temp_password`, or a batch array.
- [ ] **1.3 Send the Auth invite with the service-role client.** Call `auth.admin.inviteUserByEmail` with `redirectTo` pointed at `${NEXT_PUBLIC_APP_URL}/auth/confirm`. Put `CONTRACTOR` in app metadata, not user-editable metadata, so `private.provision_auth_profile()` cannot be given a higher role. If that email already has an Auth user, do not create a duplicate; return a clear already-invited or already-active result and offer resend only for an unconfirmed invite.
- [ ] **1.4 Create the contractor business row on the server.** After the Auth user and profile exist, upsert `contractors` with `profile_id`, name, email, `onboarding_status = 'PENDING'`, and `is_eligible_for_assignment = false`. If the contractor insert fails, record the failure and do not report success. Do not leave the admin staring at an Auth user with no contractor record.
- [ ] **1.5 Replace the CSV instructions on the invite screen.** Change `src/app/(admin)/admin/contractors/invite/page.tsx` into a one-person form: first name, last name, email, optional phone, and one **Send invite** button. Show pending, success, already-exists, and delivery-failure states. Keep the existing back link to `/admin/contractors`. Leave the CSV script and template out of this screen; bulk invite is a separate workflow and its referenced scripts are missing.
- [ ] **1.6 Make the email link finish account setup.** Confirm `/auth/confirm` handles `type=invite`, then route a newly invited contractor to `/set-password` when `must_reset_password` is set, and otherwise to the contractor landing path. The contractor must not land in `/admin/**`.
- [ ] **1.7 Show invite state on the contractor list.** Add invited, accepted, and failed states to the contractor list or detail page, including the invite timestamp and a Super Admin-only **Resend invite** action. Resend must call the same guarded server route, not the browser Supabase client.
- [ ] **1.8 Audit the invite.** Write an `audit_logs` row for send, resend, duplicate rejection, and failure. Include actor, target email, timestamp, and result. Do not write the service-role key, invite token, or password anywhere.
- [ ] **1.9 Test the one-person boundary.** Add unit tests for validation and authorization, plus an integration test with the Auth admin call mocked. Prove: one email per request, non-Super-Admin gets 403, duplicate email does not create a second user, contractor role cannot be upgraded by the client, and the confirm page accepts an invite link. Send one real email only after the mocked tests pass.

### 2. Per-user view and edit permissions

- [ ] **2.1 Freeze the permission catalog before building the screen.** Add `src/lib/auth/permissionCatalog.ts` as the single list. Seed it from the surfaces that exist now: dashboard, storms, tickets, contractors, map, time review, expenses, assessments, reports, account, contractor time, contractor expenses, and contractor assessments. Each area needs separate `view` and `edit` keys. Account self-service stays allowed. Do not invent permissions for invoice generation; that feature was removed from the product flow.
- [ ] **2.2 Add the permission store.** New migration: `user_permissions(profile_id, permission_key, effect, updated_by, updated_at)` with a primary key of `(profile_id, permission_key)`, RLS enabled, and no direct client writes. `effect` is `allow` or `deny`. Add `private.has_permission(profile_id, permission_key)` as a security-definer helper that returns the explicit row when present and otherwise the role default.
- [ ] **2.3 Define role defaults without breaking current users.** CEO and Super Admin default to view and edit on every admin surface. Admin defaults to current admin access except Super Admin-only user administration. Contractor defaults to view and edit only their own field surfaces. An explicit deny overrides a role default; an explicit allow can grant one area without changing `profiles.role`.
- [ ] **2.4 Protect the permission rows.** Only an active Super Admin can read or change another user's permissions. A user can read their own effective permissions and cannot update them. Nobody can remove the last active Super Admin's access to user administration, and nobody can edit their own permission row. Reject changes to CEO and locked executive profiles unless the existing executive-profile migration has been applied and its rule explicitly allows it.
- [ ] **2.5 Return effective permissions with the profile.** Extend `GET /api/auth/profile` to include the caller's resolved permission map. Thread that map through `AuthProvider`. Stop using `src/stores/authStore.ts` role booleans for access decisions, or make them derive from the same server map.
- [ ] **2.6 Enforce view permissions on navigation and routes.** Filter `Sidebar.tsx`, `BottomNav.tsx`, and `NavigationSearch.tsx` from the shared catalog. Update `src/lib/supabase/middleware.ts` so a hidden route redirects to `/forbidden` even if the user pastes the URL. Keep the portal split: a contractor permission cannot open `/admin/**`, and an admin permission cannot open `/contractor/**`.
- [ ] **2.7 Enforce edit permissions on writes.** Replace the three hardcoded checks in `src/lib/auth/authorization.ts` with catalog checks. Gate each mutation path that exists today: storm create and edit, ticket create and assign, contractor changes, time review decisions, expense review decisions, and assessment review decisions. A view-only user can open the screen but receives a disabled action and a server 403 if they submit anyway.
- [ ] **2.8 Enforce the same rules in RLS.** Add permission-aware policies, or security-definer checks used by policies, for the tables behind those writes. Do not rely on UI hiding. A denied user must get zero rows or a rejected write from Supabase even when they call the client directly.
- [ ] **2.9 Build the Super Admin permissions screen.** Add `/admin/users` and `/admin/users/[id]/permissions`, linked from admin navigation only for users with the user-admin permission. List users with name, email, role, and active state. The detail screen shows one row per catalog area with View and Edit controls, the inherited role default, and whether an explicit override exists. Save one user at a time through `PATCH /api/admin/users/[id]/permissions`.
- [ ] **2.10 Make the save atomic and auditable.** Validate every key against the catalog, reject unknown keys, write all overrides and the audit row in one transaction, and record old and new values in `audit_logs`. Return the resolved map so the screen does not guess.
- [ ] **2.11 Lock the privileged actions.** Granting or revoking user administration, changing `profiles.role`, activating or deactivating a user, and sending contractor invites require the Super Admin user-admin permission. A custom allow on tickets or storms must not imply those powers.
- [ ] **2.12 Test both layers.** Add unit tests for default resolution, explicit allow, explicit deny, self-edit rejection, and last-Super-Admin protection. Add middleware tests for a pasted forbidden URL. Add one database test that a view-only admin cannot update a ticket or storm even with a direct Supabase call. Run `npm run typecheck` and the targeted Vitest files after implementation.

### 3. Close the loop

- [ ] **3.1 Regenerate Supabase TypeScript types** after both migrations and update `src/types/database.ts` from the generated output. Do not hand-edit the generated table types.
- [ ] **3.2 Update the implementation checklist** at `grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md` after the work is real. The current note says staff provisioning is unfinished and `MASTER_BUILD_INSTRUCTIONS.md` is absent, so do not invent a progress-tracker edit.
- [ ] **3.3 Run `graphify update .`** after the code changes so the new invite route, permission catalog, and user screen are in the graph.

---

## 🧠 Technical Design & Logic Notes

### Invite sequence

1. Super Admin submits one contractor form.
2. Server route checks the caller from the session and `profiles`, not from the request body.
3. Service-role client sends one Supabase invite email.
4. Auth trigger creates or repairs `profiles` as `CONTRACTOR`.
5. Server route creates the `contractors` row and writes `audit_logs`.
6. Contractor opens `/auth/confirm?type=invite`, sets a password, and lands in the contractor portal.

Keep CSV provisioning untouched until its missing scripts are restored. This task replaces the screen workflow; it does not pretend the missing CLI exists.

### Permission resolution

```text
effective(user, key) =
  explicit user_permissions row if one exists
  else role default from permissionCatalog
  else deny
```

Use the same catalog keys in the UI, middleware, server routes, and RLS helper. A string that exists in only one layer is a hole.

Role remains the portal and landing-path decision. Permissions decide surfaces and mutations inside that portal. Do not overload `profiles.role` with one new enum value per custom combination.

### Suggested first catalog

| Key | Controls |
|---|---|
| `admin.dashboard.view` | Admin dashboard |
| `admin.storms.view` / `admin.storms.edit` | Storm list, create, edit |
| `admin.tickets.view` / `admin.tickets.edit` | Ticket list, create, assign, status changes |
| `admin.contractors.view` / `admin.contractors.edit` | Contractor list and detail changes |
| `admin.contractors.invite` | Send and resend one contractor invite |
| `admin.map.view` | Admin map |
| `admin.time.view` / `admin.time.edit` | Time review |
| `admin.expenses.view` / `admin.expenses.edit` | Expense review |
| `admin.assessments.view` / `admin.assessments.edit` | Assessment review |
| `admin.reports.view` | Reports |
| `admin.users.view` / `admin.users.edit` | User list and permission changes |
| `contractor.tickets.view` / `contractor.tickets.edit` | Own assigned tickets |
| `contractor.map.view` | Contractor map |
| `contractor.time.view` / `contractor.time.edit` | Own time entries |
| `contractor.expenses.view` / `contractor.expenses.edit` | Own expenses |
| `contractor.assessments.view` / `contractor.assessments.edit` | Own assessments |

Account pages are not permission-gated. A user can always open their own account screen.

---

## 🔍 Debugging & Troubleshooting Log

| Issue / Error | Cause | Resolution |
|---|---|---|
| Invite page cannot email one contractor | Page renders CSV CLI instructions; `provision:users` and `upsert:contractor` scripts are absent; no Auth invite call exists | Build the single-email server route and replace the page. Do not point the UI at the missing scripts. |
| Confirm route can accept an invite, but nobody sends one | `auth/confirm` already allows `type=invite`; invite API was never added | Reuse the confirm page; add the server invite call. |
| Per-user access has nowhere to live | RLS and middleware read only `profiles.role` | Add `user_permissions`, a catalog, and checks at UI, middleware, API, and RLS. |
| Two auth implementations can drift | `authStore.ts` still has its own role booleans while `AuthProvider` is the live path | Carry one server-resolved permission map into the live provider and stop making new checks against the stale store. |

---

## 📌 Context Snapshot (For Next Run)

- **Where things stand:** Planning complete. No application code, schema, or Supabase data has been changed yet. This scratchpad now contains the implementation checklist for both requested features: single-contractor email invite and per-user permissions.
- **Files inspected:**
  - `src/app/(admin)/admin/contractors/page.tsx`
  - `src/app/(admin)/admin/contractors/invite/page.tsx`
  - `src/app/auth/confirm/page.tsx`
  - `src/app/api/auth/profile/route.ts`
  - `src/lib/supabase/admin.ts`
  - `src/lib/supabase/middleware.ts`
  - `src/lib/auth/authorization.ts`
  - `src/lib/auth/portalAccess.ts`
  - `src/lib/auth/roleGuards.ts`
  - `src/components/common/layout/Sidebar.tsx`
  - `src/components/common/layout/navigationConfig.ts`
  - `supabase/migrations/20261001033742_storm_contractor_auth_alignment.sql`
  - `package.json`
  - `grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md`
- **Known absence:** `grid-electric-docs/MASTER_BUILD_INSTRUCTIONS.md` is not in this checkout. The implementation checklist is the local progress record.
- **Next immediate action:** Start at task 1.1 (confirm Supabase invite email configuration). Do not start the permissions screen until the catalog and database helper exist; UI-only hiding would look done and still be bypassable.

---
