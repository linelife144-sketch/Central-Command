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

1. **Migration 1** (`role_rates_and_payroll_costing`) — apply via
   `apply_migration`, run both advisors, regenerate `src/types/database.ts`.
2. **Migration 2** (`vehicle_reimbursement_claims`) — same gate.
3. **`src/types/index.ts`** — `ContractorRole`, `VehicleType`,
   `VehicleClaimStatus`, `VehicleClaim`, `Contractor.role`, `TimeEntry` money
   fields, payroll type block.
4. **`src/lib/utils/payroll.ts` + `payroll.test.ts`** — pure math, fully
   green standalone, before any UI depends on it.
5. **`timeEntryService.ts` clockIn/clockOut fix** + updated
   `timeEntryService.test.ts` — removes the live generated-column write bug.
6. **`src/lib/db/dexie.ts` version(4)** + `dexie.test.ts`.
7. **`src/lib/config/appConfig.ts`** — reimbursement rate, period default, role labels.
8. **`payrollService.ts` + test**, then `contractorService.ts` role passthrough.
9. **Extract `PhotoCapture`** from `ReceiptCapture.tsx`; widen
   `photoStorageService` `entity_type`/bucket; verify `ReceiptCapture` tests
   still pass unchanged.
10. **`VehicleReimbursementCapture`** + `TimeClock.tsx` rate-input removal and
    driver-only mount + clock-in gate. Verify clock-in → clock-out → claim →
    totals end to end against a real storm event.
11. **Admin rate/role editors** — `RoleRateEditor`, `UtilityBillingRateEditor`,
    `ContractorPayrollEditor`; wire into `/admin/contractors/[id]`. Confirm
    the DB guard blocks a non-admin role change.
12. **`VehicleReimbursementReview`** admin card; confirm approve/reject flow
    and the `rejectionReason` requirement.
13. **Admin payroll dashboard** — `PayrollDashboard`, `ContractorPayrollTable`,
    `PayrollSummaryCards`, `/admin/payroll/page.tsx`, nav entry,
    `navigationContracts.test.ts` update.
14. **Contractor-side `ContractorTimeSummary`** mounted on `/contractor/time`;
    `TimeEntryList`/`TimeEntryCard` money columns both modes.
15. **Full validation gate** — typecheck, lint, full vitest, build, advisors.
16. **Seed real rates** for the 5 roles × 6 work types and the utility bill
    rates for the active storm event, replacing the migration placeholders.

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
