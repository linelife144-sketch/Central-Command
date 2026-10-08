# Dashboard gap component specs

Design for the scratchpad gaps that are not already on `/admin/dashboard`.
Implementation owner: @software-engineer. Do not invent fields, routes, or permission keys that are not named here.

Scratchpad line being closed:

> The dashboard headlines with the storm event banner and displays metrics about the tickets flow. Total tickets, active tickets, completed tickets. It shows the active contractors, ticket management, Time Review, Payroll, and expenses. There is a section that navs me to a page for sets access levels to different parts of the app for different roles.

Already present (do not rebuild): Active Contractors MetricCard, DashboardRecentTickets, Time Review quick action.
Total Tickets and a standalone Completed MetricCard are Task 3 / Task 5. Out of scope here.

## Shared rules

- Client components (`'use client'`). Same pattern as `DashboardMetrics.tsx`: local state, `useCallback` loader, `useEffect` on mount.
- Permission gate uses `useAuth().can(key)` and hides the whole section when the key is false. Do not render a locked placeholder.
- Loading, empty, and error are three distinct branches. Never collapse empty into error. Never hide the section on empty.
- Currency via `formatCurrency` from `@/lib/utils/formatters`. Dates via `formatDate` from the same module. Null dates render as an em dash.
- Error copy is a fixed string per component. Do not surface raw Supabase messages.
- Do not call `useActiveStormEventId`. That hook resolves a contractor's assigned ticket storm. The admin banner uses the admin storm list.
- Do not add a payroll-run or next-run-date field. `payrollService` has no run entity. The card shows the current-period summary `getPayrollSummary` already returns.
- New files live under `src/components/features/dashboard/`. Wire them from `src/app/(admin)/admin/dashboard/page.tsx`.

---

## Component 1 — StormEventBanner

### Placement

First child inside the page root `div.space-y-7`, above the existing `cc-dashboard-hero`. The marketing hero stays. The banner is the operational headline the scratchpad asked for; it does not replace the hero.

Gate: `can('admin.storms.view')`. If false, render nothing.

### File

`src/components/features/dashboard/StormEventBanner.tsx`

### Props

```
StormEventBannerProps:
  className?: string
```

No storm id prop. The component resolves the active storm itself so the page stays a layout shell.

### Data contract

```
AdminStormHeadline:
  event: StormEventSummary | null   # null = no operational storm
  contractorCount: number | null    # null = contractor list failed; banner still renders
  loadedAt: string                  # ISO timestamp of the successful resolve
```

`StormEventSummary` is the existing type in `src/lib/services/stormEventService.ts`:

```
id, eventCode, name, utilityClient, status, region,
contractReference, startDate, endDate, notes, createdAt, activeTickets
```

`status` is `StormEventStatus`: `MOB | ACTIVE | DE-MOB | RELEASED | BILLING | CLOSED`.

`contractorCount` comes from `contractorService.listContractors({ activeOnly: true }).length`. Same call `DashboardMetrics` already makes. A failure here sets `contractorCount` to null; it does not fail the banner.

### Service method — new, do not overload the contractor hook

Add to `stormEventService` in `src/lib/services/stormEventService.ts`:

```
getAdminActiveStormEvent(): Promise<StormEventSummary | null>
```

Algorithm:

```
ALGORITHM: ResolveAdminActiveStorm
INPUT: none
OUTPUT: StormEventSummary | null

CONSTANTS:
    OPERATIONAL = { MOB, ACTIVE, DE-MOB, RELEASED, BILLING }
    RANK = MOB:0, ACTIVE:1, DE-MOB:2, RELEASED:3, BILLING:4

BEGIN
    events ← stormEventService.listStormEvents()
    # listStormEvents already drops is_deleted and auth-fails to []

    operational ← events WHERE status IN OPERATIONAL
    IF operational is empty THEN
        RETURN null
    END IF

    SORT operational BY
        RANK[status] ASC,
        startDate DESC NULLS LAST,
        createdAt DESC
    RETURN operational[0]
END
```

Complexity: O(n log n) time, O(n) space, n = non-deleted storm events. n is small (tens). Do not add a new Supabase query; reuse `listStormEvents`.

`CLOSED` is not operational. Zero operational events is the empty state, not an error.

`listStormEvents` returning `[]` because the session is missing is also the empty state. Only a thrown error (network, unexpected PostgREST error) is the error state.

### State branches

| Branch | Condition | Render |
|---|---|---|
| loading | first fetch in flight, no prior data | Skeleton bar, `aria-busy="true"`, label "Loading storm event" |
| error | loader threw | `Alert variant="destructive"`. Copy: `Unable to load the active storm event.` Retry button calls the loader again. Section stays visible. |
| empty | resolve returned null | Banner still visible. Eyebrow `No active storm`. Title `No storm event is active`. Body `Create a storm event to headline this dashboard.` CTA `Create storm event` → `/admin/storms/create`, shown only if `can('admin.storms.edit')`. If edit is false, omit the CTA; keep the copy. |
| ready | resolve returned an event | Full headline below |

Refresh: a ghost `Refresh` button on ready and empty, same control shape as `DashboardMetrics`. Disabled while a refresh is in flight. Refresh failure keeps the last good headline and shows the error alert above it.

### Ready layout

One full-width card. Not a MetricCard.

- Eyebrow: `Active storm`
- Title: `event.name`
- Meta line: `event.eventCode` · `event.utilityClient` · `event.region` (omit region segment when null)
- Status: shadcn `Badge`. Map:
  - `MOB` → secondary, label `Mobilizing`
  - `ACTIVE` → default, label `Active`
  - `DE-MOB` → secondary, label `Demobilizing`
  - `RELEASED` → outline, label `Released`
  - `BILLING` → outline, label `Billing`
- Facts row, three cells:
  1. Started — `formatDate(event.startDate)` or an em dash
  2. Active tickets — `event.activeTickets` (already on the summary; do not recount)
  3. Active contractors — `contractorCount`, or `Unavailable` when null
- Primary CTA: `Open workspace` → `/admin/storms/${event.id}` (live admin workspace route; the brief's `/admin/storms/[stormId]` is this path)
- Secondary CTA: `All storm events` → `/admin/storms`

### Primitives

`Card`, `CardHeader`, `CardTitle`, `CardContent`, `Badge`, `Button`, `Alert`, `AlertDescription`, `Skeleton`. Icons: `CloudLightning` for the eyebrow, `ArrowUpRight` on the workspace CTA. Match existing dashboard class hooks (`cc-eyebrow`) rather than inventing a new visual system.

### Edge cases (in the component, not a follow-up)

- `startDate` null → em dash. Do not fall back to `createdAt` in the Started cell. `createdAt` is only a sort key.
- `activeTickets === 0` → render `0`, not empty.
- `name` empty string → fall back to `event.eventCode`.
- Two events tied on rank and startDate → `createdAt DESC` breaks the tie. Stable. No user picker on the dashboard.
- Component unmount during fetch → ignore the result (same `active` flag pattern as `useActiveStormEventId`).

### Complexity

```
Time: one listStormEvents (existing query) + one listContractors. Dominant cost is the two round-trips.
Space: O(n) for the sort copy, discarded after pick.
```

### Tests the implementer should add

- MOB is chosen over ACTIVE when both exist. ACTIVE is chosen over DE-MOB. CLOSED is ignored.
- Null startDate sorts after a dated event of the same rank.
- Empty list → empty branch, not error.
- Thrown listStormEvents → error branch; retry clears it.

---

## Component 2 — PayrollSummaryCard

### Placement

New section in `page.tsx`, after the `DashboardRecentTickets` + Quick Actions grid:

```
<section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
  PayrollSummaryCard
  ExpensesSummaryCard
  AccessLevelsSection
</section>
```

One column below `lg`, three columns at `lg` and up. Each card is independently gated, so the grid may render 1–3 children. Do not reserve empty columns for a hidden card.

Gate: `can('admin.payroll.view')`.

### File

`src/components/features/dashboard/PayrollSummaryCard.tsx`

### Props

```
PayrollSummaryCardProps:
  className?: string
```

### Data contract

```
PayrollCardModel:
  periodStart: string          # PayrollSummary.periodStart
  periodEnd: string            # PayrollSummary.periodEnd
  generatedAt: string
  totalPayout: number          # totals.totalPayout
  approvedPayout: number | null
  contractorCount: number      # totals.contractorCount
  entryCount: number           # totals.entryCount
  pendingClaims: number        # vehicle claims with status PENDING
```

There is no payroll-run status and no next-run date in `payrollService`. Do not invent them. The card's status is derived:

| Derived status | Rule | Badge |
|---|---|---|
| Nothing to pay | `entryCount === 0` and `pendingClaims === 0` | outline, `No entries` |
| Needs review | `pendingClaims > 0` | secondary, `Claims waiting` |
| Current period | otherwise | default, `Current period` |

### Service calls

Parallel:

1. `payrollService.getPayrollSummary({ includeFinancial: false })`
   - `PayrollFilters` is `{ includeFinancial?, from?, to?, stormEventId?, contractorId? }`.
   - Omit `from` / `to` so the service default period is used. Do not invent a dashboard-specific window.
   - `includeFinancial: false` — this card must not display margin or utility bill. Those stay on `/admin/payroll`.
2. `payrollService.listVehicleClaims({})` then count claims whose status is `SUBMITTED` or `UNDER_REVIEW`.

`PayrollSummary.totals` fields used: `totalPayout`, `approvedPayout`, `contractorCount`, `entryCount`. Ignore `utilityBillAmount`, `marginAmount`, `marginPercent`.

If `getPayrollSummary` throws, the card is in error even if claims succeeded. If only `listVehicleClaims` throws, render the summary and set the claims display to `Unavailable`. That is a partial, not a full error.

### State branches

| Branch | Render |
|---|---|
| loading | Card shell + three Skeleton value lines. `aria-busy="true"`. |
| error | Card stays. `Alert variant="destructive"`. Copy: `Unable to load payroll summary.` Retry button. |
| empty | `entryCount === 0` and `pendingClaims === 0` (and claims did not fail). Title `Payroll`. Body `No payroll entries in the current period.` Link still present. |
| ready | Facts below |

### Ready layout

`Card` with `CardHeader` / `CardTitle` `Payroll`, status `Badge`, `CardContent`.

- Period: `formatDate(periodStart)` – `formatDate(periodEnd)`
- Total payout: `formatCurrency(totalPayout)`
- Approved payout: `formatCurrency(approvedPayout)` or an em dash when null
- Contractors: `contractorCount`
- Time entries: `entryCount`
- Vehicle claims waiting: `pendingClaims` or `Unavailable`
- Footer link: `Open payroll` → `/admin/payroll` (`ArrowRight`)

### Primitives

`Card`, `CardHeader`, `CardTitle`, `CardContent`, `Badge`, `Button`, `Alert`, `AlertDescription`, `Skeleton`.

### Edge cases

- `totalPayout === 0` with `entryCount > 0` is ready, not empty. Zero money is a real total.
- Negative payout renders via `formatCurrency` as-is. Do not clamp.
- `includeFinancial` response fields, if the service returns them anyway, are not rendered.

### Complexity

Two round-trips, O(c) to count claims, c = claim rows returned. No sort.

---

## Component 3 — ExpensesSummaryCard

### Placement

Middle cell of the same 3-column section. Gate: `can('admin.expenses.view')`.

### File

`src/components/features/dashboard/ExpensesSummaryCard.tsx`

### Props

```
ExpensesSummaryCardProps:
  className?: string
```

### Data contract

```
ExpensesCardModel:
  pendingReportCount: number     # distinct expense_report_id where report_status in {SUBMITTED, UNDER_REVIEW}
  pendingAmount: number          # sum of item.amount over those pending items, rounded to cents
  recent: ExpenseActivity[]      # up to 3, newest updated_at first
  truncated: boolean             # reserved; set false unless the service signals a cap

ExpenseActivity:
  id: string                     # ExpenseListItem.id
  reportId: string
  contractorName: string         # contractor_name, else "Contractor"
  amount: number
  status: SUBMITTED | UNDER_REVIEW
  updatedAt: string
```

Pending set matches `PENDING_EXPENSE_STATUSES` in `dashboardReportingService.ts`: `SUBMITTED`, `UNDER_REVIEW`. Do not include `DRAFT`, `APPROVED`, `REJECTED`, `PAID`.

### Service call

```
expenseProcessingService.listReviewItems({ status: 'SUBMITTED' })
expenseProcessingService.listReviewItems({ status: 'UNDER_REVIEW' })
```

`listReviewItems` filters are `ExpenseListFilters`: `{ contractorId?, status?, from?, to? }`. Status is a single value, so two calls, `Promise.all`. Do not pass `status: 'ALL'` and filter client-side — that pulls approved history onto the dashboard.

`ExpenseListItem` fields used: `id`, `expense_report_id`, `contractor_name`, `amount`, `report_status`, `updated_at`.

Aggregate:

```
ALGORITHM: BuildExpensesCard
INPUT: submittedItems, underReviewItems
OUTPUT: ExpensesCardModel

BEGIN
    items ← CONCAT(submittedItems, underReviewItems)
    DEDUPE items BY id
    items ← items WHERE report_status IN { SUBMITTED, UNDER_REVIEW }

    reportIds ← SET of item.expense_report_id
    pendingAmount ← ROUND_CENTS(SUM(item.amount))
    # amount is per item, not per report. Sum items. Do not also sum a report total.

    SORT items BY updated_at DESC
    recent ← first 3 mapped to ExpenseActivity
    RETURN { reportIds.size, pendingAmount, recent, truncated: false }
END
```

Complexity: O(m log m) for the sort, m = pending items. Space O(m).

If either call throws, the card is in error. Do not show a half-sum.

### State branches

| Branch | Render |
|---|---|
| loading | Card shell + skeleton rows |
| error | Copy: `Unable to load expense reviews.` Retry. |
| empty | `pendingReportCount === 0`. Body `No expense reports are waiting for review.` Link still present. Recent list omitted. |
| ready | Facts + up to 3 activity rows |

### Ready layout

- Title `Expenses`, badge `Pending` when count > 0
- Pending reports: `pendingReportCount`
- Pending amount: `formatCurrency(pendingAmount)`
- Recent activity: contractor name, `formatCurrency(amount)`, status badge, `formatDate(updatedAt)`
- Footer link: `Review expenses` → `/admin/expense-review`

### Edge cases

- Two items on the same report count as one report and two amounts. Intentional: the list API is item-scoped, and `total_amount` is not on `ExpenseListItem`.
- `contractor_name` missing → `Contractor`.
- `amount` null or NaN → treat as 0 (same rule as `normalizeNumber` in the reporting service).
- Duplicate item ids across the two status calls → dedupe by `id` before sum.

### Note for the implementer

`DashboardMetricsData.pending_expense_reports` is a report count, not an amount, and it is not exported as a standalone fetch. Do not read it from `DashboardMetrics` state. This card owns its own fetch so it can show amount and recent rows.

---

## Component 4 — AccessLevelsSection

### Placement

Third cell of the same section. This is a navigation section, not a metrics card. It does not fetch users.

Gate: `can('admin.users.view')`. Catalog comment says this module is Super Admin only (`roleDefault` returns true only for `CEO` and `SUPER_ADMIN`). Trust `can()`. Do not re-check the role in the component.

### File

`src/components/features/dashboard/AccessLevelsSection.tsx`

### Props

```
AccessLevelsSectionProps:
  className?: string
```

### Data contract

No network. Source of truth is `PERMISSION_MODULES` in `src/lib/auth/permissionCatalog.ts`.

```
AccessModuleRow:
  id: PermissionModuleId
  label: string
  description: string
  group: string
  path: string
  editable: boolean
```

Map each `PERMISSION_MODULES` entry to a row. Drop `id === 'assignments'` from the list. Its path aliases `/admin/storms` and it is not a destination of its own (`permissionLanding` already skips it).

Role definitions are static copy, matching `UserRole` and `roleGuards.ts`. Do not query profiles.

```
CEO          → Full access, including people and access
SUPER_ADMIN  → Full access, including people and access
ADMIN        → Tickets and assessments, unless a Super Admin grants more
```

Only the three admin-class roles render. One line under the list: `Field roles do not open the admin console.`

### State branches

No loading branch. No error branch. This component cannot fail closed on data.

| Branch | Condition | Render |
|---|---|---|
| hidden | `can('admin.users.view')` is false | render null |
| ready | otherwise | always. If `PERMISSION_MODULES` were empty, body `No modules are configured.` |

### Ready layout

`Card`.

- Eyebrow `Administration`
- Title `Access levels`
- One paragraph: `Set what each role can open. Changes are per person, on their access page.`
- Role list: the three admin-class definitions above, label + summary
- Module list: group by `group` (`Operations`, `Review & reporting`, `Administration`). Each row is `label` plus `View` and, when `editable`, `Edit`. Rows are text, not links to the module path. This section navigates to access management, not into each module.
- Primary link: `Manage people and access` → `/admin/users`
- Secondary line: `Open a person to set their access levels.` The per-person route is `/admin/users/[id]/permissions`. The dashboard does not pick an id. Do not link to a bare permissions URL.

### Primitives

`Card`, `CardHeader`, `CardTitle`, `CardContent`, `Badge` (for View / Edit), `Button` asChild + `Link`.

### Edge cases

- A viewer who can open `/admin/users` but not edit still sees the section. The destination page enforces edit. Do not hide the link behind `admin.users.edit`.
- Do not duplicate the sidebar. The sidebar already has `People & access`. This section exists because the scratchpad requires the dashboard itself to navigate there.

---

## Page wiring

`src/app/(admin)/admin/dashboard/page.tsx` order after this spec:

1. `StormEventBanner` (gated inside the component)
2. existing `cc-dashboard-hero`
3. existing `DashboardMetrics`
4. existing recent-tickets + quick-actions grid
5. new 3-card section (`PayrollSummaryCard`, `ExpensesSummaryCard`, `AccessLevelsSection`)

Quick actions stay as they are. Do not add Payroll, Expenses, or Access rows there. Those are the new cards. Time Review is already a quick action.

## Out of scope

- `total_tickets` on `DashboardMetricsData` (Task 3)
- Total Tickets and Completed MetricCards (Task 5)
- Changing `useActiveStormEventId`
- A payroll run scheduler
- Fetching the user directory inside the access section

## Handoff checklist for @software-engineer

- [ ] `getAdminActiveStormEvent` added to `stormEventService` and covered by the rank tests above
- [ ] Banner above the hero, empty state visible with no active storm
- [ ] Three cards in one responsive grid, each permission-gated
- [ ] Payroll card does not render margin fields
- [ ] Expense pending amount is a sum of item amounts; report count is distinct `expense_report_id`
- [ ] Access section links to `/admin/users` only
- [ ] `tsc --noEmit` and `npm run lint` pass
- [ ] No change to existing MetricCard fields
