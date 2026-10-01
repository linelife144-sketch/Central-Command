# Global Storm Theme Rollout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the same high-contrast Grid Electric dark-blue/yellow UI treatment (cards, controls, buttons, hover motion, seams) to every page and shared surface in the app.

**Architecture:** Centralize styling in shared primitives (`Card`, `Button`, utility classes in `globals.css`) and only use page-level overrides when semantics differ (e.g., destructive buttons). Drive rollout with route-grouped Playwright checks plus targeted component unit tests, so every page group gets objective pass/fail coverage. Keep aliases/redirect routes thin and validate they inherit styling from canonical pages.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind v4, shadcn/ui, Vitest, Playwright.

---

## Preconditions

1. Ensure dependencies are installed:
```bash
npm ci
```
Expected: install completes without errors.

2. Ensure authenticated E2E credentials are present for admin/contractor route checks:
```bash
echo "$E2E_ADMIN_EMAIL|$E2E_ADMIN_PASSWORD|$E2E_CONTRACTOR_EMAIL|$E2E_CONTRACTOR_PASSWORD"
```
Expected: all four values are non-empty for full route coverage.

3. Create a working branch:
```bash
git checkout -b codex/global-storm-theme-rollout
```
Expected: branch created and checked out.

---

### Task 1: Stabilize Shared Theme Primitives

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/select.tsx`
- Test: `src/components/ui/button.theme.test.ts`

**Step 1: Write the failing test**
```ts
import { describe, expect, it } from 'vitest';
import { buttonVariants } from './button';

describe('storm theme button variant', () => {
  it('includes high-contrast storm classes', () => {
    const classes = buttonVariants({ variant: 'outline' });
    expect(classes).toContain('storm-contrast-button');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/button.theme.test.ts`
Expected: FAIL because outline/default button variants do not include storm contrast classes.

**Step 3: Write minimal implementation**
```ts
// src/components/ui/button.tsx
variant: {
  storm: "storm-contrast-button",
  ...
}
```
```css
/* src/app/globals.css */
.storm-contrast-button { /* yellow fill, black text, white border, pulse/fade hover */ }
.storm-contrast-field { /* readable select/input on dark card */ }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/button.theme.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/globals.css src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/select.tsx src/components/ui/button.theme.test.ts
git commit -m "feat(theme): add shared storm contrast primitives for card/button/field"
```

---

### Task 2: Build Global Theme Regression Spec

**Files:**
- Create: `tests/e2e/ui-theme-consistency.spec.ts`
- Create: `tests/e2e/theme-routes.ts`
- Modify: `playwright.config.ts` (only if needed for tags/projects)

**Step 1: Write the failing test**
```ts
import { test, expect } from '@playwright/test';
import { ADMIN_THEME_ROUTES } from './theme-routes';

for (const route of ADMIN_THEME_ROUTES) {
  test(`@admin-theme ${route} uses storm contrast controls`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('.storm-card').first()).toBeVisible();
    await expect(page.locator('.storm-contrast-button').first()).toBeVisible();
  });
}
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep @admin-theme`
Expected: FAIL on at least one route without contrast buttons/fields.

**Step 3: Write minimal implementation**
```ts
// tests/e2e/theme-routes.ts
export const ADMIN_THEME_ROUTES = [
  '/admin/dashboard',
  '/admin/reports',
  '/admin/storms',
  '/admin/storms/create',
  '/admin/time-review',
  '/admin/expense-review',
  '/admin/assessment-review',
  '/admin/invoice-generation',
  '/admin/map',
];
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep @admin-theme`
Expected: PASS (or SKIP if auth env vars are missing, which is acceptable only for local dry run).

**Step 5: Commit**

```bash
git add tests/e2e/ui-theme-consistency.spec.ts tests/e2e/theme-routes.ts playwright.config.ts
git commit -m "test(theme): add route-level ui theme regression coverage"
```

---

### Task 3: Apply Theme to Admin Core Pages

**Files:**
- Modify: `src/app/(admin)/reports/page.tsx`
- Modify: `src/app/(admin)/storms/page.tsx`
- Modify: `src/app/(admin)/storms/create/page.tsx`
- Modify: `src/app/(admin)/time-review/page.tsx`
- Modify: `src/app/(admin)/expense-review/page.tsx`
- Modify: `src/app/(admin)/assessment-review/page.tsx`
- Modify: `src/app/(admin)/invoice-generation/page.tsx`
- Modify: `src/app/(admin)/admin/map/page.tsx`
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write the failing test**
```ts
test('@admin-theme /admin/storms uses storm contrast primary actions', async ({ page }) => {
  await page.goto('/admin/storms');
  await expect(page.locator('button.storm-contrast-button')).toHaveCount(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "/admin/storms"`
Expected: FAIL (no storm contrast button yet on this route).

**Step 3: Write minimal implementation**
```tsx
// apply across files listed above
<Button variant="storm">Create Storm Event</Button>
<SelectTrigger className="storm-contrast-field">...</SelectTrigger>
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep @admin-theme`
Expected: PASS for admin core routes.

**Step 5: Commit**

```bash
git add src/app/(admin)/reports/page.tsx src/app/(admin)/storms/page.tsx src/app/(admin)/storms/create/page.tsx src/app/(admin)/time-review/page.tsx src/app/(admin)/expense-review/page.tsx src/app/(admin)/assessment-review/page.tsx src/app/(admin)/invoice-generation/page.tsx src/app/(admin)/admin/map/page.tsx tests/e2e/ui-theme-consistency.spec.ts
git commit -m "feat(theme): roll out storm contrast controls across admin core pages"
```

---

### Task 4: Apply Theme to Admin Subcontractor Pages

**Files:**
- Modify: `src/app/(admin)/subcontractors/page.tsx`
- Modify: `src/app/(admin)/subcontractors/[id]/page.tsx`
- Modify: `src/app/(admin)/subcontractors/approval/page.tsx`
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write the failing test**
```ts
test('@admin-theme /admin/subcontractors shows contrast actions', async ({ page }) => {
  await page.goto('/admin/subcontractors');
  await expect(page.locator('.storm-contrast-button').first()).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep subcontractors`
Expected: FAIL on one or more subcontractor pages.

**Step 3: Write minimal implementation**
```tsx
// swap outline/default action buttons to storm variant
<Button variant="storm">Invite Contractor</Button>
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep subcontractors`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/(admin)/subcontractors/page.tsx src/app/(admin)/subcontractors/[id]/page.tsx src/app/(admin)/subcontractors/approval/page.tsx tests/e2e/ui-theme-consistency.spec.ts
git commit -m "feat(theme): apply storm contrast pattern to subcontractor admin screens"
```

---

### Task 5: Apply Theme to Ticket Flows

**Files:**
- Modify: `src/app/tickets/page.tsx`
- Modify: `src/app/tickets/create/page.tsx`
- Modify: `src/app/tickets/[id]/page.tsx`
- Modify: `src/components/features/tickets/TicketForm.tsx`
- Modify: `src/components/features/tickets/TicketCard.tsx`
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write the failing test**
```ts
test('@ticket-theme /tickets/create uses contrast submit controls', async ({ page }) => {
  await page.goto('/tickets/create');
  await expect(page.locator('button.storm-contrast-button')).toHaveCount(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@ticket-theme"`
Expected: FAIL on create/detail pages.

**Step 3: Write minimal implementation**
```tsx
// ticket actions
<Button variant="storm" type="submit">Create Ticket</Button>
<Button variant="storm">Update Status</Button>
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@ticket-theme"`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/tickets/page.tsx src/app/tickets/create/page.tsx src/app/tickets/[id]/page.tsx src/components/features/tickets/TicketForm.tsx src/components/features/tickets/TicketCard.tsx tests/e2e/ui-theme-consistency.spec.ts
git commit -m "feat(theme): unify ticket pages with storm contrast action system"
```

---

### Task 6: Apply Theme to Contractor Portal Pages

**Files:**
- Modify: `src/app/(subcontractor)/time/page.tsx`
- Modify: `src/app/(subcontractor)/expenses/page.tsx`
- Modify: `src/app/(subcontractor)/expenses/create/page.tsx`
- Modify: `src/app/(subcontractor)/invoices/page.tsx`
- Modify: `src/app/(subcontractor)/assessments/create/page.tsx`
- Modify: `src/app/(subcontractor)/layout.tsx`
- Modify: `src/components/features/time-tracking/TimeEntryCard.tsx`
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write the failing test**
```ts
test('@contractor-theme /contractor/time has storm contrast controls', async ({ page }) => {
  await page.goto('/contractor/time');
  await expect(page.locator('.storm-contrast-button').first()).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@contractor-theme"`
Expected: FAIL on at least one contractor route.

**Step 3: Write minimal implementation**
```tsx
<Button variant="storm">Clock In</Button>
<Button variant="storm">Submit Expense</Button>
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@contractor-theme"`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/(subcontractor)/time/page.tsx src/app/(subcontractor)/expenses/page.tsx src/app/(subcontractor)/expenses/create/page.tsx src/app/(subcontractor)/invoices/page.tsx src/app/(subcontractor)/assessments/create/page.tsx src/app/(subcontractor)/layout.tsx src/components/features/time-tracking/TimeEntryCard.tsx tests/e2e/ui-theme-consistency.spec.ts
git commit -m "feat(theme): apply storm contrast ui treatment to contractor portal"
```

---

### Task 7: Apply Theme to Onboarding Flow

**Files:**
- Modify: `src/app/(onboarding)/layout.tsx`
- Modify: `src/app/(onboarding)/welcome/page.tsx`
- Modify: `src/app/(onboarding)/personal-info/page.tsx`
- Modify: `src/app/(onboarding)/business-info/page.tsx`
- Modify: `src/app/(onboarding)/credentials/page.tsx`
- Modify: `src/app/(onboarding)/rates/page.tsx`
- Modify: `src/app/(onboarding)/banking/page.tsx`
- Modify: `src/app/(onboarding)/insurance/page.tsx`
- Modify: `src/app/(onboarding)/training/page.tsx`
- Modify: `src/app/(onboarding)/profile-photo/page.tsx`
- Modify: `src/app/(onboarding)/agreements/page.tsx`
- Modify: `src/app/(onboarding)/review/page.tsx`
- Modify: `src/app/(onboarding)/pending/page.tsx`
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write the failing test**
```ts
test('@onboarding-theme /welcome uses contrast cta', async ({ page }) => {
  await page.goto('/welcome');
  await expect(page.locator('button.storm-contrast-button').first()).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@onboarding-theme"`
Expected: FAIL where onboarding still uses default buttons/surfaces.

**Step 3: Write minimal implementation**
```tsx
<Button variant="storm">Continue</Button>
<Card className="storm-card">...</Card>
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@onboarding-theme"`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/(onboarding)/layout.tsx src/app/(onboarding)/welcome/page.tsx src/app/(onboarding)/personal-info/page.tsx src/app/(onboarding)/business-info/page.tsx src/app/(onboarding)/credentials/page.tsx src/app/(onboarding)/rates/page.tsx src/app/(onboarding)/banking/page.tsx src/app/(onboarding)/insurance/page.tsx src/app/(onboarding)/training/page.tsx src/app/(onboarding)/profile-photo/page.tsx src/app/(onboarding)/agreements/page.tsx src/app/(onboarding)/review/page.tsx src/app/(onboarding)/pending/page.tsx tests/e2e/ui-theme-consistency.spec.ts
git commit -m "feat(theme): standardize onboarding pages to storm contrast design language"
```

---

### Task 8: Apply Theme to Auth and Global Utility Pages

**Files:**
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/forgot-password/page.tsx`
- Modify: `src/app/(auth)/magic-link/page.tsx`
- Modify: `src/app/(auth)/reset-password/page.tsx`
- Modify: `src/app/(auth)/set-password/page.tsx`
- Modify: `src/app/not-found.tsx`
- Modify: `src/app/forbidden.tsx`
- Modify: `src/app/global-error.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write the failing test**
```ts
test('@public-theme /login primary action uses storm contrast variant', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('button.storm-contrast-button').first()).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@public-theme"`
Expected: FAIL on at least one auth/public route.

**Step 3: Write minimal implementation**
```tsx
<Button variant="storm" type="submit">Sign In</Button>
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@public-theme"`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/(auth)/layout.tsx src/app/(auth)/login/page.tsx src/app/(auth)/forgot-password/page.tsx src/app/(auth)/magic-link/page.tsx src/app/(auth)/reset-password/page.tsx src/app/(auth)/set-password/page.tsx src/app/not-found.tsx src/app/forbidden.tsx src/app/global-error.tsx src/app/page.tsx tests/e2e/ui-theme-consistency.spec.ts
git commit -m "feat(theme): extend storm contrast theme to auth and public utility pages"
```

---

### Task 9: Apply Theme to Storm Ticket Entry Route

**Files:**
- Modify: `src/app/(storm)/storms/[stormId]/tickets/new/page.tsx`
- Modify: `src/app/(storm)/storms/[stormId]/tickets/new/ticket-new-client-page.tsx`
- Modify: `src/components/features/tickets/TicketFormRenderer.tsx`
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write the failing test**
```ts
test('@storm-theme /storms/:stormId/tickets/new uses contrast submit controls', async ({ page }) => {
  await page.goto('/storms/00000000-0000-0000-0000-000000000000/tickets/new');
  await expect(page.locator('.storm-contrast-button').first()).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@storm-theme"`
Expected: FAIL until renderer actions adopt the shared variant.

**Step 3: Write minimal implementation**
```tsx
<Button variant="storm" type="submit">Create Ticket</Button>
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@storm-theme"`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/(storm)/storms/[stormId]/tickets/new/page.tsx src/app/(storm)/storms/[stormId]/tickets/new/ticket-new-client-page.tsx src/components/features/tickets/TicketFormRenderer.tsx tests/e2e/ui-theme-consistency.spec.ts
git commit -m "feat(theme): apply storm contrast controls to storm-scoped ticket creation"
```

---

### Task 10: Align Shared Data Display Components

**Files:**
- Modify: `src/components/common/layout/PageHeader.tsx`
- Modify: `src/components/common/data-display/DataTable.tsx`
- Modify: `src/components/common/data-display/StatusBadge.tsx`
- Modify: `src/components/common/data-display/MetricCard.tsx`
- Test: `src/components/common/data-display/StatusBadge.theme.test.ts`
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest';
import { statusBadgeVariants } from './StatusBadge';

describe('status badge theme', () => {
  it('uses readable contrast on dark surfaces', () => {
    expect(statusBadgeVariants({ variant: 'default' })).toContain('text-[#0a1733]');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/common/data-display/StatusBadge.theme.test.ts`
Expected: FAIL because badge variants are not mapped to new contrast text.

**Step 3: Write minimal implementation**
```ts
// StatusBadge.tsx
default: 'bg-[linear-gradient(...)] text-[#0a1733] border border-white/90'
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/common/data-display/StatusBadge.theme.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/common/layout/PageHeader.tsx src/components/common/data-display/DataTable.tsx src/components/common/data-display/StatusBadge.tsx src/components/common/data-display/MetricCard.tsx src/components/common/data-display/StatusBadge.theme.test.ts tests/e2e/ui-theme-consistency.spec.ts
git commit -m "feat(theme): unify shared data display components with contrast-safe storm tokens"
```

---

### Task 11: Validate Alias and Redirect Route Coverage

**Files:**
- Modify: `tests/e2e/theme-routes.ts`
- Modify: `tests/e2e/ui-theme-consistency.spec.ts`
- Verify-only: `src/app/(admin)/admin/**/page.tsx`
- Verify-only: `src/app/(subcontractor)/contractor/**/page.tsx`
- Verify-only: `src/app/(subcontractor)/subcontractor/**/page.tsx`

**Step 1: Write the failing test**
```ts
export const ALIAS_THEME_ROUTES = [
  '/admin/dashboard',
  '/admin/reports',
  '/contractor/time',
  '/contractor/map',
  '/subcontractor/map',
];
```
```ts
test('@alias-theme alias routes preserve themed controls', async ({ page }) => {
  for (const route of ALIAS_THEME_ROUTES) {
    await page.goto(route);
    await expect(page.locator('.storm-card').first()).toBeVisible();
  }
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@alias-theme"`
Expected: FAIL on any alias route not inheriting canonical themed page.

**Step 3: Write minimal implementation**
```ts
// keep aliases as re-exports/redirects only; do not duplicate styling logic
export { default } from '../../dashboard/page';
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@alias-theme"`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/e2e/theme-routes.ts tests/e2e/ui-theme-consistency.spec.ts
git commit -m "test(theme): enforce themed output parity across alias and redirect routes"
```

---

### Task 12: Accessibility and Motion Validation

**Files:**
- Modify: `tests/e2e/ui-theme-consistency.spec.ts`
- Modify: `src/app/globals.css` (only if fixes are needed)
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write the failing test**
```ts
test('@a11y-theme reduced motion disables pulse animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/admin/dashboard');
  const animation = await page.locator('.storm-contrast-button').first().evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe('none');
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@a11y-theme"`
Expected: FAIL if pulse animation still runs in reduced motion.

**Step 3: Write minimal implementation**
```css
@media (prefers-reduced-motion: reduce) {
  .storm-contrast-button:hover {
    animation: none;
    transform: none;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@a11y-theme"`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/globals.css tests/e2e/ui-theme-consistency.spec.ts
git commit -m "fix(theme): enforce reduced-motion and accessibility behavior for storm controls"
```

---

### Task 13: Final Verification Matrix and Documentation

**Files:**
- Modify: `grid-electric-docs/04-DESIGN-SYSTEM.md`
- Modify: `grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md`
- Modify: `tests/e2e/ui-theme-consistency.spec.ts` (final route list only if needed)

**Step 1: Write the failing test**
```ts
test('@theme-final all route groups covered', async () => {
  const routeGroups = ['admin', 'ticket', 'contractor', 'onboarding', 'auth', 'storm', 'alias'];
  expect(routeGroups.length).toBe(7);
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/ui-theme-consistency.spec.ts --grep "@theme-final"`
Expected: FAIL until final route matrix/constants are complete.

**Step 3: Write minimal implementation**
```md
## Storm Contrast Theme
- Buttons: `variant="storm"`
- Fields: `.storm-contrast-field`
- Mini stats: `.storm-mini-stat`
- Motion: pulse on hover, disabled in reduced-motion mode
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm run typecheck
npm run lint
npx vitest run src/components/ui/button.theme.test.ts src/components/common/data-display/StatusBadge.theme.test.ts
npx playwright test tests/e2e/ui-theme-consistency.spec.ts
```
Expected: all PASS (authenticated tests may SKIP without env vars).

**Step 5: Commit**

```bash
git add grid-electric-docs/04-DESIGN-SYSTEM.md grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md tests/e2e/ui-theme-consistency.spec.ts
git commit -m "docs(theme): document global storm contrast ux standard and verification matrix"
```

---

## Route Coverage Checklist (Canonical Pages)

- Admin:
`src/app/(admin)/dashboard/page.tsx`
`src/app/(admin)/reports/page.tsx`
`src/app/(admin)/storms/page.tsx`
`src/app/(admin)/storms/create/page.tsx`
`src/app/(admin)/time-review/page.tsx`
`src/app/(admin)/expense-review/page.tsx`
`src/app/(admin)/assessment-review/page.tsx`
`src/app/(admin)/invoice-generation/page.tsx`
`src/app/(admin)/subcontractors/page.tsx`
`src/app/(admin)/subcontractors/[id]/page.tsx`
`src/app/(admin)/subcontractors/approval/page.tsx`
`src/app/(admin)/admin/map/page.tsx`

- Tickets:
`src/app/tickets/page.tsx`
`src/app/tickets/create/page.tsx`
`src/app/tickets/[id]/page.tsx`

- Contractor:
`src/app/(subcontractor)/time/page.tsx`
`src/app/(subcontractor)/expenses/page.tsx`
`src/app/(subcontractor)/expenses/create/page.tsx`
`src/app/(subcontractor)/invoices/page.tsx`
`src/app/(subcontractor)/assessments/create/page.tsx`

- Onboarding:
`src/app/(onboarding)/welcome/page.tsx`
`src/app/(onboarding)/personal-info/page.tsx`
`src/app/(onboarding)/business-info/page.tsx`
`src/app/(onboarding)/credentials/page.tsx`
`src/app/(onboarding)/rates/page.tsx`
`src/app/(onboarding)/banking/page.tsx`
`src/app/(onboarding)/insurance/page.tsx`
`src/app/(onboarding)/training/page.tsx`
`src/app/(onboarding)/profile-photo/page.tsx`
`src/app/(onboarding)/agreements/page.tsx`
`src/app/(onboarding)/review/page.tsx`
`src/app/(onboarding)/pending/page.tsx`

- Auth/Public:
`src/app/(auth)/login/page.tsx`
`src/app/(auth)/forgot-password/page.tsx`
`src/app/(auth)/magic-link/page.tsx`
`src/app/(auth)/reset-password/page.tsx`
`src/app/(auth)/set-password/page.tsx`
`src/app/page.tsx`
`src/app/not-found.tsx`
`src/app/forbidden.tsx`
`src/app/global-error.tsx`

- Storm:
`src/app/(storm)/storms/[stormId]/tickets/new/page.tsx`
`src/app/(storm)/storms/[stormId]/tickets/new/ticket-new-client-page.tsx`

