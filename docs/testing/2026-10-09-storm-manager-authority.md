# B4 Storm Manager Authority — Implementation and Verification

**Date/agent:** 2026-10-09, Codex /root
**Workspace/project:** Canonical Desktop Central Command checkout; Supabase `xcvacmreerrypygpritq`.
**Requirements:** CC-02; AC-02, with preservation dependencies on CC-01/CC-06 and AC-18/19.
**Status:** Application/schema/setup-detail implementation and local verification are recorded. Authenticated native-manager, same-record and genuine concurrent-transaction acceptance remain open. The full workflow master-plan goal remains active.

## Resulting behavior

Native application role `STORM_MANAGER` receives the existing management capabilities beneath the CEO. Shared application/server/session/navigation checks and the database compatibility helpers recognize native and legacy managers; a contractor's Storm Manager pay role confers no application authority. Existing reviewer and contractor access restrictions remain.

Storm creation requires an explicitly selected eligible management profile and saves storm, rate card and manager atomically. Storm detail shows the saved manager and supports controlled audited reassignment with compare-before-update protection. CEO profiles are protected and excluded from manager candidates. Native managers have no company-wide one-account cap; one responsible manager per storm does not restrict a manager's management access to that storm.

Existing unconfigured test storms retain null responsibility pending an explicit assignment. Closed history is fixed. Active assigned managers cannot be deactivated, demoted, put into password setup, or denied required storm access without reassignment. Reopening/restoring a configured operational storm revalidates its manager. Password setup cannot invalidate the last usable native or legacy manager.

Management identity remains distinct from contractor identity, pay role, operational Team Lead and reviewer identity. All existing dashboards, navigation, field forms/actions, GPS/photo evidence, map controls, review, offline work and exports are retained. No account was promoted, manager inferred, or business/test record reset during activation.

## Implementation anchors

- `src/lib/auth/roleGuards.ts`, `permissionCatalog.ts`, `serverPermissions.ts`, `src/lib/supabase/middleware.ts`, `src/stores/authStore.ts`, and mounted management comparisons: coordinated native authority, landing/access and permission restrictions.
- `src/lib/provisioning/userProvisioning.ts`: trusted provisioning aliases accept native managers; user-editable metadata/pay role cannot create authority.
- `src/components/features/admin/UserPermissions.tsx`: native/legacy permission administration with CEO/self protections.
- `src/components/features/storms/StormManagerControl.tsx`: verified options, required selection, read-only closed state, cancelled stale reads, visible unavailable state and controlled change.
- `src/app/(admin)/admin/storms/create/page.tsx` and `src/components/features/storms/StormWorkspace.tsx`: create/detail integration preserving rates, roster and ticket controls.
- `src/lib/services/stormEventService.ts` and `src/lib/testing/localTestStore.ts`: explicit manager payload, persisted readback and stale-manager comparison. Main and template-compatibility list/detail projections all include `responsible_manager_id`.
- `src/types/database.ts`: regenerated from actual live Supabase after authority activation, including native enum, manager relationship and RPC signatures. The lifecycle follow-up changes only private trigger functions, with no exposed signature change.

## Applied migrations and readback

| Local source | Live ledger version | Outcome |
|---|---|---|
| [Enum migration](../../supabase/migrations/20261009182625_add_storm_manager_application_role.sql) | `20261009184240` | Native application-role enum committed separately before use. |
| [Authority and responsibility](../../supabase/migrations/20261009182630_storm_manager_authority_and_responsibility.sql) | `20261009185436` | Compatible helper contracts, responsible-manager FK/index, eligibility/account/permission guards, options/reassignment RPC and atomic create. |
| [Additive lifecycle guards](../../supabase/migrations/20261009191431_storm_manager_lifecycle_guards.sql) | `20261009192037` | Two narrow extra trigger functions/checks; existing authority functions/triggers/grants/policies retained. |

The authority activation was retried only after live baseline refresh confirmed no function drift. Readback matched all 17 reviewed function bodies, relationship/index, trigger definitions, search paths and execution permissions. An earlier request with `invalid_request_state` had not applied it.

Independent source review identified missing manager projections, lifecycle revalidation and last-manager password-setup loss. Regression cases reproduced each defect before correction. Automatic approval review rejected a follow-up variant that replaced existing guard bodies as insufficiently proven equivalent. That variant was not applied. The saved/applied follow-up instead adds two narrow guards and leaves the existing definitions and assignment trigger unchanged. Exact preservation assertions pass locally and live readback confirms the existing authorization/assignment guard definitions, ACLs/configuration and trigger are unchanged.

Durable evidence:

- [Authority activation/readback JSON](storm-manager-authority-live-20261009.json).
- [Lifecycle activation, preserved definitions, exact new bodies, triggers, ledger and counts](storm-manager-lifecycle-live-20261009.json).
- [Authority security-advisor comparison](storm-manager-advisor-comparison-20261009.json). Lifecycle comparison is included in its readback JSON.

The following counts include inactive/deleted/test records and stayed identical before and after both activations:

| Records | Count |
|---|---:|
| Storms | 3 |
| Tickets | 6 |
| Profiles | 9 |
| Auth users | 9 |
| Contractors | 7 |
| Personal time entries | 10 |
| Expense reports | 0 |
| Audit logs | 16 |

Readback at authority activation found zero configured storms and zero native-manager profiles. This is expected compatibility/test state, not a successful real-manager acceptance run or an instruction to auto-assign/promote accounts.

Security advisors reported no new findings. Two pre-existing warnings remain: deliberate guarded `public.set_ticket_disabled` authenticated SECURITY DEFINER exposure and disabled leaked-password protection. This checkpoint does not claim their resolution.

## Local verification

| Check | Observed result |
|---|---|
| `npm test`, final serial run after projection correction | **772 tests / 140 files pass**, exit 0, 23.05 seconds. |
| Scoped ESLint across 33 affected application/type/test files | Pass, exit 0. |
| Strict active-source diagnostic typecheck with temporary config | Pass, exit 0. This is a scoped diagnostic, not repository/build acceptance. |
| Repository `tsc --noEmit` | Exit 2: same 16 errors in six archival payroll copies. |
| Isolated `next build --webpack` | Compilation succeeded; typecheck stopped at the same archival errors. Build exit 1. |
| [Isolated authority harness](../../scripts/verification/storm-manager-authority.mjs) | **18 groups pass**, exit 0, PGlite. |
| AST Graphify update | Pass, exit 0: 14,753 nodes, 30,868 edges and 758 communities. Structural source update; no semantic document extraction claimed. |
| Local browser session at `/admin/dashboard` | Redirected to `/forbidden`; authenticated management acceptance not demonstrated. |

The archival errors are in `UtilityBillingRateEditor 2.tsx` / `3.tsx`, `payrollService 2.ts` / `3.ts`, and `payroll.test 2.ts` / `3.ts`. None were deleted, and project strictness was not weakened. Build-added alternate output type paths in tsconfig/next-env were restored to their exact pre-build contents.

Harness coverage includes native/legacy/CEO helpers, pay-role and reviewer isolation, inactive/setup denial, candidate eligibility, required manager, atomic storm/rate/manager create and raw audit identity, compare-before-update, active-assignment protection, self/CEO/last-manager protections, grants, trusted Auth metadata, closed history, reopen/restore rejection for invalid managers, legacy null compatibility, last-manager setup loss, and preservation of four existing guard definitions/ACLs plus the assignment trigger.

The harness uses inspected real helper definitions and migrations with a small authenticated/RLS fixture; compensation validators and week calculation are stubbed. It does not prove live HTTP/RLS access, physical evidence capture, or genuine simultaneous transactions. The stale comparison test is sequential.

An earlier full run while other heavy verification jobs were active timed out one AuthProvider focus-refresh assertion (767 pass/1 fail). The isolated AuthProvider suite subsequently passed 9/9, a serial full run passed 768/768, and the final run after the four new projection cases passed 772/772. Resource contention is not asserted as a proven root cause.

Raw local logs are retained for this session:

- `/private/tmp/cc-manager-review-tests-20261009.log`
- `/private/tmp/cc-manager-review-lint-20261009.log`
- `/private/tmp/cc-manager-review-active-types-20261009.log`
- `/private/tmp/cc-manager-review-root-types-20261009.log`
- `/private/tmp/cc-manager-build-20261009.log`
- `/private/tmp/cc-manager-review-db-red-20261009.log`
- `/private/tmp/cc-manager-review-setup-red-20261009.log`
- `/private/tmp/cc-manager-review-additive-db-20261009.log`
- `/private/tmp/cc-manager-tests-final-live-20261009.log` and `cc-manager-auth-timeout-investigation-20261009.log` for the intermittent auth assertion.

## Outstanding acceptance and next work

- [ ] Real CEO/native-manager and restricted reviewer/contractor sessions across navigation, server operations and live RLS; AC-02.
- [ ] Create and reload the same manager-linked storm/rates, reassign with a stale second session, and verify audit identity and UI readback.
- [ ] Genuine concurrent assignment/profile/permission/lifecycle transactions with expected rejection and no invalid final assignment.
- [ ] Resolve repository archival type/build gate with an explicit preservation-compatible task; do not use scoped types as launch proof.
- [ ] B5 remaining dashboard/creation/cache/offline/export context, then C–I and connected/device acceptance.
- [ ] Separate approved launch reset/bootstrap; no reset is authorized by this checkpoint.

[The B5 decomposition](../plans/2026-10-09-management-storm-context-completion.md) is saved from the current source audit. Its implementation and acceptance remain pending.

Checkpoint documentation verification passed: 34 local links resolve, the original scratchpad and historical implementation/checklist sections remain identical, all 11 CC requirements and 19 AC scenarios remain in the master plan, and all five B5 tasks remain pending implementation. No Git operation was performed.
