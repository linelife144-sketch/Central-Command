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
