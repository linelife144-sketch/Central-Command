# Implementation Plan

## Overview

Revamp the Central Command design system so the UI feels reactive and premium — layered elevation, brand-tinted focus/hover accents, and consistent motion — while keeping the exact existing Grid Electric color palette (`#2ea3f2` / `#002168` / `#ffc038` and the semantic set) unchanged.

**Scope:** `src/app/globals.css` (the single source of truth) plus the 26 primitives in `src/components/ui/`. No page, feature, layout, or data-layer files are touched, so there is zero behavioral risk and the change ships as one reviewable theme commit.

**Context:** Tailwind v4 is configured entirely through CSS (`@theme inline` at `globals.css:24-68`) — there is no `tailwind.config.ts`, so *all* new design tokens must be declared in CSS. Primitives are stock shadcn "new-york" with minor local edits. `.storm-*` classes (39 consumers) are a hand-tuned dark-navy/lightning theme with hardcoded shadows; these are refactored to read the new tokens so there is one source of truth, **with identical computed values** so nothing visually regresses.

**Approach:** three tiers, bottom-up — (1) a token layer (elevation, motion, accent, surface) exposed through `@theme inline` so Tailwind generates real `shadow-elevation-*` / `ease-*` / `animate-*` utilities; (2) an interaction layer (`.interactive-lift`, `.interactive-press`, `.focus-ring`, `.surface-raised`, `.accent-hairline`) usable by any component; (3) per-primitive adoption plus new interactive variants (`Button` → `elevated`/`accent`/`glass`; `Card` → `interactive`/`elevated`/`glass`; `Badge` → semantic soft variants). `prefers-reduced-motion` is honored globally and per-class.

---

## Types

No domain types change. New TypeScript surface is limited to variant unions and one new prop.

**`src/components/ui/button.tsx`**

```ts
variant: "default" | "storm" | "destructive" | "outline" |
         "secondary" | "ghost" | "link" | "elevated" | "accent" | "glass"
```

- `elevated` — raised light surface, `--shadow-elevation-md`, lifts to `lg` on hover.
- `accent` — navy→grid-blue brand gradient, `--shadow-brand`, lift + brighten on hover.
- `glass` — translucent, `backdrop-blur`, hairline border; for use over `.storm-surface` / `.bg-grid-shell`.

**`src/components/ui/card.tsx`**

```ts
type CardVariant = "default" | "elevated" | "interactive" | "glass";
interface CardProps extends React.ComponentProps<"div"> { variant?: CardVariant }
```

`variant` is optional with `"default"`, so all existing `<Card className=…>` call sites keep working untouched. Rendered as `data-variant={variant}` on the existing `data-slot="card"` element (already targeted by `.storm-card [data-slot='card-title']` rules, so the attribute is safe to add).

**`src/components/ui/badge.tsx`**

```ts
variant: "default" | "secondary" | "destructive" | "outline" |
         "ghost" | "link" | "success" | "warning" | "danger" | "info" | "brand"
```

New keys are additive; `data-variant` is already emitted and is used by the `.storm-card [data-slot='button'][data-variant='destructive']` selector pattern, so no selector breakage.

**`src/app/globals.css` — `@theme` namespace additions** (these *are* the design-system types; Tailwind v4 generates utilities from them):

| Token | Generates | Intent (brand colors unchanged) |
| --- | --- | --- |
| `--shadow-elevation-xs` | `shadow-elevation-xs` | hairline lift |
| `--shadow-elevation-sm` | `shadow-elevation-sm` | cards at rest |
| `--shadow-elevation-md` | `shadow-elevation-md` | raised / hover state |
| `--shadow-elevation-lg` | `shadow-elevation-lg` | popovers, menus, hover lift |
| `--shadow-elevation-xl` | `shadow-elevation-xl` | dialogs, sheets, command palette |
| `--shadow-brand` | `shadow-brand` | `0 4px 14px rgba(46,163,242,.39)` from `04-DESIGN-SYSTEM.md` |
| `--shadow-brand-lg` | `shadow-brand-lg` | brand glow on hover |
| `--shadow-inset-top` | `shadow-inset-top` | `inset 0 1px 0 rgba(255,255,255,.6)` |
| `--ease-standard` / `--ease-emphasized` / `--ease-spring` | `ease-standard` / `ease-emphasized` / `ease-spring` | shared easing curves |
| `--animate-lift-in` / `--animate-shimmer` / `--animate-accent-pulse` | `animate-lift-in` / `animate-shimmer` / `animate-accent-pulse` | named animations |

New `:root` / `.dark` semantic tokens (brand-preserving):

- `--surface-raised`, `--surface-sunken`, `--border-strong`, `--accent-hairline`, `--accent-ring`
- `--focus-ring-width: 3px`, `--focus-ring-offset: 2px`
- `--grid-*-ink` readable-ink shades for soft status fills
- `--shadow-storm-*` aliases so the dark storm surfaces share one elevation source of truth

**Brand palette promoted into the `--color-grid-*` namespace.** Previously the `--grid-*` hexes were plain CSS variables, so `bg-grid-storm-100` (used in 5 existing files) and `bg-grid-navy-dark/70` resolved to nothing. They are now real theme colors, which also enables opacity modifiers and gradient stops (`from-grid-storm-100`).

## Files

### New files

| Path | Purpose |
| --- | --- |
| `src/components/ui/theme.contract.test.ts` | Vitest contract test: asserts every new token exists in `globals.css`, brand hexes are unchanged, every new `cva` variant resolves, storm classes still exist, and reduced-motion support is intact. |
| `implementation_plan.md` | This document. |

### Primary file

**`src/app/globals.css`** — edited by region:

1. `:root` — new motion/elevation/surface/accent/ink tokens + storm shadow aliases.
2. `.dark` — mirrored elevation (deeper) and surface tokens.
3. `@theme inline` — brand palette into `--color-grid-*`, plus shadow/ease/animate/color namespaces.
4. `@layer base` — brand-tinted global `:focus-visible` ring for interactive elements.
5. `@layer utilities` — soft status fills, ink text colors, dark-mode soft-fill overrides.
6. `.storm-*` refactor — every literal `box-shadow` replaced with a `--shadow-storm-*` / `--shadow-elevation-*` reference; lift transitions moved to `ease-emphasized`; `.shadow-card`/`.shadow-card-hover` now alias the shared scale.
7. New `@layer utilities` interaction layer + `@keyframes lift-in|shimmer|accent-pulse` + reduced-motion coverage.

### Modified files (all in `src/components/ui/`)

| File | Change |
| --- | --- |
| `button.tsx` | New `elevated`, `accent`, `glass` variants; brand shadow + hover lift + press feedback on `default`; `storm` variant untouched. |
| `card.tsx` | New `cardVariants` (default/elevated/interactive/glass) + optional `variant` prop + `data-variant`. |
| `badge.tsx` | New `success`/`warning`/`danger`/`info`/`brand` soft variants with matching borders + ink text; press feedback. |
| `input.tsx`, `textarea.tsx` | Elevation token, hover border/shadow, stronger focus ring. |
| `select.tsx` | Trigger hover/elevation; content elevation; item highlight slide; gradient separator. |
| `dialog.tsx`, `sheet.tsx` | Navy + blur overlay, xl elevation, stronger border, roomier close button, rounded mobile sheet. |
| `popover.tsx`, `dropdown-menu.tsx` | Elevation + hairline border + item hover slide + gradient separators. |
| `tabs.tsx` | Sunken list, elevated active trigger, brand underline. |
| `table.tsx` | Sunken header, accent row hover, heavier header weight, roomier cells. |
| `progress.tsx` | Tokenized track (no more `slate`/`blue-600`) + navy→blue gradient indicator with brand glow. |
| `switch.tsx`, `checkbox.tsx`, `radio-group.tsx` | Elevation, hover border, `active:scale-90`, brand glow when checked. |
| `alert.tsx` | Left accent bar, elevation, brand-tinted destructive, entrance animation. |
| `avatar.tsx` | Elevation ring, brand badge, gradient fallback. |
| `skeleton.tsx` | Brand-tinted shimmer (was a plain pulse). |
| `separator.tsx`, `scroll-area.tsx` | Gradient fade rule; elevated thumb with hover. |
| `calendar.tsx`, `command.tsx`, `form.tsx`, `label.tsx`, `sonner.tsx` | Elevation, focus, hover, and toast polish. |
| `button.theme.test.ts` | Extended with new-variant assertions. |

### Files explicitly NOT modified

`src/app/layout.tsx`, `src/app/**/page.tsx`, `src/components/features/**`, `src/components/common/**`, `package.json`, `postcss.config.mjs`, `components.json`.

## Functions

- **New:** `Card({ className, variant, ...props })` — `src/components/ui/card.tsx`. Optional `variant`, so all existing `<Card className=…>` call sites are unaffected.
- **New:** `cardVariants` — exported from `src/components/ui/card.tsx`.
- **Modified:** `Button` — `src/components/ui/button.tsx`; widened `variant` union, class-string changes only. `buttonVariants` and `badgeVariants` signatures unchanged.
- **Removed:** none. All 26 primitives keep every existing export.

## Classes

- **New CSS classes:** `.interactive-lift`, `.interactive-press`, `.focus-ring`, `.sheen-brand`, `.surface-raised`, `.surface-sunken`, `.stagger-children`, `.hover-lift-sm`, `.hover-glow-brand`, `.skeleton-shimmer`, `.separator-fade`.
- **New `@keyframes`:** `lift-in`, `shimmer`, `accent-pulse`.
- **Retained:** `.storm-card`, `.storm-surface`, `.storm-metric-card`, `.storm-contrast-button`, `.storm-contrast-field`, `.storm-mini-stat`, `.assessment-command-*`, `.shadow-card`, `.shadow-card-hover`, `.animate-fade-in`, `.animate-slide-in`, `.animate-pulse-ring`, `fadeIn`, `slideIn`, `.bg-grid-*`, `.text-grid-*`, `.bg-gradient-*`, `.safe-area-*`, `.transition-grid`, `.text-balance`.

## Dependencies

**None.** No packages added, removed, or version-bumped. Uses Tailwind v4 `@theme` namespaces, `tw-animate-css`, `class-variance-authority`, and `color-mix()` (already in use at `globals.css:245`).

## Testing

**New:** `src/components/ui/theme.contract.test.ts` — 10 tests across 4 suites:

1. Elevation-scale token existence.
2. Motion/easing token existence.
3. Surface/border/accent token existence.
4. `@theme` exposure (elevation, easing, animations, surface colors).
5. Interaction-class existence.
6. Keyframe existence.
7. Brand-hex immutability (all 15 `--grid-*` values).
8. Storm-class + storm-shadow-alias regression guard (asserts shadows come from tokens, not literals).
9. Legacy animation aliases + `prefers-reduced-motion` retained.

**Modified:** `src/components/ui/button.theme.test.ts` — original storm assertions preserved; new `buttonVariants interactive variants`, `badgeVariants semantic variants`, and `cardVariants` suites added (9 tests total).

**Validation performed:**

```bash
npm run typecheck      # pass — tsc --noEmit clean
npm run lint           # 0 errors/warnings in src/components/ui and globals.css
                       # (31 errors remain, all pre-existing in unrelated files)
npx vitest run         # 249/249 pass across 55 files
next build             # "Compiled successfully" + "Finished TypeScript"
```

**Gotchas discovered:**

- `npm run test` / `npm run test:watch` invoke `vitest` in **watch mode** and appear to hang. Use `npx vitest run` for CI-style runs.
- `.next/dev/types/` had stale macOS duplicates (`cache-life.d 2.ts`, `routes.d 2.ts`) that made `next build` fail its typecheck step. `npm run clean:next` clears them.
- `next build` currently fails **prerendering `/auth/confirm`** with `useSearchParams() should be wrapped in a suspense boundary`. This is **pre-existing and unrelated** — `src/app/auth/confirm/page.tsx:14` calls `useSearchParams()` with no `<Suspense>` boundary. Left untouched as out of scope.
- CSS generation was verified independently by compiling `globals.css` through `@tailwindcss/postcss` (176 KB output) and asserting every new utility is present, including variant-prefixed (`hover:shadow-brand`) and important (`shadow-elevation-lg!`) forms.
- Emission order verified: `.shadow-elevation-sm` @ 54,971 bytes, `.storm-card` @ 151,433 bytes. Hand-written utilities land after Tailwind's generated ones, so `.storm-card` still overrides the `Card` default shadow — no storm regression.

## Implementation Order

1. `globals.css` — token layer (`:root` + `.dark` + `@theme inline` namespaces).
2. `globals.css` — storm indirection (pure refactor; identical computed values).
3. `globals.css` — soft status fills, ink shades, dark-mode overrides.
4. `globals.css` — interaction layer + keyframes + reduced-motion coverage.
5. `globals.css` — base `:focus-visible` polish; CSS validated by compiling the stylesheet.
6. Interactive primitives: `button.tsx`, `card.tsx`; extend `button.theme.test.ts`.
7. Form primitives: `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `label`, `form`, `calendar`.
8. Surfaces & overlays: `dialog`, `sheet`, `popover`, `dropdown-menu`, `command`, `sonner`.
9. Data display & feedback: `table`, `progress`, `alert`, `badge`, `avatar`, `skeleton`, `separator`, `scroll-area`.
10. Create `theme.contract.test.ts`.
11. Full validation: typecheck → lint → `vitest run` → CSS compile → build.
12. Update `grid-electric-docs/04-DESIGN-SYSTEM.md` (§4.3, new §4.4, §7.2–§7.5) and the Document Control table.

## Documented Deviations From The Plan As Originally Sketched

- **`.accent-hairline` is not a hand-written class.** Promoting the brand palette into the `--color-*` namespace produced `border-accent-hairline`, the idiomatic Tailwind v4 form. A duplicate hand-written class would have been redundant.
- **`.gradient-sheen` became `.sheen-brand`.** The pseudo-element version needed `z-index: -1` + `isolation` to avoid painting over button labels. A two-layer `background-image` (top-light over navy→blue) achieves the same with no stacking-context risk.
- **No `animate-lift-in` on `Dialog`/`Sheet` content.** They already use `tw-animate-css`'s `animate-in`/`zoom-in-95`; adding a second `animation` declaration on the same element would override it.
- **Brand palette promoted into `@theme`** (not in the original sketch) to fix previously dead `bg-grid-storm-100` classes used in 5 existing files, and to make `bg-grid-navy-dark/70` overlays resolve.

---

# Phase 2 — Build Blockers + Admin Portal Restyle

## Overview

Fix the two prerender failures and the watch-mode `test` script, then close the
visual gap that made the admin portal look unchanged after Phase 1.

**Root cause of the "still looks the same" report:** Phase 1 landed in
`src/components/ui/**`, which *both* portals share — it was never
contractor-only. But the admin shell is built from `src/components/common/**`,
which was out of scope and hardcoded `slate`/`blue-600`/`bg-white`. Worse,
`AppShell.tsx` painted `bg-slate-50` over the branded `bg-grid-shell` set on
`<body>`, so the admin portal never showed the brand background at all, and
`MetricCard` passed `bg-white` into `Card`'s `className`, which wins over
`bg-card` via `twMerge`.

## Types

No type changes. `StatusVariant` and `MetricCardProps['variant']` keep their
exact unions — only the style maps behind them changed.

## Files

| File | Change |
| --- | --- |
| `scripts/clean-next-duplicates.ts` | **New.** Removes macOS-forked `* 2.ts` / `* 2.json` artifacts. Scoped to `.next/types` and `.next/dev/types` only — a broad recursive sweep of `.next` is unsafe because Turbopack emits chunk names that legitimately contain `" 2"`. |
| `scripts/clean-next-duplicates.test.ts` | **New.** 6 tests: removal, false-positive protection, idempotency, missing-dir no-op, default-scope guard. |
| `package.json` | `predev`/`prebuild` hooks; `test` → `vitest run` (`test:watch` keeps watching). |
| `src/app/auth/confirm/page.tsx` | `useSearchParams` moved into `AuthConfirmInner`, wrapped by a new `AuthConfirmPage` default export with `<Suspense fallback={<ConfirmSkeleton/>}>`. Retokened off `slate`/`blue`/`green`/`red`. |
| `src/app/(contractor)/contractor/assessments/create/page.tsx` | Same Suspense pattern with `AssessmentCreateInner` + `AssessmentCreateSkeleton`. This was the *second* failure the build never reached. |
| `layout/AppShell.tsx` | `bg-slate-50 dark:bg-slate-900` → `bg-grid-shell`; content wrapper gets `animate-lift-in`; removed unused `user` destructure. |
| `layout/TopBar.tsx` | Glass `bg-background/85` + `backdrop-blur-md` + `shadow-elevation-sm` → `md` on hover; brand notification pill; gradient avatar fallback; removed unused `Menu` import. |
| `layout/Sidebar.tsx` | `bg-surface-raised`; active nav item = `bg-grid-blue-soft` + `border-accent-hairline` + blue rail + `aria-current`; icon scale on hover; removed `bg-blue-600` logo chip. |
| `layout/BottomNav.tsx` | Glass nav + `shadow-elevation-lg`; active pill + top brand rail + `aria-current`; removed unused `Receipt` import. |
| `layout/PageHeader.tsx` | Token colors, hover-elevated back button, `animate-lift-in`. |
| `data-display/MetricCard.tsx` | Dropped `bg-white dark:bg-slate-800` so `Card`'s `bg-card` renders; now uses `variant="interactive"` (lift + elevation). Variants retokened to `*-soft` / `border-grid-*`; trends use `*-ink` for contrast. |
| `data-display/StatusBadge.tsx` | All 12 variants retokened; dot colors moved from inline conditionals to a `dotStyles` lookup; added border + `shadow-elevation-xs`; `aria-hidden` on the dot. |
| `data-display/DataTable.tsx` | `rounded-xl` + `border-border-strong` + `bg-card` + `shadow-elevation-sm`; header `bg-surface-sunken`; rows `hover:bg-accent/60`. |
| `brand/BrandMark.tsx` | `text-blue-200` → `text-grid-blue-light` (caught by the new guard test). |
| `src/components/common/legacy-color-guard.test.ts` | **New.** Fails if any default-Tailwind-palette class reappears in `src/components/common/**`. |

## Functions

- **New:** `AuthConfirmInner()`, `ConfirmSkeleton()`; `AssessmentCreateInner()`, `AssessmentCreateSkeleton()`; `cleanNextDuplicates()`.
- **Modified:** none. All existing component signatures and exports preserved.

## Classes

No new custom CSS classes needed — Phase 2 only consumes Phase 1's token set.

## Dependencies

**None.** Uses React's built-in `Suspense`.

## Testing

**New:** `scripts/clean-next-duplicates.test.ts` (6 tests),
`src/components/common/legacy-color-guard.test.ts` (17 tests).

**Validation results:**

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `eslint` on `common`, `ui`, new scripts | 0 problems |
| `npx vitest run` | **276/276 pass**, 57 files (was 249/55) |
| `npm run build` | **EXIT=0**, all 35 routes prerendered |
| CSS compile | 175 KB; all 24 newly-used utilities present |
| Emission order | `.shadow-elevation-sm` @55,561 → `.storm-card` @149,741 — storm still wins |

**Bugs found and fixed during Phase 2:**

1. A JSDoc comment containing `**/*.ts` closed the block comment early
   (the `*/` inside it terminated the comment), breaking both
   `node --experimental-strip-types` and the vitest/oxc transform.
2. `tsconfig.json` targets `ES2017`, so named regex capture groups fail `tsc`.
   Replaced with index destructuring.
3. The first version of the duplicate-cleaner scanned all of `.next`
   recursively and **deleted legitimate Turbopack build chunks** whose names
   contain `" 2"`. Rescoped to the two `tsconfig.json` include globs and locked
   that in with a regression test.

## Implementation Order

1. `scripts/clean-next-duplicates.ts` + `predev`/`prebuild` — remove the
   stale-artifact landmine first.
2. `/auth/confirm` Suspense, then `contractor/assessments/create` Suspense.
3. `package.json` test scripts.
4. **Gate:** the build must complete. Stop and report on failure *before*
   touching visual files, so failures stay attributable.
5. `AppShell`, `TopBar`, `Sidebar`, `BottomNav`, `PageHeader`.
6. `MetricCard`, `StatusBadge`, `DataTable`.
7. New tests.
8. Full validation + CSS compile + emission-order check.

## Remaining Work

- `test:e2e`, `test:mobile`, `test:cross-browser` still fail: there is no
  `playwright.config.ts` and no `*.spec.ts` anywhere in the repo. Pre-existing.
- ~45 files remain on the old `slate`/`blue` dialect (feature components, auth
  pages, most admin pages). The new guard test only covers `common/**`.
- `Sidebar.tsx` and `BottomNav.tsx` still maintain local nav arrays that
  duplicate `navigationConfig.ts`, so `navigationContracts.test.ts` does not
  actually cover the rendered nav. Flagged, not fixed.

---

# Phase 3 — Time Tracking, Role-Based Payroll & Utility Billing

## Overview

Expand time tracking into a two-sided time-and-profit system: contractors see
their submitted totals, start/stop times, and projected pay; admins see
per-contractor hours, payroll cost, utility billing, and margin, driven by a
five-role wage model (Storm Manager, Team Lead, Sr Damage Assesser, Damage
Assesser, Driver) and a doc-backed, non-taxable vehicle reimbursement for
drivers who use a personal or rental vehicle.

**Scope:** one new Supabase migration, `src/types/index.ts`,
`src/lib/utils/payroll.ts` (new), `src/lib/services/payrollService.ts` (new),
a new `src/components/features/payroll/` folder, a shared `PhotoCapture`
extracted from `ReceiptCapture.tsx`, three new admin/contractor surfaces, and
edits to `TimeClock.tsx`, `TimeEntryList.tsx`, `TimeEntryCard.tsx`,
`navigationConfig.ts`, `contractorService.ts`, and `timeEntryService.ts`.

**Context.** Investigation of the live Supabase project (`xcvacmreerrypygpritq`)
found two pre-existing issues this phase fixes as a side effect:

1. `time_entries.total_minutes` / `billable_minutes` / `billable_amount` are
   `GENERATED ALWAYS` columns in the live database (confirmed via
   `information_schema.columns`), but `timeEntryService.clockOut()`
   (`src/lib/services/timeEntryService.ts:369-379`) writes to all three in its
   `updateRemoteEntry` payload. That update cannot succeed against Postgres
   today — a live online clock-out bug.
2. `TimeClock.tsx:188-198` renders an **editable** "Hourly Rate ($)" input,
   seeded from a hardcoded `WORK_TYPE_DEFAULT_RATES` map
   (`TimeClock.tsx:21-28`). Contractors can currently set their own pay rate.
   `contractor_rates` exists in the schema (effective-dated, per work type)
   but is `GRANT SELECT`-only and unused anywhere in `src/`.
3. `/admin/invoice-generation` and `/contractor/invoices` are both retired
   (`redirect()` to dashboard/tickets — "Invoicing is handled by the external
   billing company"), so payroll has no existing home and needs a new admin
   route.

Three money concepts that are today collapsed into one `billable_amount` are
separated:

| Concept | Today | After |
| --- | --- | --- |
| Contractor wage | `work_type_rate` (client-typed) | role default → contractor override, resolved server-side by trigger |
| Payroll cost (taxable) | `billable_amount` | `payroll_amount` — hourly wage only, no vehicle money |
| Vehicle reimbursement | does not exist | `time_entry_vehicle_claims.amount` — flat `$5.00 × declared hours`, non-taxable, doc-backed, admin-approved |
| Utility bill | does not exist | `utility_bill_amount` — storm-scoped rate card, global fallback |
| Margin | does not exist | `utility_bill_amount − (payroll_amount + approved reimbursements)` |

**Key constraint:** every money figure on a time entry is a **snapshot taken
at clock-out by a database trigger**, never recomputed at read time and never
asserted by the client. If an admin raises a rate or changes a contractor's
role tomorrow, historical payroll does not silently change — required for
1099 accuracy and the utility audit trail.

**Vehicle reimbursement, precisely (confirmed in discussion):**

- Driver selects `PERSONAL` or `RENTAL` at the time they log it.
- Driver declares **hours the vehicle was actually used**, which may be less
  than the shift length (e.g. a 10-hour shift with 5 hours of vehicle use).
- Rate is a flat **$5.00 per declared hour**, not a daily flat, not folded
  into the hourly wage, and **never overtime-eligible** regardless of shift
  length.
- Declared hours are capped server-side at the entry's actual billable hours
  — a trigger clips any over-declaration and flags `capped = true`.
- Requires a photo of the vehicle **and** a photo of the license plate as
  supporting documentation.
- Non-taxable (accountable-plan style reimbursement) — excluded from
  `payroll_amount` and from `tax_1099_tracking.total_payments`; reported as a
  separate `reimbursement_total` line everywhere money is shown.
- Requires admin approval before it is counted in `total_payout`.

**Role model (confirmed in discussion):** exactly one role per contractor,
from `STORM_MANAGER`, `TEAM_LEAD`, `SR_DAMAGE_ASSESSER`, `DAMAGE_ASSESSER`,
`DRIVER`. This is a new `contractor_role` enum on `contractors.role` —
deliberately separate from `profiles.role` (the `CEO`/`SUPER_ADMIN`/`ADMIN`/
`CONTRACTOR` authorization enum guarded by
`private.guard_profile_authorization()` and mirrored into
`auth.users.raw_app_meta_data`). A Storm Manager is still `profiles.role =
'CONTRACTOR'`.

**Utility billing rate (confirmed in discussion):** per-storm-event rate card
per work type, with a global (`storm_event_id IS NULL`) fallback row when a
storm has no override.

---

## Types

### New Postgres enum

```sql
CREATE TYPE contractor_role AS ENUM (
  'STORM_MANAGER', 'TEAM_LEAD', 'SR_DAMAGE_ASSESSER',
  'DAMAGE_ASSESSER', 'DRIVER'
);
```

Default `DAMAGE_ASSESSER` on `contractors.role` so the 2 existing contractor
rows remain valid after migration.

### `src/types/index.ts` — additions

```ts
export type ContractorRole =
  | 'STORM_MANAGER' | 'TEAM_LEAD' | 'SR_DAMAGE_ASSESSER'
  | 'DAMAGE_ASSESSER' | 'DRIVER';

export type VehicleType = 'PERSONAL' | 'RENTAL';
export type VehicleClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
```

Extended `Contractor` (currently `src/types/index.ts:27`):

```ts
  role: ContractorRole;   // new, required, default DAMAGE_ASSESSER
```

(No vehicle fields on `Contractor` — vehicle use is per-entry, not a standing
contractor attribute; see Decision Log below.)

Extended `TimeEntry` (currently `src/types/index.ts:146`) — all new fields
optional so offline/local rows still typecheck:

```ts
  contractor_role?: ContractorRole;
  pay_rate_applied?: number;
  payroll_amount?: number;                 // taxable wages only, no vehicle money
  utility_bill_rate_applied?: number;
  utility_bill_amount?: number;
```

New `VehicleClaim` type:

```ts
export interface VehicleClaim {
  id: string;
  time_entry_id: string;
  contractor_id: string;
  vehicle_type: VehicleType;
  declared_hours: number;
  notes: string;
  vehicle_photo_url: string;
  license_plate_photo_url: string;
  amount: number;              // 5.00 × declared_hours, capped at shift length
  capped: boolean;             // true when server clipped an over-declaration
  status: VehicleClaimStatus;
  is_taxable: false;           // literal type — no code path can flip this
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}
```

New payroll rollup types:

```ts
export interface ContractorPayrollRow {
  contractorId: string;
  contractorName: string;
  role: ContractorRole;
  entryCount: number;
  totalMinutes: number;
  billableMinutes: number;
  taxablePayroll: number;
  reimbursementTotal: number;
  totalPayout: number;
  utilityBillAmount: number;
  marginAmount: number;
  marginPercent: number;        // 0 when utilityBillAmount is 0, never NaN/Infinity
  pendingEntries: number;
  approvedEntries: number;
  pendingVehicleClaims: number;
}

export interface PayrollTotals {
  contractorCount: number;
  entryCount: number;
  totalMinutes: number;
  billableMinutes: number;
  taxablePayroll: number;
  reimbursementTotal: number;
  totalPayout: number;
  utilityBillAmount: number;
  marginAmount: number;
  marginPercent: number;
}

export interface PayrollSummary {
  periodStart: string;
  periodEnd: string;
  stormEventId?: string;
  generatedAt: string;
  rows: ContractorPayrollRow[];
  totals: PayrollTotals;
}

export interface RoleRateDefault {
  role: ContractorRole;
  workType: WorkType;
  hourlyRate: number;
  currency: string;
}

export interface UtilityBillingRate {
  stormEventId: string | null;   // null = global fallback
  workType: WorkType;
  hourlyRate: number;
  currency: string;
}
```

### `src/lib/services/payrollService.ts` — new exported types

```ts
export interface PayrollFilters {
  from?: string;
  to?: string;
  stormEventId?: string;
  contractorId?: string;
}

export interface ContractorRateProfile {
  contractorId: string;
  role: ContractorRole;
  workTypeRates: Record<WorkType, number>;   // resolved, effective-dated
  missingWorkTypes: WorkType[];               // no rate configured — admin warning
}
```

### `src/types/database.ts`

Regenerated via `supabase__generate_typescript_types` immediately after the
migration is applied. Adds `contractor_role` to `Enums`, extends
`contractors` and `time_entries` Row/Insert/Update, and adds
`role_rate_defaults`, `utility_billing_rates`, and
`time_entry_vehicle_claims` table entries. Not hand-edited.

---

## Files

### New files

| Path | Purpose |
| --- | --- |
| `supabase/migrations/20261003190000_role_rates_and_payroll_costing.sql` | Enum, contractor role column, 2 rate tables, money-snapshot columns + trigger on `time_entries`, RLS, grants, guard extension. |
| `supabase/migrations/20261003190500_vehicle_reimbursement_claims.sql` | `time_entry_vehicle_claims` table, amount-resolution trigger, RLS, grants, `time-entry-photos` storage bucket. |
| `src/lib/utils/payroll.ts` | Pure rate-resolution and money-math functions. No I/O. |
| `src/lib/utils/payroll.test.ts` | Unit tests for every function above. |
| `src/lib/services/payrollService.ts` | DI'd service: rate reads/writes, vehicle-claim reads/writes, payroll rollups, CSV export. |
| `src/lib/services/payrollService.test.ts` | Service tests with mocked Supabase dependencies. |
| `src/components/common/forms/PhotoCapture.tsx` | Extracted from `ReceiptCapture.tsx` — camera/file input, preview, validation, revoke-on-unmount. Reused by both expense receipts and vehicle claim photos. |
| `src/components/features/payroll/PayrollDashboard.tsx` | Admin page body — period/storm filters, totals, margin bar. |
| `src/components/features/payroll/ContractorPayrollTable.tsx` | Per-contractor payroll/billing/margin `DataTable` + CSV export. |
| `src/components/features/payroll/PayrollSummaryCards.tsx` | Totals row (hours, taxable payroll, reimbursements, billed, margin). |
| `src/components/features/payroll/RoleRateEditor.tsx` | Admin editor: role × work type → default hourly rate. |
| `src/components/features/payroll/UtilityBillingRateEditor.tsx` | Admin editor: storm-scoped + global fallback utility bill rates. |
| `src/components/features/payroll/ContractorPayrollEditor.tsx` | Per-contractor: role select, per-work-type rate override. |
| `src/components/features/payroll/ContractorTimeSummary.tsx` | Contractor-facing submitted-totals panel (start/stop, totals, pay estimate). |
| `src/components/features/payroll/VehicleReimbursementCapture.tsx` | Driver-only clock-in block: vehicle type, declared hours, notes, two required photos. |
| `src/components/features/payroll/VehicleReimbursementReview.tsx` | Admin review card: pending claims, side-by-side photos, approve/reject, batch approve. |
| `src/components/features/payroll/index.ts` | Barrel export. |
| `src/app/(admin)/admin/payroll/page.tsx` | New admin route — Payroll & Profit. |

### Modified files

| Path | Change |
| --- | --- |
| `src/types/index.ts` | `ContractorRole`, `VehicleType`, `VehicleClaimStatus`, `VehicleClaim`; `Contractor.role`; `TimeEntry` money fields; payroll type block. |
| `src/types/database.ts` | Regenerate after migrations. |
| `src/lib/config/appConfig.ts` | Add `VEHICLE_REIMBURSEMENT_HOURLY_RATE: 5`, `PAYROLL_PERIOD_DEFAULT_DAYS: 14`, `ROLE_LABELS` map. `WORK_TYPES` untouched. |
| `src/lib/services/timeEntryService.ts` | Remove `total_minutes`/`billable_minutes`/`billable_amount` from the `clockOut` update payload (generated columns — this write is the live bug). Add `stormEventId` to `ClockInRequest` so the trigger can resolve a bill rate. |
| `src/lib/db/dexie.ts` | `LocalTimeEntry` gains the new money fields; `version(4)` Dexie block with `upgrade()` backfill. |
| `src/components/features/expenses/ReceiptCapture.tsx` | Refactored to wrap the new shared `PhotoCapture`; no behavior change for expenses. |
| `src/components/features/time-tracking/TimeClock.tsx` | Remove the editable Hourly Rate input and `WORK_TYPE_DEFAULT_RATES`. Read-only rate sourced from `payrollService.getContractorRateProfile()`. Mount `VehicleReimbursementCapture` when the resolved role is `DRIVER`; clock-in blocked until its validation passes. Pass `stormEventId` at clock-in. |
| `src/components/features/time-tracking/TimeEntryList.tsx` | Admin mode: add Taxable Payroll / Reimbursement / Utility Bill / Margin columns. Contractor mode: mount `ContractorTimeSummary`. |
| `src/components/features/time-tracking/TimeEntryCard.tsx` | Mobile card: add payroll + utility bill rows; vehicle reimbursement row when a claim exists. |
| `src/components/common/layout/navigationConfig.ts` | Add `{ href: '/admin/payroll', label: 'Payroll', signalKey: 'reviews', badgeStyle: 'count' }` to `ADMIN_SIDEBAR_NAV_ITEMS`. |
| `src/lib/services/contractorService.ts` | Extend `ContractorListItem` / `ContractorDetail` with `role`; selected-column lists updated. |
| `src/app/(admin)/admin/contractors/[id]/page.tsx` | New "Payroll & Role" card mounting `ContractorPayrollEditor` + a per-contractor payroll summary strip. |
| `src/app/(contractor)/contractor/time/page.tsx` | Mount `ContractorTimeSummary` above `TimeClock`. |

### Files explicitly NOT modified

`src/app/(admin)/admin/invoice-generation/page.tsx` and
`src/app/(contractor)/contractor/invoices/page.tsx` (already retired by
redirect — payroll is a separate surface); `sql/*.sql` (original design-time
reference, superseded by `supabase/migrations/`); `src/lib/auth/*`
(authorization model untouched); `src/lib/utils/timeTracking.ts` (unchanged —
`payroll.ts` is additive, not a replacement).

---

## Functions

### New — `src/lib/utils/payroll.ts` (pure, no I/O)

```ts
resolveContractorHourlyRate(input: {
  roleDefaults: RoleRateDefault[];
  contractorRates: Array<{ workType: WorkType; hourlyRate: number;
    effectiveFrom: string; effectiveTo?: string | null }>;
  role: ContractorRole;
  workType: WorkType;
  asOf: string;
}): number | null
```

Contractor override wins when `effectiveFrom <= asOf` and (`effectiveTo` is
null or `>= asOf`); else the role default; else `null` (never a silent `0`,
so the admin UI can flag the gap).

```ts
resolveUtilityBillRate(input: {
  rates: UtilityBillingRate[];
  stormEventId: string | null;
  workType: WorkType;
}): number | null
```

Storm-scoped match wins; global (`stormEventId === null`) is the fallback;
else `null`.

```ts
calculateEntryPayroll(input: {
  billableMinutes: number;
  payRateApplied: number;
}): { payrollAmount: number }
```

`round2((billableMinutes / 60) * payRateApplied)`. Wage only — no vehicle
money folded in.

```ts
calculateEntryBilling(input: {
  billableMinutes: number;
  utilityBillRate: number;
}): { utilityBillAmount: number }
```

`round2((billableMinutes / 60) * utilityBillRate)`.

```ts
resolveVehicleClaimAmount(input: {
  declaredHours: number;
  billableMinutes: number;         // actual shift, for the cap
  hourlyRate?: number;             // default 5.00
}): { amount: number; cappedHours: number; capped: boolean }
```

Caps `declaredHours` at `billableMinutes / 60`; `amount = round2(cappedHours * hourlyRate)`.
Mirrors the DB trigger exactly so client-side preview and server truth agree.

```ts
calculateMargin(input: {
  utilityBillAmount: number;
  totalPayout: number;             // taxablePayroll + reimbursementTotal
}): { marginAmount: number; marginPercent: number }
```

`marginAmount = round2(utilityBillAmount − totalPayout)`.
`marginPercent = utilityBillAmount > 0 ? round2((marginAmount / utilityBillAmount) * 100) : 0`.
Negative margin is preserved, never clamped to zero.

```ts
buildContractorPayrollRow(entry: PayrollEntryLike): ContractorPayrollRow
summarizePayroll(rows: ContractorPayrollRow[]): PayrollTotals
buildPayrollCsv(rows: ContractorPayrollRow[], meta: { periodStart: string; periodEnd: string }): string
```

`buildPayrollCsv` reuses the CSV-injection guard already in
`contractors/page.tsx:37` (prefix cells starting with `= + - @` with `'`)
rather than a second implementation.

### New — `src/lib/services/payrollService.ts`

Mirrors the existing `createTimeEntryManagementService` pattern
(`timeEntryManagementService.ts:312`) — a dependencies interface of injected
async functions with Supabase-backed defaults, fully testable without a
network.

```ts
export function createPayrollService(overrides?: Partial<PayrollDependencies>): PayrollService
export const payrollService = createPayrollService();

export interface PayrollService {
  getRoleRateDefaults(): Promise<RoleRateDefault[]>;
  updateRoleRateDefault(input: { role: ContractorRole; workType: WorkType; hourlyRate: number }): Promise<RoleRateDefault>;
  getUtilityBillingRates(stormEventId?: string): Promise<UtilityBillingRate[]>;
  updateUtilityBillingRate(input: { stormEventId: string | null; workType: WorkType; hourlyRate: number }): Promise<UtilityBillingRate>;
  getContractorRateProfile(contractorId: string): Promise<ContractorRateProfile>;
  updateContractorRole(input: { contractorId: string; role: ContractorRole }): Promise<void>;
  updateContractorWorkTypeRate(input: { contractorId: string; workType: WorkType; hourlyRate: number }): Promise<void>;
  getPayrollSummary(filters?: PayrollFilters): Promise<PayrollSummary>;
  listVehicleClaims(filters?: { status?: VehicleClaimStatus }): Promise<VehicleClaim[]>;
  submitVehicleClaim(input: { timeEntryId: string; contractorId: string; vehicleType: VehicleType;
    declaredHours: number; notes: string; vehiclePhotoFile: File; licensePlatePhotoFile: File }): Promise<VehicleClaim>;
  reviewVehicleClaim(input: { claimId: string; reviewerId: string; decision: Extract<VehicleClaimStatus, 'APPROVED' | 'REJECTED'>; rejectionReason?: string }): Promise<VehicleClaim>;
  createPayrollCsvExport(summary: PayrollSummary, generatedAt?: Date): ReportExportArtifact;
}
```

`getPayrollSummary` reads the **stored** money columns on `time_entries` and
**approved** rows of `time_entry_vehicle_claims`, joined to `contractors`
(role, name) and `storm_events` (event_code); all math delegates to
`payroll.ts`. It never recomputes wages — the trigger is the source of
truth. Throws `'Payroll period end must be on or after the period start.'`
on an inverted range, matching `dashboardReportingService.getReport`
(`dashboardReportingService.ts:933`).

`submitVehicleClaim` uploads both photos via the extracted photo pipeline
(see below) before inserting the claim row; `reviewVehicleClaim` requires a
`rejectionReason` on `REJECTED`, matching
`timeEntryManagementService.reviewEntry`'s existing rule.

### Modified functions

- `timeEntryService.clockOut()` — drop the three generated columns from the
  update payload. Validation, break math, offline fallback, and
  `calculateBillableMinutes` are unchanged and correct.
- `timeEntryService.clockIn()` — accept and forward `stormEventId`.
- `contractorService.listContractors()` / `getContractorById()` — add `role`
  to selected columns and mapped shapes.
- `photoStorageService` — widen `entity_type` from the hardcoded literal
  `'ticket'` (`photoStorageService.ts:218`) to `'ticket' | 'time_entry'`, and
  accept a `bucket` override so vehicle-claim photos land in a dedicated
  `time-entry-photos` bucket rather than the assessment-photo tree.
- `TimeEntryList` `columns` array and summary `useMemo` — extended for the
  new money fields.

### Removed functions

- `WORK_TYPE_DEFAULT_RATES` in `TimeClock.tsx:21-28` — deleted. It is the
  hardcoded, client-editable wage map this feature replaces.

---

## Classes

No classes exist or are introduced — the codebase is function-and-interface
based (`createXService(overrides)` factories, function components). The only
"class-like" additions are the two Postgres trigger functions below.

---

## Dependencies

**None.** No new npm packages. Uses what's already installed:
`@tanstack/react-query`, `date-fns`, `sonner`, `lucide-react`, and existing
`src/components/ui/*` primitives (`Card`, `Table`, `Input`, `Select`,
`Button`, `Alert`, `DataTable`, `StatusBadge`, `MetricCard`).

---

## Database Migration Detail

### Migration 1 — `20261003190000_role_rates_and_payroll_costing.sql`

```sql
BEGIN;

CREATE TYPE contractor_role AS ENUM (
  'STORM_MANAGER','TEAM_LEAD','SR_DAMAGE_ASSESSER','DAMAGE_ASSESSER','DRIVER');

ALTER TABLE public.contractors
  ADD COLUMN role contractor_role NOT NULL DEFAULT 'DAMAGE_ASSESSER';

CREATE TABLE public.role_rate_defaults (
  role contractor_role NOT NULL,
  work_type work_type NOT NULL,
  hourly_rate numeric(10,2) NOT NULL CHECK (hourly_rate >= 0),
  currency varchar(3) NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  PRIMARY KEY (role, work_type)
);

CREATE TABLE public.utility_billing_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id uuid REFERENCES public.storm_events(id) ON DELETE CASCADE,
  work_type work_type NOT NULL,
  hourly_rate numeric(10,2) NOT NULL CHECK (hourly_rate >= 0),
  currency varchar(3) NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);
CREATE UNIQUE INDEX utility_billing_rates_global_uk
  ON public.utility_billing_rates (work_type) WHERE storm_event_id IS NULL;
CREATE UNIQUE INDEX utility_billing_rates_storm_uk
  ON public.utility_billing_rates (storm_event_id, work_type) WHERE storm_event_id IS NOT NULL;

-- Starting placeholder rates — admin is expected to overwrite via RoleRateEditor.
INSERT INTO public.role_rate_defaults (role, work_type, hourly_rate) VALUES
  ('STORM_MANAGER','STANDARD_ASSESSMENT',115),('STORM_MANAGER','EMERGENCY_RESPONSE',150),
  ('STORM_MANAGER','TRAVEL',65),('STORM_MANAGER','STANDBY',55),('STORM_MANAGER','ADMIN',75),('STORM_MANAGER','TRAINING',50),
  ('TEAM_LEAD','STANDARD_ASSESSMENT',105),('TEAM_LEAD','EMERGENCY_RESPONSE',140),
  ('TEAM_LEAD','TRAVEL',60),('TEAM_LEAD','STANDBY',50),('TEAM_LEAD','ADMIN',70),('TEAM_LEAD','TRAINING',45),
  ('SR_DAMAGE_ASSESSER','STANDARD_ASSESSMENT',95),('SR_DAMAGE_ASSESSER','EMERGENCY_RESPONSE',135),
  ('SR_DAMAGE_ASSESSER','TRAVEL',55),('SR_DAMAGE_ASSESSER','STANDBY',45),('SR_DAMAGE_ASSESSER','ADMIN',65),('SR_DAMAGE_ASSESSER','TRAINING',40),
  ('DAMAGE_ASSESSER','STANDARD_ASSESSMENT',85),('DAMAGE_ASSESSER','EMERGENCY_RESPONSE',120),
  ('DAMAGE_ASSESSER','TRAVEL',50),('DAMAGE_ASSESSER','STANDBY',40),('DAMAGE_ASSESSER','ADMIN',55),('DAMAGE_ASSESSER','TRAINING',35),
  ('DRIVER','STANDARD_ASSESSMENT',65),('DRIVER','EMERGENCY_RESPONSE',90),
  ('DRIVER','TRAVEL',45),('DRIVER','STANDBY',35),('DRIVER','ADMIN',45),('DRIVER','TRAINING',30)
ON CONFLICT DO NOTHING;

ALTER TABLE public.time_entries
  ADD COLUMN contractor_role contractor_role,
  ADD COLUMN pay_rate_applied numeric(10,2),
  ADD COLUMN payroll_amount numeric(12,2),
  ADD COLUMN utility_bill_rate_applied numeric(10,2),
  ADD COLUMN utility_bill_amount numeric(12,2);

CREATE INDEX idx_time_entries_role ON public.time_entries(contractor_role);
CREATE INDEX idx_time_entries_payroll ON public.time_entries(clock_in_at, contractor_id)
  WHERE is_deleted IS NOT TRUE;
```

**Trigger — recomputes wages inline.** PostgreSQL evaluates `GENERATED`
columns *after* `BEFORE` triggers, so `NEW.billable_minutes` is `NULL`
inside this trigger; it must recompute the identical expression itself so
the two can never disagree:

```sql
CREATE OR REPLACE FUNCTION private.apply_time_entry_costing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  mins numeric;
  c_role public.contractor_role;
  bill_rate numeric(10,2);
  pay_rate numeric(10,2);
BEGIN
  SELECT role INTO c_role FROM public.contractors
    WHERE id = NEW.contractor_id AND is_deleted IS NOT TRUE;

  SELECT r.hourly_rate INTO pay_rate FROM public.contractor_rates r
   WHERE r.contractor_id = NEW.contractor_id AND r.work_type = NEW.work_type
     AND r.effective_from <= (NEW.clock_in_at)::date
     AND (r.effective_to IS NULL OR r.effective_to >= (NEW.clock_in_at)::date)
   ORDER BY r.effective_from DESC LIMIT 1;
  IF pay_rate IS NULL THEN
    SELECT hourly_rate INTO pay_rate FROM public.role_rate_defaults
     WHERE role = c_role AND work_type = NEW.work_type;
  END IF;
  IF pay_rate IS NULL THEN
    RAISE EXCEPTION 'No wage configured for role % and work type %. Assign a rate before clocking in.', c_role, NEW.work_type;
  END IF;

  NEW.contractor_role  := c_role;
  NEW.work_type_rate   := pay_rate;
  NEW.pay_rate_applied := pay_rate;

  mins := GREATEST(EXTRACT(epoch FROM (COALESCE(NEW.clock_out_at, NEW.clock_in_at) - NEW.clock_in_at))/60.0
                    - COALESCE(NEW.break_minutes, 0), 0);

  SELECT hourly_rate INTO bill_rate FROM public.utility_billing_rates
   WHERE work_type = NEW.work_type
     AND (storm_event_id = NEW.storm_event_id OR storm_event_id IS NULL)
   ORDER BY (storm_event_id IS NOT NULL) DESC LIMIT 1;

  NEW.payroll_amount            := ROUND((mins/60.0) * pay_rate, 2);
  NEW.utility_bill_rate_applied := bill_rate;
  NEW.utility_bill_amount       := CASE WHEN bill_rate IS NULL THEN NULL
                                        ELSE ROUND((mins/60.0) * bill_rate, 2) END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tr_apply_time_entry_costing ON public.time_entries;
CREATE TRIGGER tr_apply_time_entry_costing
BEFORE INSERT OR UPDATE OF clock_in_at, clock_out_at, break_minutes, work_type, contractor_id, storm_event_id
ON public.time_entries FOR EACH ROW EXECUTE FUNCTION private.apply_time_entry_costing();
```

`payroll_amount` is wage-only by construction — no vehicle money is ever
written here, which is the exact mistake an earlier draft of this plan made
and a regression test now guards against.

**Guard extension.** `private.guard_contractor_eligibility()` currently
protects `profile_id`, `onboarding_status`, `is_eligible_for_assignment`,
`approved_by`, `approved_at`, `eligibility_reason` from non-admin writes. Add
`role` to the same `IS DISTINCT FROM` list so a contractor cannot grant
themselves a different wage tier.

**RLS + grants.** `role_rate_defaults` and `utility_billing_rates`: `SELECT`
to `authenticated`; `INSERT/UPDATE/DELETE` restricted to
`USING (public.is_admin()) WITH CHECK (public.is_admin())`. Both tables get
the standard `active_profile_required` restrictive policy already applied
project-wide. Existing `time_entries` policies are untouched.

```sql
GRANT SELECT ON public.role_rate_defaults, public.utility_billing_rates TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.role_rate_defaults, public.utility_billing_rates TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
```

### Migration 2 — `20261003190500_vehicle_reimbursement_claims.sql`

```sql
BEGIN;

CREATE TABLE public.time_entry_vehicle_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL UNIQUE REFERENCES public.time_entries(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id),
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('PERSONAL','RENTAL')),
  declared_hours numeric(6,2) NOT NULL CHECK (declared_hours > 0),
  notes text NOT NULL CHECK (length(btrim(notes)) >= 3),
  vehicle_photo_url text NOT NULL,
  license_plate_photo_url text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  capped boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_claims_contractor ON public.time_entry_vehicle_claims(contractor_id);
CREATE INDEX idx_vehicle_claims_pending ON public.time_entry_vehicle_claims(created_at)
  WHERE status = 'PENDING';
ALTER TABLE public.time_entry_vehicle_claims ENABLE ROW LEVEL SECURITY;
```

**Trigger — amount resolves only once the shift is closed**, and caps
over-declared hours:

```sql
CREATE OR REPLACE FUNCTION private.compute_vehicle_claim_amount() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  shift_hours numeric;
  rate numeric(10,2) := 5.00;
BEGIN
  SELECT GREATEST(EXTRACT(epoch FROM (COALESCE(clock_out_at, clock_in_at) - clock_in_at))/3600.0
                  - COALESCE(break_minutes,0)/60.0, 0)
    INTO shift_hours FROM public.time_entries
    WHERE id = NEW.time_entry_id AND clock_out_at IS NOT NULL;

  IF shift_hours IS NULL THEN
    RAISE EXCEPTION 'Vehicle reimbursement can only be finalized after the time entry is closed.';
  END IF;

  IF NEW.declared_hours > shift_hours THEN
    NEW.declared_hours := shift_hours;
    NEW.capped := true;
  ELSE
    NEW.capped := false;
  END IF;

  NEW.amount := ROUND(NEW.declared_hours * rate, 2);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tr_compute_vehicle_claim_amount ON public.time_entry_vehicle_claims;
CREATE TRIGGER tr_compute_vehicle_claim_amount
BEFORE INSERT OR UPDATE OF declared_hours ON public.time_entry_vehicle_claims
FOR EACH ROW EXECUTE FUNCTION private.compute_vehicle_claim_amount();

CREATE POLICY vehicle_claims_own ON public.time_entry_vehicle_claims
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = time_entry_vehicle_claims.contractor_id AND c.profile_id = auth.uid()));
CREATE POLICY vehicle_claims_insert_own ON public.time_entry_vehicle_claims
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = time_entry_vehicle_claims.contractor_id AND c.profile_id = auth.uid()));
CREATE POLICY vehicle_claims_admin ON public.time_entry_vehicle_claims
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT,INSERT ON public.time_entry_vehicle_claims TO authenticated;
GRANT UPDATE ON public.time_entry_vehicle_claims TO authenticated; -- gated by RLS to admin-only for status changes

-- Dedicated storage bucket: license plates are PII and should not share the
-- assessment-photo tree's retention/access story.
INSERT INTO storage.buckets (id, name, public) VALUES ('time-entry-photos', 'time-entry-photos', false)
  ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst,'reload schema';
COMMIT;
```

Note: a contractor-side `UPDATE` grant exists only so an admin update (status
change) can be performed by the `authenticated` role under RLS — a plain
contractor cannot satisfy `vehicle_claims_admin`'s `USING` clause, and no
contractor-facing `UPDATE` policy is created, so contractors are read+insert
only in practice.

**Advisors.** Run `supabase__get_advisors` for both `security` and
`performance` on `xcvacmreerrypygpritq` after applying both migrations.

---

## Testing

### New — `src/lib/utils/payroll.test.ts`

1. `resolveContractorHourlyRate` — contractor override beats role default.
2. Future-dated contractor rate is ignored for "today"; an expired one is ignored.
3. Role default used when no contractor override exists.
4. Returns `null` when neither exists (never a silent `0`).
5. `resolveUtilityBillRate` — storm-scoped beats global fallback.
6. Global fallback applies when no storm-scoped rate exists.
7. Returns `null` for an unconfigured work type.
8. `calculateEntryPayroll` contains **zero** vehicle money — direct regression guard against the earlier (wrong) draft.
9. `resolveVehicleClaimAmount` — 6h shift, 5 declared → `$25.00`, `capped: false`.
10. `resolveVehicleClaimAmount` — 6h shift, 8 declared → clipped to 6h → `$30.00`, `capped: true`.
11. `resolveVehicleClaimAmount` — flat `$5/hr`, no overtime multiplier, on a 14-hour entry.
12. `calculateMargin` — `$1,000` bill / `$700` total payout → `$300.00`, `30%`.
13. `calculateMargin` with zero billing → `marginPercent` is `0`, not `NaN`/`Infinity`.
14. Negative margin (loss-making entry) preserved, not clamped to zero.
15. `buildPayrollCsv` — a contractor name of `=cmd|'/c calc'` is prefixed with `'` (CSV injection guard).
16. `summarizePayroll` totals reconcile with the sum of rows, including `reimbursementTotal`.

### New — `src/lib/services/payrollService.test.ts`

 1. `getPayrollSummary` groups rows by contractor and sums correctly.
 2. Date-range and `stormEventId` filters narrow correctly.
 3. Inverted range rejects with the period error message.
 4. Reads stored `payroll_amount` / `utility_bill_amount` rather than recomputing — a deliberately inconsistent fixture proves the stored value wins.
 5. `total_payout` includes only `APPROVED` vehicle claims — `PENDING`/`REJECTED` excluded.
 6. The 1099-facing taxable figure equals `taxablePayroll` alone, never `taxablePayroll + reimbursementTotal`.
 7. `updateContractorRole` issues the expected Supabase update and surfaces the trigger's `RAISE EXCEPTION` message on rejection.
 8. `submitVehicleClaim` rejects when either photo is missing.
 9. `reviewVehicleClaim` requires `rejectionReason` on `REJECTED`.

### New — component tests

 1. `RoleRateEditor` renders all five roles and calls `updateRoleRateDefault` on save.
 2. `ContractorPayrollTable` renders `—` for a contractor with no entries, not `$0.00`.
 3. `ContractorTimeSummary` shows approved vs. pending hours separately.
 4. `VehicleReimbursementCapture` keeps Clock In disabled until vehicle type, hours, notes, and both photos are present.
 5. `VehicleReimbursementReview` shows the `capped` badge when `declared_hours` was clipped.

### Modified — existing tests

- `src/lib/services/timeEntryService.test.ts` — invert the `clockOut` payload
  assertions: must **not** contain `billable_amount`/`billable_minutes`/
  `total_minutes`. Add a case asserting `clockIn` forwards `stormEventId`.
- `src/lib/db/dexie.test.ts` — add a `version(4)` upgrade case asserting
  money fields backfill and pre-version-4 rows survive.
- `src/components/common/layout/navigationContracts.test.ts` — assert
  `/admin/payroll` is present in `ADMIN_SIDEBAR_NAV_ITEMS`.
- `src/components/features/expenses/ReceiptCapture.tsx` tests — rerun
  unchanged against the `PhotoCapture`-wrapped implementation; no new
  assertions required, but must stay green (behavior-preserving refactor).

### Validation gate

```
npm run typecheck
npx eslint src/lib/utils/payroll.ts src/lib/services/payrollService.ts src/components/features/payroll src/components/common/forms/PhotoCapture.tsx
npx vitest run
npm run build
supabase__get_advisors security + performance on xcvacmreerrypygpritq
```

Known pre-existing, out-of-scope failures (do not let these mask new ones):
`test:e2e`/`test:mobile`/`test:cross-browser` fail — no `playwright.config.ts`
exists; `Sidebar.tsx`/`BottomNav.tsx` duplicate `navigationConfig.ts` arrays.

---

## Implementation Order

1. ✅ **Migration 1** (`role_rates_and_payroll_costing`) — applied via
   `apply_migration`. Added `contractor_role` enum, `contractors.role`,
   `role_rate_defaults`, `utility_billing_rates` (with global-fallback unique
   indexes + seeded placeholder rates), 5 money-snapshot columns on
   `time_entries`, the `private.apply_time_entry_costing()` BEFORE trigger,
   and extended `private.guard_contractor_eligibility()` to protect `role`.
   RLS + grants applied. *(0 pre-existing `time_entries` rows — no backfill
   risk.)*
2. ✅ **Migration 2** (`vehicle_reimbursement_claims`) — applied via
   `apply_migration`. Added `time_entry_vehicle_claims` table,
   `private.compute_vehicle_claim_amount()` trigger (caps over-declared
   hours, resolves amount only once `clock_out_at` is set),
   `private.set_vehicle_claim_updated_at()` trigger, RLS (contractor
   read/insert-own, admin full), grants, and the `time-entry-photos` storage
   bucket (private).
   - Ran `supabase__get_advisors` (security + performance) after both
     migrations; applied a follow-up `payroll_advisor_cleanup` migration to
     fix the one new finding (`search_path`-mutable on
     `set_vehicle_claim_updated_at`) and index 4 new FK columns
     (`role_rate_defaults.updated_by`, `utility_billing_rates.updated_by`,
     `utility_billing_rates.storm_event_id`,
     `time_entry_vehicle_claims.reviewed_by`). All other advisor findings are
     pre-existing and out of scope.
   - Regenerated types via `supabase__generate_typescript_types` and hand-
     merged the diff into `src/types/database.ts` (full-file overwrite was
     unsafe due to MCP response truncation): added `contractor_role` to
     `Enums` + `Constants.public.Enums`, `role` on `contractors`
     Row/Insert/Update, 5 new columns on `time_entries`
     Row/Insert/Update, and full `role_rate_defaults`,
     `utility_billing_rates`, `time_entry_vehicle_claims` table definitions.
     Verified with `npx tsc --noEmit` — clean.
3. ✅ **`src/types/index.ts`** — added `ContractorRole`, `VehicleType`,
   `VehicleClaimStatus`; `Contractor.role`; `TimeEntry` gained
   `storm_event_id`, `contractor_role`, `pay_rate_applied`,
   `payroll_amount`, `utility_bill_rate_applied`, `utility_bill_amount` (all
   optional); new `VehicleClaim`, `ContractorPayrollRow`, `PayrollTotals`,
   `PayrollSummary`, `RoleRateDefault`, `UtilityBillingRate` interfaces.
   Verified with `npx tsc --noEmit` — clean. No existing call site
   constructs a bare `Contractor` object literal, so the new required
   `role` field did not break anything (confirmed via codebase search).
4. ✅ **`src/lib/utils/payroll.ts` + `payroll.test.ts`** — implemented all
   planned pure functions: `round2`, `resolveContractorHourlyRate`,
   `resolveUtilityBillRate`, `calculateEntryPayroll`, `calculateEntryBilling`,
   `resolveVehicleClaimAmount`, `calculateMargin`, `buildContractorPayrollRow`,
   `summarizePayroll`, `buildPayrollCsv` (reuses the exact CSV-injection
   escaping already in `contractors/page.tsx:52`). 21 tests written
   (exceeds the 16 originally scoped — added a custom-rate-override case
   for `resolveVehicleClaimAmount` and a full-aggregation case for
   `buildContractorPayrollRow`). All passing; one test assertion was fixed
   after a first run surfaced that the CSV escape replaces a leading `=`
   with `'` rather than stripping it (matches the existing pattern exactly
   — the test, not the implementation, was wrong).
   - `npx vitest run src/lib/utils/payroll.test.ts` → 21/21 pass.
   - `npx tsc --noEmit` → clean.
   - Full suite regression check: `npx vitest run` → **376/376 pass, 74
     files** (no existing test broken by the new types/columns).
5. ✅ **`timeEntryService.ts` clockIn/clockOut fix** + updated
   `timeEntryService.test.ts`. `clockOut()`'s `updateRemoteEntry` payload no
   longer writes `total_minutes`/`billable_minutes`/`billable_amount`
   (Postgres `GENERATED ALWAYS` columns); added the previously-missing
   `clock_out_accuracy` to the same payload (it was already set locally but
   never sent remotely — a small pre-existing gap fixed in the same edit).
   `ClockInRequest` gained `stormEventId?: string`, threaded through
   `buildClockInEntry` (offline path) and the remote `insertRemoteEntry`
   call. `mapRemoteRowToTimeEntry` now also surfaces `storm_event_id` and
   the 5 trigger-written payroll/billing fields for display.
   - 3 new tests added (7 total, up from 4): asserts the `clockOut` payload
     excludes all 5 generated/trigger-owned columns; asserts `clockIn`
     forwards a provided `stormEventId`; asserts it forwards `null` when
     none is provided. `npx vitest run src/lib/services/timeEntryService.test.ts`
     → 7/7 pass.
   - **Live end-to-end verification against `xcvacmreerrypygpritq`:**
     inserted a real row with a deliberately wrong client-submitted
     `work_type_rate: 999`, confirmed the trigger overwrote it with the
     correct role-default rate (`85.00`) — proving contractors cannot set
     their own pay. Then ran the exact clock-out payload the fixed service
     now sends (no generated columns) and confirmed it succeeds (the
     original bug would have rejected this write) and that
     `payroll_amount` (`637.71`) exactly matches Postgres's own
     `billable_amount` (`637.71`) — the trigger's inline recomputation
     agrees with the `GENERATED ALWAYS` expression bit-for-bit. Test row
     deleted after verification.
   - **Finding, not yet fixed — flagged for Step 10:** `time_entries` has a
     pre-existing (unrelated to this phase) `NOT VALID` CHECK constraint
     `time_entries_storm_event_required` forcing `storm_event_id IS NOT
     NULL` on every row, added by
     `supabase/migrations/20260218103000_add_storm_scope_to_financial_ops.sql`
     as part of the storm-first workflow. `TimeClock.tsx` has never passed
     a storm event to `clockIn()`, and there is no existing "current storm"
     hook/context for the contractor portal (`stormEventService` is
     admin/ticket-oriented only). This means **online clock-in has likely
     been completely broken in production already**, independent of
     anything in this phase — confirmed indirectly by the 0 pre-existing
     `time_entries` rows found in Step 1. Resolving how `TimeClock` sources
     a storm event is now part of Step 10's scope.
   - Full suite regression check: `npx vitest run` → **379/379 pass, 74
     files**.
6. ✅ **`src/lib/db/dexie.ts` version(4)** + `dexie.test.ts`. `LocalTimeEntry`
   gained `storm_event_id` plus the 5 payroll/billing snapshot fields
   (`contractor_role`, `pay_rate_applied`, `payroll_amount`,
   `utility_bill_rate_applied`, `utility_bill_amount`). Added a
   `this.version(4).stores({...}).upgrade(...)` block — the index-string
   schema is unchanged (none of the new fields are indexed) but Dexie
   still requires a version bump whenever the stored object shape changes,
   so a version bump + backfill pass was added regardless.
   - Deviation from the plan as written: this project's test environment
     has no real IndexedDB (jsdom provides none, and there is no
     `fake-indexeddb` dependency) — confirmed by checking
     `node_modules/fake-indexeddb` (absent) and `dom.window.indexedDB`
     (`undefined`) directly. Every existing `dexie.test.ts` case mocks
     Dexie table methods directly and never exercises Dexie's real
     version-upgrade engine. Rather than write an untestable
     `.upgrade()` callback, the backfill logic was extracted into a new
     exported pure function `backfillTimeEntryPayrollFields(entry)` in
     `dexie.ts`, and the `version(4)` upgrade callback calls it — so the
     exact logic that runs during a real upgrade is unit-tested directly.
   - 3 new tests: backfills `pay_rate_applied` from `work_type_rate` on a
     pre-v4 row missing the field; leaves an already-populated
     `pay_rate_applied` untouched; confirms a fully-populated row is
     returned unchanged (referential equality) rather than needlessly
     cloned.
   - `npx tsc --noEmit` → clean. `npx vitest run src/lib/db/dexie.test.ts`
     → 14/14 pass (11 original + 3 new).
   - Full suite regression check: `npx vitest run` → **382/382 pass, 74
     files**.
7. ✅ **`src/lib/config/appConfig.ts`** — added
   `VEHICLE_REIMBURSEMENT_HOURLY_RATE: 5` and
   `PAYROLL_PERIOD_DEFAULT_DAYS: 14` to `APP_CONFIG`; added new
   `CONTRACTOR_ROLES` + `ROLE_LABELS` constant maps (mirroring the existing
   `WORK_TYPES`/`USER_ROLES` pattern in this file) and, ahead of schedule,
   `VEHICLE_TYPES` + `VEHICLE_TYPE_LABELS` since they belong in the same
   file and will be consumed by `VehicleReimbursementCapture` in Step 10.
   `WORK_TYPES` itself untouched, as planned.
   - No pre-existing `appConfig.test.ts` exists for this file (consistent
     with its other constant maps, e.g. `WORK_TYPES`/`USER_ROLES`, which
     also have no dedicated tests) — no test debt introduced.
   - `npx tsc --noEmit` → clean.
   - Full suite regression check: `npx vitest run` → **382/382 pass, 74
     files** (unchanged from Step 6 — this step added no new test files).
8. ✅ **`payrollService.ts` + test**, then `contractorService.ts` role
   passthrough.
   - `contractorService.ts`: added `role` to `RemoteContractorRow`,
     `ContractorListItem`, `ContractorDetail`; added `'role'` to both
     column-select lists (`listContractors`/`getContractorById`) and both
     mapped object constructions. Existing 4 tests pass unchanged (mock
     fixtures didn't need `role` — `satisfies ContractorListItem` on an
     object spread still type-checks because the test builds raw row
     fixtures, not the mapped output type).
   - `payrollService.ts` (new, 832 lines): implements the full
     `PayrollService` interface — `getRoleRateDefaults`/
     `updateRoleRateDefault`, `getUtilityBillingRates`/
     `updateUtilityBillingRate`, `getContractorRateProfile`,
     `updateContractorRole`, `updateContractorWorkTypeRate`,
     `getPayrollSummary`, `listVehicleClaims`, `submitVehicleClaim`,
     `reviewVehicleClaim`, `createPayrollCsvExport`. Mirrors
     `createTimeEntryManagementService`'s DI pattern exactly — every
     dependency is an injected async function with a Supabase-backed
     default, so the whole service is testable with zero network calls.
     `getPayrollSummary` reads only the stored `payroll_amount` /
     `utility_bill_amount` columns and delegates all aggregation to
     `payroll.ts`'s `buildContractorPayrollRow`/`summarizePayroll` — it
     never recomputes a wage.
   - 13 tests in `payrollService.test.ts` (exceeds the 9 originally
     scoped): summary grouping/summing, filter passthrough, inverted-range
     rejection, stored-value-wins regression guard (deliberately
     inconsistent fixture), approved-only vehicle-claim inclusion, role
     update passthrough + guard-rejection surfacing, `submitVehicleClaim`
     validation (missing photo / zero hours) and happy path,
     `reviewVehicleClaim` rejection-reason requirement and approval path,
     and CSV export artifact shape.
   - **Bug found and fixed during testing:** `reviewVehicleClaim` was
     declared as a synchronous function returning a `Promise`, so its
     validation `throw` executed *before* the Promise existed —
     `expect(...).rejects.toThrow()` could not catch it (the test failed
     with an uncaught synchronous error instead of the expected rejection).
     Fixed by marking the method `async`, matching the existing
     `timeEntryManagementService.reviewEntry` pattern, which is also
     `async` for the same reason.
   - `npx tsc --noEmit` → clean. `npx eslint payrollService.ts payroll.ts
     contractorService.ts` → 0 problems.
   - `npx vitest run src/lib/services/payrollService.test.ts` → 13/13 pass.
   - Full suite regression check: `npx vitest run` → **395/395 pass, 75
     files**.
9. ✅ **Extract `PhotoCapture`** from `ReceiptCapture.tsx`.
   - New `src/components/common/forms/PhotoCapture.tsx`: generalized the
     capture/upload/remove/preview UI and `validatePhotoFile` logic behind
     a `label` prop (`Capture {label}` / `Upload {label}`) plus optional
     `storedMessage`/`helpMessage` overrides, so it serves both receipts
     and vehicle-claim photos without forking logic. Exports
     `DEFAULT_PHOTO_CAPTURE_TYPES`.
   - `ReceiptCapture.tsx` rewritten to a thin wrapper: keeps its own `Card`
     chrome and exact original prop interface (`value`, `onChange`,
     `disabled`, `existingReceiptUrl`) so no call site changed; delegates
     all capture/validation/preview logic to `PhotoCapture`.
   - 6 new tests in `PhotoCapture.test.tsx` (no prior test existed for
     `ReceiptCapture` either, so this is net-new coverage, not a
     preserved-behavior check): button labeling, help-message display,
     stored-message display, valid file selection calls `onChange`,
     oversized file is rejected without calling `onChange`, and the
     Remove button only renders when a file is attached and clears it.
   - **Deviation from the plan as written — `photoStorageService.ts` was
     NOT widened.** Investigation showed `defaultUploadVehicleClaimPhoto`
     in `payrollService.ts` (built in Step 8) uploads directly to the
     `time-entry-photos` bucket and writes the resulting path straight
     onto `time_entry_vehicle_claims.vehicle_photo_url`/
     `license_plate_photo_url` — there are dedicated columns for exactly
     these two photos. Routing through `photoStorageService`'s
     `media_assets` pipeline (designed for open-ended ticket photo
     galleries) would add an unconsulted, redundant bookkeeping table for
     no benefit. `photoStorageService.ts` is unmodified.
   - **Security finding and fix, not in the original plan:** live-database
     inspection showed the `time-entry-photos` bucket created in Step 2 is
     **private** (`public: false`), but RLS is enabled on
     `storage.objects` with **zero policies** — meaning default-deny for
     all access, so neither contractor upload nor admin review could have
     worked at all. (Investigating further, this is not unique to the new
     bucket: there are **no storage policies anywhere in the project** for
     any bucket, including the existing `assessment-photos` bucket used by
     `photoStorageService.ts` — that ticket-photo pipeline is *also*
     already broken in production. Out of scope to fix here, but flagged.)
     Applied `time_entry_photos_storage_policies` migration: contractors
     may `INSERT`/`SELECT` only objects under their own
     `{contractorId}/...` path prefix (enforced via
     `storage.foldername(name)`); admins get full access via `is_admin()`.
     `supabase__get_advisors` (security) run after — only the pre-existing,
     unrelated "leaked password protection disabled" warning remains.
   - **Second fix following from the first:** since the bucket is private,
     `getPublicUrl()` (the original implementation) returns a URL that
     cannot actually serve the file. Reworked
     `defaultUploadVehicleClaimPhoto` to return the **storage path**
     instead of a URL; added `signVehicleClaimPhotoUrl`/
     `signVehicleClaimPhotoUrls` using `createSignedUrl` (1-hour TTL,
     falls back to the raw path on signing failure rather than throwing).
     `listVehicleClaims`'s `defaultFetchVehicleClaims` now signs both
     photo URLs at read time, since that's the path that feeds the admin
     review UI where photos are actually displayed.
     `fetchVehicleClaimsForEntries` (used only by `getPayrollSummary` for
     amount/status math) deliberately does **not** sign — no image is ever
     rendered from that call, so signing would be wasted work. Stored
     columns (`vehicle_photo_url`/`license_plate_photo_url` on
     `time_entry_vehicle_claims`) hold the stable storage path, not a
     signed URL, so a URL never goes stale in the database.
   - A `bg-slate-100`/`text-emerald-700`/`text-slate-500` set in the first
     draft of `PhotoCapture.tsx` tripped the Phase 2
     `legacy-color-guard.test.ts` (which scans all of
     `src/components/common/**`). Retokened to
     `bg-surface-sunken`/`text-grid-success-ink`/`text-muted-foreground`
     (matching the patterns already established in `badge.tsx` and
     `DataTable.tsx`).
   - `npx tsc --noEmit` → clean. `npx eslint` on the new/changed files →
     0 problems. `npx vitest run src/components/common/forms/
     PhotoCapture.test.tsx` → 6/6 pass.
   - Full suite regression check: `npx vitest run` → **401/401 pass, 76
     files**.
10. ✅ **`VehicleReimbursementCapture`** + `TimeClock.tsx` rate-input removal
    + storm-event resolution.
    - **New `src/hooks/useActiveStormEventId.ts`**: resolves the storm
      event a contractor should clock against from their most recently
      updated, non-closed assigned ticket (`ticketService
      .getTicketsByAssignee`, already RLS-safe for a contractor to read
      their own tickets). This closes the gap flagged in Step 5:
      `time_entries` has a pre-existing `NOT VALID` CHECK constraint
      requiring `storm_event_id IS NOT NULL`
      (`20260218103000_add_storm_scope_to_financial_ops.sql`, unrelated to
      this phase), and `TimeClock` never supplied one. 5 tests in
      `useActiveStormEventId.test.ts`: no-contractorId no-op, picks the
      most-recently-updated open ticket, excludes
      CLOSED/ARCHIVED/EXPIRED, returns `undefined` with no open tickets,
      and falls back to `undefined` (not a thrown error) on fetch failure.
    - **Live verification against `xcvacmreerrypygpritq`:** confirmed
      contractor `adc6d309-…` has exactly one assigned, non-closed ticket
      carrying a real `storm_event_id` (`418bd00d-…`) — the hook's data
      path is exercised by real production data, not just mocks.
    - **Deviation from the plan as written — `VehicleReimbursementCapture`
      does NOT gate clock-in.** Investigation of the Step 2 trigger
      (`private.compute_vehicle_claim_amount`) showed it `RAISE
      EXCEPTION`s unless `time_entries.clock_out_at IS NOT NULL` — a claim
      cannot be finalized until the shift is closed, and practically a
      driver only knows actual vehicle-use hours once the shift is over.
      Implemented as a **post-clock-out** card instead: new
      `src/components/features/payroll/VehicleReimbursementCapture.tsx`
      renders directly under "Last Completed Entry" when the signed-in
      contractor's resolved role is `DRIVER`, with vehicle type, declared
      hours (capped visually at the shift length with a live
      `resolveVehicleClaimAmount` preview, including the `capped` badge),
      notes, and two required `PhotoCapture` photos; submits via
      `payrollService.submitVehicleClaim`. On success it clears
      `lastEntry` so the card does not reappear for an already-claimed
      entry in the same session.
    - `TimeClock.tsx`: removed `WORK_TYPE_DEFAULT_RATES` and the editable
      "Hourly Rate ($)" `<Input>` entirely — replaced with a read-only
      field sourced from a new `payrollService.getContractorRateProfile()`
      effect, keyed on `workType`. `canClockIn` now additionally requires
      `typeof workTypeRate === 'number'`; clicking Clock In with no
      configured rate surfaces "No wage is configured for this role and
      work type yet. Contact an admin before clocking in." instead of
      silently sending a bad value. `workTypeRate` is still sent on
      `clockIn()` for schema-shape compatibility, but is documented inline
      as diagnostic-only — `private.apply_time_entry_costing()` always
      overwrites it server-side. `stormEventId` from the new hook is
      threaded into `clockIn()`. "Last Completed Entry" now shows
      `payroll_amount` when present.
    - `npx tsc --noEmit` → clean. `npx eslint` on all 3 changed/new files
      → 0 problems. `npx vitest run src/hooks/useActiveStormEventId.test.ts`
      → 5/5 pass. No pre-existing `TimeClock.test.tsx` exists, so nothing
      to break there.
    - Full suite regression check: `npx vitest run` → **406/406 pass, 77
      files**.
11. ✅ **Admin rate/role editors** — `RoleRateEditor`,
    `UtilityBillingRateEditor`, `ContractorPayrollEditor`; wired into
    `/admin/contractors/[id]`.
    - `RoleRateEditor.tsx`: 5-role × 6-work-type grid against
      `role_rate_defaults`, one Save button per cell, `payrollService
      .getRoleRateDefaults()`/`updateRoleRateDefault()`.
    - `UtilityBillingRateEditor.tsx`: takes an optional `stormEventId` prop
      so the same component edits either a storm-scoped rate card or the
      global fallback (`stormEventId` omitted) — matches
      `resolveUtilityBillRate`'s precedence from `payroll.ts` exactly.
    - `ContractorPayrollEditor.tsx`: per-contractor role `Select` +
      per-work-type rate override inputs, sourced from
      `payrollService.getContractorRateProfile()`; missing rates are
      flagged inline ("No rate configured") rather than shown as `$0`.
      Wired into `/admin/contractors/[id]/page.tsx` directly below the
      existing "Contractor account" card, with `onRoleChanged` triggering
      the page's existing `query.refetch()`.
    - New barrel `src/components/features/payroll/index.ts` exporting all
      4 payroll components built so far.
    - 4 component tests across `RoleRateEditor.test.tsx` (renders all 5
      roles; Save calls `updateRoleRateDefault` with the edited cell) and
      `ContractorPayrollEditor.test.tsx` (missing-rate rows render "No
      rate configured" instead of `$0`; a role change that the database
      guard rejects surfaces **the guard's own live error message** via
      `toast.error` — verified character-for-character against
      `private.guard_contractor_eligibility()`'s current body, re-fetched
      live from `xcvacmreerrypygpritq` in this step). Used the
      established `vi.mock('@/components/ui/select', ...)` pattern from
      `TicketAssign.test.tsx` for the role-change interaction test, with
      typed mock-prop interfaces (not `any`) to stay lint-clean.
    - **Lint findings fixed during this step:** an unused `rates` Map
      state in `RoleRateEditor` (dead — only the string-keyed `inputs` map
      was ever read) was removed rather than suppressed; 4
      `no-explicit-any` violations in the first draft of the Select mock
      were replaced with two small local prop interfaces.
    - `npx tsc --noEmit` → clean. `npx eslint` on all new/changed files →
      0 problems. Component test files → 4/4 pass.
    - Full suite regression check: `npx vitest run` → **410/410 pass, 79
      files**.
12. ✅ **`VehicleReimbursementReview`** admin card.
    - New `src/components/features/payroll/VehicleReimbursementReview.tsx`:
      lists `PENDING` vehicle claims (card-per-claim, matching
      `TimeEntryCard`'s visual style), showing declared hours, the
      server-resolved amount, a `Capped` badge when the trigger clipped an
      over-declaration, both required photos side by side via
      `next/image`, and an inline rejection-reason `Input`. Approve/Reject
      buttons mirror the existing icon+label pattern from
      `TimeEntryCard.tsx`'s review footer. On a successful decision the
      claim is optimistically removed from the local list rather than
      re-fetching the whole queue.
    - Added to the payroll barrel export
      (`src/components/features/payroll/index.ts`); will be mounted on
      `/admin/payroll` in Step 13.
    - 6 tests in `VehicleReimbursementReview.test.tsx`: empty state;
      `Capped` badge renders/doesn't render correctly; approve removes the
      claim from the list and calls `reviewVehicleClaim` with
      `{ decision: 'APPROVED' }`; clicking Reject with no reason entered
      does **not** call the service at all (not just that it rejects);
      entering a reason and rejecting calls `reviewVehicleClaim` with the
      exact `rejectionReason` and removes the claim.
    - **Also added** (ahead of the explicit Step 13 scope, since it's the
      natural pairing): 3 tests for `VehicleReimbursementCapture.tsx`
      covering the plan's original test item 29 (now a post-clock-out
      submit gate rather than a clock-in gate, per Step 10's correction) —
      Submit stays disabled until vehicle type, hours, notes, and both
      photos are all present; the capped-preview banner renders when
      declared hours exceed the 2.0h shift length in the fixture; and a
      fully valid submission calls `submitVehicleClaim` with the exact
      entered values.
    - **Lint findings fixed during this step:** the `next/image` test
      mock's `<img>` tripped `@next/next/no-img-element` (a real rule,
      correctly firing on a literal `<img>` even though the file under
      test never renders one) — suppressed with an inline comment
      explaining it's a test stub, not a production `<img>`; removed an
      eslint-disable comment left over from an earlier draft that had
      become unused once the mock didn't need `any`.
    - `npx tsc --noEmit` → clean. `npx eslint
      src/components/features/payroll/` → 0 problems.
    - Full suite regression check: `npx vitest run` → **419/419 pass, 81
      files**.
13. ✅ **Admin payroll dashboard** — `PayrollDashboard`,
    `ContractorPayrollTable`, `PayrollSummaryCards`,
    `/admin/payroll/page.tsx`, nav entry, `navigationContracts.test.ts`
    update.
    - `PayrollSummaryCards.tsx`: 8-card totals row (billable hours,
      taxable payroll, vehicle reimbursement, total payout, utility
      billing, margin $, margin %, contractor count) — mirrors
      `ReportsDashboard`'s metric-card row exactly; negative margin
      renders in `text-grid-danger-ink`, positive in
      `text-grid-success-ink`.
    - `ContractorPayrollTable.tsx`: wraps the existing `DataTable`
      primitive; every money column renders `—` instead of `$0.00` when
      `entryCount === 0` (a contractor with no activity this period is
      not the same as a contractor who earned $0).
    - `PayrollDashboard.tsx`: period (`from`/`to`) + storm-event filter
      (sourced from `stormEventService.listStormEvents()`, with an "All
      Storms" option mapping to `undefined` in the service call),
      Refresh, CSV export (reused the exact `downloadArtifact` Blob/`
      Uint8Array` copy-and-slice pattern from `ReportsDashboard.tsx:61-69`
      — needed because a direct `new Blob([content])` with a raw
      `Uint8Array` fails `tsc` under the project's current DOM lib types:
      `Uint8Array<ArrayBufferLike>` is not assignable to `BlobPart`
      without copying into a fresh `ArrayBuffer`-backed instance first),
      the summary cards, the contractor table, the
      `VehicleReimbursementReview` queue, and both `RoleRateEditor` +
      `UtilityBillingRateEditor` (storm-scoped when a specific storm is
      selected, global otherwise) below it.
    - `src/app/(admin)/admin/payroll/page.tsx`: new route, thin wrapper
      mounting `PayrollDashboard` with the signed-in admin's
      `reviewerId`.
    - `navigationConfig.ts`: added `{ href: '/admin/payroll', label:
      'Payroll', signalKey: 'reviews', badgeStyle: 'count' }` to
      `ADMIN_SIDEBAR_NAV_ITEMS`. `navigationContracts.test.ts` updated to
      assert it's present.
    - Barrel export updated with `ContractorPayrollTable`,
      `PayrollDashboard`, `PayrollSummaryCards`.
    - 9 new tests: `PayrollSummaryCards.test.tsx` (4 — loading placeholder,
      no-data placeholder, formatted values, negative-margin color class)
      and `ContractorPayrollTable.test.tsx` (3 — dash for zero-activity
      row, formatted values for an active row, empty-state message), plus
      `PayrollDashboard.test.tsx` (2 — full composition renders the
      summary/table/sub-editors together with all dependencies mocked;
      a load error surfaces via the `Alert` without crashing the page).
    - `npx tsc --noEmit` → clean. `npx eslint` on all new/changed files →
      0 problems.
    - Full suite regression check: `npx vitest run` → **428/428 pass, 84
      files**.
    - **Production build verification:** `npm run build` (Turbopack,
      the project default) fails with `Symlink [project]/node_modules is
      invalid, it points out of the filesystem root` — an environment/
      sandbox limitation (this workspace's `node_modules` is a symlink to
      a path outside the build root) unrelated to any code in this phase;
      the project's own `dev` script already works around the identical
      issue with `next dev --webpack`. Ran `npx next build --webpack`
      instead: **compiled successfully, TypeScript passed, and all 41
      routes — including the new `/admin/payroll` — generated/
      prerendered without error**, confirmed in the build's route table
      (`○ /admin/payroll` alongside `○ /contractor/time`).
14. ✅ **Contractor-side summary and time-entry money displays** — completed locally by Codex /root (2026-10-03).
    - Preserve stored costing snapshots through remote review mapping and offline queue/cache mapping, including storm scope. Unsynced wages show as awaiting sync rather than using an open-shift zero or recalculating from an editable rate.
    - Separate submitted wages, approved vehicle reimbursement, and payout in contractor and admin displays. Utility billing and margin remain on admin displays. Exclude rejected shifts from payroll totals; only completed shifts enter the online payroll report.
    - Refresh contractor totals/history after clock-out or claim submission and refresh admin totals after a claim review.
    - Connect Payroll to the actual Sidebar and navigation search. Add independent Payroll View/Edit permissions; ordinary Admin edits require an explicit grant. Rate/review controls are read-only without edit permission, and role changes retain the existing Super Admin/CEO boundary.
    - Extend the access-control migration for payroll tables, underlying payroll reads, and staff access to vehicle photos. Applied with explicit approval as `20261004010249`; follow-ups add required invitation server grants and cache policy identity.
    - Verify the real staff Payroll page and time-review route. Desktop, tablet (820×1180), and phone (390×844) visual checks pass; wide rate tables scroll internally. Contractor display checks use labeled sample shifts, not a live contractor workflow.
15. **Full validation gate — local and live database checks complete; device workflow acceptance remains open.**
    - 441 tests pass across 85 files; TypeScript and scoped ESLint pass. Isolated webpack production build succeeds with 41 routes.
    - 18 isolated PGlite access-control checks and 16 payroll-integrity checks pass. The integrity fixture now uses the exact original live trigger attachments, including their column-limited UPDATE behavior.
    - Live security/performance advisors inspected: leaked-password protection remains disabled; performance findings include two claim-policy auth-initplan warnings, overlapping claim policies, and unused new indexes. No unrelated advisor changes applied.
    - **Repair deployed with explicit user approval (2026-10-03):** `preserve_payroll_snapshots_and_guard_vehicle_claims`, live version `20261004002801`. Both function bodies match the approved repair; both trigger attachments now run on every INSERT/UPDATE. Original live definitions are preserved in `supabase/payroll_integrity_baseline.json`. The earlier isolated test missed the real UPDATE OF attachment restriction: status-only review previously skipped the functions, snapshot-only edits could bypass them, and resending costing inputs could recalculate a closed shift. The revised tests reproduce those actual conditions.
    - **20 live database/RLS checks pass**, using simulated request identities inside a rollback subtransaction: ownership isolation, closed-shift immutability, same-driver claim linkage, photo-path linkage, capped reimbursement, status-only review authorization, server-bound reviewer, and linked payout. A four-hour driver fixture retained $180 wage / $400 utility billing and $20 approved reimbursement after rate edits. All fixtures and temporary rate/role changes rolled back; live counts remain zero shifts / zero claims. Evidence: `docs/testing/payroll-live-integrity.json` and `scripts/verification/payroll-live-rollback.sql`. This proves live database behavior, not physical GPS/photo capture or browser claim submission.
    - **Real contractor browser checks pass:** existing QA Alex account signs in at the Wi-Fi URL, receives the configured $85/h rate, refreshes submitted totals, retains identity after reload, and is redirected to `/forbidden` when requesting `/admin/payroll`. GPS refresh returns an error; clock-in correctly refuses to create a shift. Full device clock-in/out, photo upload, claim submission/review, and displayed linked totals remain pending. A trusted HTTPS address is needed for the iPad geolocation test; the HTTP LAN pilot only proves browsing/sign-in.
    - Reconcile all five Phase 3 payroll migration files locally: generate them with the CLI, match their filenames to confirmed live history versions, and verify the four earlier files against the exact recorded migration SQL. The current repair file also matches the applied SQL. No migrations were reapplied during reconciliation and no migration version was invented. The separate per-user permissions/invitation migration was subsequently approved and applied as `20261004010249`, with grants `20261004010952` and policy performance fix `20261004011222`. Pass 19 isolated permissions checks and 23 live rollback database checks. Real David staff browser save/reload/reset preserves both Super Admins' full access. Invitation delivery and two independent real staff restriction sessions remain acceptance items; see `docs/adr/0006-individual-admin-permissions.md`. — Codex /root (2026-10-03)
16. ✅ **Dummy pilot rates configured**, per the user's instruction (2026-10-03).
    - Keep the existing 30 placeholder wage rates (5 roles × 6 work types).
    - Add six global utility-billing fallback rates: standard assessment $175/h, emergency response $250/h, travel $100/h, standby $85/h, admin $125/h, training $90/h. Read back all six live; no existing rate was overwritten.
    - Storm-specific rates can override the fallback through the existing editor. Replace pilot values with the correct rates when supplied; no actual-payroll accuracy claim is made for these dummy numbers.

Steps 9-10 and 11-12 are each an independent pair that could run in parallel;
everything else is strictly sequential because each step's type surface is
consumed by the next.

---

## Decision Log (confirmed with user before implementation)

1. **Utility bill rate scope** — per-storm-event rate card per work type,
   with a global fallback row. *(Not* per-utility-client, not a single
   global rate, not a markup multiplier.)
2. **Role cardinality** — exactly one `contractor_role` per contractor; no
   multi-role stacking, no secondary-perk model.
3. **Vehicle reimbursement basis** — flat `$5.00 per declared hour`
   (not a daily flat, not folded into the hourly wage), where declared hours
   are self-reported and may be less than the full shift, capped server-side
   at actual billable hours. Requires vehicle type (personal/rental), notes,
   a vehicle photo, and a license-plate photo. Non-taxable, excluded from
   `payroll_amount` and 1099 wages, and requires admin approval before
   counting toward payout or margin.


# Phase 4 — Test workers and weekly overtime (2026-10-03, Codex /root)

Requested acceptance: create four real Supabase Auth/profile/contractor accounts for Storm Manager, Team Lead, Senior Damage Assessor, and Driver; retain existing QA Damage Assessor to cover all five pay classes. Use the existing dummy pilot rates. Link clock actions to selected assigned tickets, validate work types and break choices, persist GPS accuracy, accept a full 16-hour day, and test payroll versus billing end to end.

User selected overtime after 40 hours per week. Implement 1.5x assigned wage after 40 worked hours in a Monday-Sunday America/Chicago workweek. Customer billing remains at its configured hourly rate. Preserve historical rate and money snapshots. For a shift spanning a workweek boundary, distribute unpaid break minutes proportionally across the elapsed week segments because break timestamps are not captured. Reject overlapping or out-of-order shifts so frozen overtime allocations remain accurate.

Order: (1) inspect live schema/rates/access; (2) local validated clock and server overtime changes with meaningful tests; (3) apply verified migration and create isolated QA backend fixtures; (4) real browser login, ticket selection, clock actions with emulated test GPS/time, review and linked payroll; (5) reconcile live records and evidence, update tracker. Browser emulation is test evidence, not physical GPS/device acceptance.

Progress: inspection complete; implementation in progress. — Codex /root

Phase 4 test-worker progress: four live accounts, approved worker profiles, QA storm roster, and assigned tickets created. Four separate real browser sign-ins retain identity after reload. Each completes a 16-hour below-threshold shift with emulated GPS/time and persisted ticket/storm/accuracy links. Live stored totals reconcile to 64 hours, $6,080 wages, $11,200 customer billing, and $5,120 margin before reimbursement. Local weekly overtime and chronological offline sync are implemented; 446 tests / 86 files, 15 isolated database suites (including 30 role/work-type combinations), TypeScript, scoped ESLint, and isolated webpack build pass. Automatic approval review rejected live migration deployment and access to the existing staff session without specific authorization. Approval questions are pending. Weekly overtime, staff dashboard/review, live offline sync, reimbursement workflow, and physical device acceptance remain open. See `docs/testing/payroll-worker-acceptance.json`. — Codex /root (2026-10-03)

Continuation progress: two QA Driver shifts completed offline and uploaded exactly once on reconnection. A one-hour shift costs $65 wages / $175 billing; a one-hour shift with a selected 15-minute break costs $48.75 wages / $131.25 billing. All six QA shifts now reconcile to 66 elapsed hours, 65.75 paid hours, $6,193.75 wages, $11,506.25 billing, and $5,312.50 margin before reimbursement. Corrected unsynced wage estimates, offline pending-hour display, worker snapshot caching, automatic submitted-total refresh, and loss of the verified worker identity during the offline background refresh. A real 35-second offline check verifies retained identity and cached payroll history. Sign-out and account-change isolation remain tested. Validation now passes 452 tests across 86 files, TypeScript, scoped ESLint, and isolated production build. Live migration and staff-session approvals are still unanswered; live overtime under the proposed migration and staff review remain pending. — Codex /root (2026-10-03)

Completion audit: live query confirms all four profiles active and approved, real Auth sign-ins, one assigned QA ticket each, six persisted shifts, 65.75 paid hours, $6,193.75 wages, and $11,506.25 billing. Live weekly migration remains absent; all six reviews remain pending and none are approved. The same approval condition has persisted across three consecutive goal turns. Remaining live overtime, isolation, ticket transitions, staff review, and linked payroll acceptance require the explicitly requested migration and staff-session approvals. Full goal acceptance is not achieved. — Codex /root (2026-10-03)

Dashboard feedback (`/admin/dashboard`): the status strip tracked In Route, On Site, Pending Review, and Unassigned, all derived from currently-active tickets in `dashboardReportingService.buildDashboardMetrics`. Added a matching `completed` count of active `COMPLETE` tickets to `status_breakdown`, rendered as a fifth `Completed` tile in `DashboardMetrics.tsx`. Widened the strip to `md:grid-cols-5` and generalized the mobile `cc-status-stat` border rules (fixed 2x2 to `nth-child(2n)` / `:last-child`) since a fifth cell breaks the old `nth-child(2)` / `nth-child(n+3)` assumptions. Replaced the duplicated super-admin local-test breakdown with a direct `buildDashboardMetrics` call so both paths share one implementation. Extended the reporting and navigation-signal test fixtures; 452 tests across 86 files and `tsc --noEmit` pass. — Cline (2026-10-04)



# Phase 4 — Configurable contractor time and payroll (2026-10-04, Codex /root)

This user-approved plan supersedes the fixed 40-hour/1.5x proposal above. New work uses immutable, effective-timestamp contractor agreements containing role, base/work-type wages, flat or weekly-tier policy, workweek settings, driver eligibility, and vehicle-use allowance. Actual break and vehicle-use intervals split costing at rate, week, tier, and activity boundaries. Closed historical money remains unchanged. The former unapplied weekly migration is an intentional no-op; the CLI-created replacement is `20261004174918_configurable_contractor_time_payroll.sql`.

CEO/SUPER_ADMIN edit and review; ADMIN is read-only despite permission overrides. Shared time reads and caches contain wages only; utility rates, billing totals, and margins require guarded privileged reads. Mixed financial time rows leave the raw Realtime publication. Invitations persist compensation before Auth delivery and bind it to the same contractor identity with retry repair. Onboarding forms, password flows, starting locations and plate uploads remain outside this implementation.

Implementation progress: agreement schema/calculator, explicit wage projections, invitation integration, agreement controls, timed activities and clock photos are implemented locally. Four QA accounts and their prior shifts remain the existing acceptance fixtures; no additional accounts or invitations were sent. Fourteen isolated PGlite suites pass the core calculations, immutable snapshots, ownership and read-only/confidentiality checks. UI/unit verification, live migration and authenticated acceptance are still in progress. Isolated evidence is `docs/testing/configurable-payroll-local.json`. — Codex /root

# Phase 4 — Required ticket field assessments (2026-10-05, Codex /root)

Implement the user's top-down utility assessment as a versioned, validated record attached to an assigned ticket. Preserve existing assessments and GPS/photo capture. Use blue-primary/navy field-sheet styling with gold section markers, explicit unanswered yes/no controls, conditional required damage descriptions, enumerated sizes, and final additional notes (enter None when there are none).

Order: (1) shared field definitions and conditional validation, (2) additive Supabase migration with assignment/identity enforcement and atomic urgent escalation, (3) form and ticket/admin readback, (4) idempotent offline submission/reconnect processor, (5) focused tests, database checks, type/lint/build and responsive UI checks, (6) tracker and graph refresh. Public danger or oil leakage raises assessment priority A and ticket severity CRITICAL/is_important; it never lowers an existing priority. Counts without user-provided ranges use nonnegative/positive whole numbers. Historical generic assessments remain readable; new assessments require the full field sheet.

Progress: implementation in progress. Live database baseline confirmed: no structured field-sheet column, authenticated assessment privileges missing, and contractor ticket guard prevents direct priority changes. Repair only the assessment path, retaining role, onboarding, and module restrictions. No Git operations authorized or performed.

## Required assessment delivery status — Codex /root

Completed locally: shared field definitions/conditional validators; numbered responsive field sheet; required damage descriptions and final notes; IndexedDB draft persistence; ticket/admin readback; identity-scoped, idempotent assessment reconnect processing; exact migration and 29 isolated database checks. Typecheck/scoped ESLint and webpack production build pass; desktop/phone component preview interactions pass. Four unrelated TicketAssign tests fail because the existing stormRosterService mock lacks listOptions. Live migration activation was rejected by automatic approval review and requires approval of the exact schema/permission changes. No production database changes or authenticated end-to-end submission claimed. See docs/testing/field-assessments-validation.md.

Final evidence: 43/43 focused assessment tests pass; 523 full-suite tests pass with four unrelated TicketAssign mock failures. Knowledge graph refreshed with graphify update .; semantic document graph rebuild was not run.

Continuation — 2026-10-06: The user authorized making this feature live. Applied `20261006120830_top_down_ticket_assessments` to the verified Central Command Supabase project. Live schema inspection confirms `field_assessment` and `photo_evidence`, active guard/escalation triggers, retained restrictive access policies plus the reviewer permission policy, and zero existing assessment rows. Local post-activation migration suite passes 34/34 database checks. Moved both admin and contractor assessment entry points into the ticket workflow: ticket detail now contains contractor field records and admin review filtered to that ticket; old admin review URL redirects to `/tickets`; dashboard actions lead to tickets. Focused tests pass 16/16 and TypeScript passes. Targeted ESLint passes on navigation/dashboard/service files; edited ticket/review components retain existing `react-hooks/set-state-in-effect` errors in their loading effects. Production webpack build compiles and generates all 50 pages using isolated output `CC_NEXT_DIST_DIR=.next-assessment-verification`; the standard Turbopack build is blocked by sandbox port binding. Authenticated live CRUD/RLS, physical GPS/photo upload, reconnect, and external deployment remain unverified.

# Phase 4 — Section damage evidence and completed ticket report (2026-10-05, Codex /root)

Require a GPS-validated damage photo beside every active damage/hazard description. Preserve section association, photo IDs and draft files through submission/reconnect and ticket/staff readback. Keep ticket and assessment as one linked record in a printable report, available at COMPLETE/PENDING_REVIEW/APPROVED/CLOSED (or archived completed tickets). Print and browser Save as PDF include utility details, assessment revisions, notes and original photos; refuse an incomplete export if evidence is unavailable.

Order: shared photo rules and stable IDs; section capture and durable draft; server validation in the existing unapplied migration; linked readback/report; focused regression/database/print checks; tracker and graph. Live activation of the earlier permission/schema migration remains pending explicit approval after its recorded automatic-review rejection.
