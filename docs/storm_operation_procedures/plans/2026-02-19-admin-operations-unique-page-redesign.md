# Admin Operations Unique Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `/admin/time-review`, `/admin/expense-review`, `/admin/assessment-review`, `/admin/invoice-generation`, and `/admin/reports` so each page has a distinct visual system and interaction model while staying inside Grid Electric brand constraints (blue surfaces, gold accents, sharp borders, strong contrast).

**Architecture:** Introduce a small, typed page-variant system (tokens + shell classes) and apply it to each admin operations page with page-specific layouts and controls. Keep shared primitives (`Card`, `Button`, `DataTable`) intact; add variation through scoped wrappers, section composition, and per-page interaction patterns. Use DRY token mapping for consistency, YAGNI component boundaries, and TDD around variant contracts and class invariants.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind v4, shadcn/ui, Vitest, Playwright.

---

## Design Direction Matrix (from @ui-ux-pro-max synthesis)

- **Time Review:** `Command Console` (dense operator controls, hard gold edges, rapid batch-action affordances)
- **Expense Review:** `Compliance Ledger` (risk-first visual hierarchy, policy flags as prominent review rails)
- **Assessment Review:** `Triage Board` (severity clustering, decision-forward reviewer workflow)
- **Invoice Generation:** `Billing Runway` (period timeline + generation pipeline emphasis)
- **Reports:** `Signal Lab` (data-story layout with contrast chart arena and export dock)

## Worktree + Branch (required before coding)

### Task 0: Isolate Work in Dedicated Worktree

**Files:**
- Modify: none
- Test: none

**Step 1: Create worktree and branch**

Run:
```bash
git worktree add ../Grid2-admin-ops-ui codex/admin-ops-unique-redesign
```
Expected: new worktree created at `../Grid2-admin-ops-ui`

**Step 2: Enter worktree and install deps if needed**

Run:
```bash
cd ../Grid2-admin-ops-ui
npm install
```
Expected: dependencies installed, no lockfile drift

**Step 3: Commit checkpoint**

Run:
```bash
git commit --allow-empty -m "chore: initialize admin ops redesign worktree"
```

---

### Task 1: Create Typed Admin Operation Variant Registry

**Files:**
- Create: `src/lib/constants/adminOperationVariants.ts`
- Test: `src/lib/constants/__tests__/adminOperationVariants.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { ADMIN_OPERATION_VARIANTS, type AdminOperationPageKey } from '@/lib/constants/adminOperationVariants';

describe('ADMIN_OPERATION_VARIANTS', () => {
  it('defines all admin operation pages', () => {
    const keys: AdminOperationPageKey[] = [
      'timeReview',
      'expenseReview',
      'assessmentReview',
      'invoiceGeneration',
      'reports',
    ];
    expect(Object.keys(ADMIN_OPERATION_VARIANTS).sort()).toEqual(keys.sort());
  });

  it('keeps each page visually unique', () => {
    const signatures = Object.values(ADMIN_OPERATION_VARIANTS).map((v) => v.signatureClass);
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/constants/__tests__/adminOperationVariants.test.ts
```
Expected: FAIL (`Cannot find module '@/lib/constants/adminOperationVariants'`)

**Step 3: Write minimal implementation**

```ts
export type AdminOperationPageKey =
  | 'timeReview'
  | 'expenseReview'
  | 'assessmentReview'
  | 'invoiceGeneration'
  | 'reports';

export interface AdminOperationVariant {
  pageTitleClass: string;
  shellClass: string;
  filterBarClass: string;
  signatureClass: string;
}

export const ADMIN_OPERATION_VARIANTS: Record<AdminOperationPageKey, AdminOperationVariant> = {
  timeReview: {
    pageTitleClass: 'text-blue-50',
    shellClass: 'border-[#ffc038] bg-[linear-gradient(140deg,#001445_0%,#002866_60%,#0a4f9f_100%)]',
    filterBarClass: 'border-[#ffc038]',
    signatureClass: 'time-command-console',
  },
  expenseReview: {
    pageTitleClass: 'text-blue-50',
    shellClass: 'border-[#ffc038] bg-[linear-gradient(135deg,#1a2130_0%,#24314a_58%,#2d3d5e_100%)]',
    filterBarClass: 'border-[#ffc038]',
    signatureClass: 'expense-ledger-layout',
  },
  assessmentReview: {
    pageTitleClass: 'text-blue-50',
    shellClass: 'border-[#ffc038] bg-[linear-gradient(145deg,#1d2a3a_0%,#234463_52%,#266b82_100%)]',
    filterBarClass: 'border-[#ffc038]',
    signatureClass: 'assessment-triage-board',
  },
  invoiceGeneration: {
    pageTitleClass: 'text-blue-50',
    shellClass: 'border-[#ffc038] bg-[linear-gradient(138deg,#1f1e3a_0%,#2b3570_56%,#3555a8_100%)]',
    filterBarClass: 'border-[#ffc038]',
    signatureClass: 'invoice-runway-shell',
  },
  reports: {
    pageTitleClass: 'text-blue-50',
    shellClass: 'border-[#ffc038] bg-[linear-gradient(140deg,#0f2142_0%,#173a75_52%,#1d5aa6_100%)]',
    filterBarClass: 'border-[#ffc038]',
    signatureClass: 'reports-signal-lab',
  },
};
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/constants/__tests__/adminOperationVariants.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/constants/adminOperationVariants.ts src/lib/constants/__tests__/adminOperationVariants.test.ts
git commit -m "feat(ui): add typed admin operation variant registry"
```

---

### Task 2: Build Reusable Admin Operation Shell Component

**Files:**
- Create: `src/components/common/layout/AdminOperationShell.tsx`
- Test: `src/components/common/layout/__tests__/adminOperationShell.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminOperationShell } from '@/components/common/layout/AdminOperationShell';

describe('AdminOperationShell', () => {
  it('applies a unique signature class for each page key', () => {
    render(
      <AdminOperationShell pageKey="timeReview" title="Time Entry Review">
        <div>Body</div>
      </AdminOperationShell>,
    );
    expect(screen.getByText('Body').closest('section')).toHaveClass('time-command-console');
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/common/layout/__tests__/adminOperationShell.test.tsx
```
Expected: FAIL (`Cannot find module '@/components/common/layout/AdminOperationShell'`)

**Step 3: Write minimal implementation**

```tsx
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ADMIN_OPERATION_VARIANTS, type AdminOperationPageKey } from '@/lib/constants/adminOperationVariants';

export function AdminOperationShell({
  pageKey,
  title,
  description,
  children,
}: {
  pageKey: AdminOperationPageKey;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const variant = ADMIN_OPERATION_VARIANTS[pageKey];

  return (
    <section className={cn('rounded-2xl border p-4 shadow-[0_16px_36px_rgba(0,18,74,0.35)] sm:p-5', variant.shellClass, variant.signatureClass)}>
      <header className="mb-5 space-y-1">
        <h1 className={cn('text-2xl font-bold', variant.pageTitleClass)}>{title}</h1>
        <p className="text-blue-100">{description}</p>
      </header>
      {children}
    </section>
  );
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/components/common/layout/__tests__/adminOperationShell.test.tsx
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/common/layout/AdminOperationShell.tsx src/components/common/layout/__tests__/adminOperationShell.test.tsx
git commit -m "feat(ui): add reusable admin operation shell"
```

---

### Task 3: Redesign Time Review as Command Console + Hard Gold Controls

**Files:**
- Modify: `src/app/(admin)/time-review/page.tsx`
- Modify: `src/components/features/time-tracking/TimeEntryList.tsx`
- Test: `src/components/features/time-tracking/__tests__/timeEntryList.theme.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { TIME_REVIEW_FILTER_CONTROL_CLASS } from '@/components/features/time-tracking/TimeEntryList';

describe('TIME_REVIEW_FILTER_CONTROL_CLASS', () => {
  it('uses fully solid gold border', () => {
    expect(TIME_REVIEW_FILTER_CONTROL_CLASS).toContain('border-[#ffc038]');
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/features/time-tracking/__tests__/timeEntryList.theme.test.ts
```
Expected: FAIL (export does not exist yet)

**Step 3: Write minimal implementation**

```ts
export const TIME_REVIEW_FILTER_CONTROL_CLASS =
  'border-[#ffc038] shadow-none focus-visible:border-[#ffc038] focus-visible:ring-[2px] focus-visible:ring-[#ffc038]';
```

And apply:
- `AdminOperationShell pageKey="timeReview"` in `src/app/(admin)/time-review/page.tsx`
- command-console grouping in `TimeEntryList` (filter bar + action rail + KPI strip)

**Step 4: Run tests**

Run:
```bash
npx vitest run src/components/features/time-tracking/__tests__/timeEntryList.theme.test.ts
npx eslint src/app/(admin)/time-review/page.tsx src/components/features/time-tracking/TimeEntryList.tsx
```
Expected: PASS + no lint errors

**Step 5: Commit**

```bash
git add src/app/(admin)/time-review/page.tsx src/components/features/time-tracking/TimeEntryList.tsx src/components/features/time-tracking/__tests__/timeEntryList.theme.test.ts
git commit -m "feat(ui): redesign time review as command console with hard gold controls"
```

---

### Task 4: Redesign Expense Review as Compliance Ledger

**Files:**
- Modify: `src/app/(admin)/expense-review/page.tsx`
- Modify: `src/components/features/expenses/ExpenseReviewList.tsx`
- Test: `src/components/features/expenses/__tests__/expenseReview.layout.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { getExpenseReviewLayoutMode } from '@/components/features/expenses/ExpenseReviewList';

describe('expense review layout mode', () => {
  it('returns ledger mode', () => {
    expect(getExpenseReviewLayoutMode()).toBe('ledger');
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/features/expenses/__tests__/expenseReview.layout.test.ts
```
Expected: FAIL (helper missing)

**Step 3: Write minimal implementation**

```ts
export function getExpenseReviewLayoutMode() {
  return 'ledger';
}
```

Then implement page design:
- Left `Policy Risk` rail (flag counts + high-risk queue)
- Right `Review Queue` panel (existing table/list)
- Distinct row chips for mileage/receipt/policy flags

**Step 4: Run tests**

Run:
```bash
npx vitest run src/components/features/expenses/__tests__/expenseReview.layout.test.ts
npx eslint src/app/(admin)/expense-review/page.tsx src/components/features/expenses/ExpenseReviewList.tsx
```
Expected: PASS + no lint errors

**Step 5: Commit**

```bash
git add src/app/(admin)/expense-review/page.tsx src/components/features/expenses/ExpenseReviewList.tsx src/components/features/expenses/__tests__/expenseReview.layout.test.ts
git commit -m "feat(ui): redesign expense review into compliance ledger layout"
```

---

### Task 5: Redesign Assessment Review as Triage Board

**Files:**
- Modify: `src/app/(admin)/assessment-review/page.tsx`
- Modify: `src/components/features/assessments/AssessmentReviewList.tsx`
- Test: `src/components/features/assessments/__tests__/assessmentReview.triage.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { bucketAssessmentPriority } from '@/components/features/assessments/AssessmentReviewList';

describe('bucketAssessmentPriority', () => {
  it('maps A to critical triage lane', () => {
    expect(bucketAssessmentPriority('A')).toBe('critical');
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/features/assessments/__tests__/assessmentReview.triage.test.ts
```
Expected: FAIL (helper missing)

**Step 3: Write minimal implementation**

```ts
export function bucketAssessmentPriority(priority?: 'A' | 'B' | 'C' | 'X') {
  if (priority === 'A') return 'critical';
  if (priority === 'B') return 'urgent';
  if (priority === 'C') return 'standard';
  return 'hold';
}
```

Then apply triage UI:
- Top lane chips (`Critical`, `Urgent`, `Standard`, `Hold`)
- Decision dock (`Approve`, `Needs Rework`) pinned in review context
- Distinct visual grouping for safety flags

**Step 4: Run tests**

Run:
```bash
npx vitest run src/components/features/assessments/__tests__/assessmentReview.triage.test.ts
npx eslint src/app/(admin)/assessment-review/page.tsx src/components/features/assessments/AssessmentReviewList.tsx
```
Expected: PASS + no lint errors

**Step 5: Commit**

```bash
git add src/app/(admin)/assessment-review/page.tsx src/components/features/assessments/AssessmentReviewList.tsx src/components/features/assessments/__tests__/assessmentReview.triage.test.ts
git commit -m "feat(ui): redesign assessment review into triage board"
```

---

### Task 6: Redesign Invoice Generation as Billing Runway

**Files:**
- Modify: `src/app/(admin)/invoice-generation/page.tsx`
- Modify: `src/components/features/invoices/InvoiceGenerator.tsx`
- Test: `src/components/features/invoices/__tests__/invoiceGenerator.period.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { hasValidBillingWindow } from '@/components/features/invoices/InvoiceGenerator';

describe('hasValidBillingWindow', () => {
  it('rejects inverted date windows', () => {
    expect(hasValidBillingWindow('2026-03-10', '2026-03-01')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/features/invoices/__tests__/invoiceGenerator.period.test.ts
```
Expected: FAIL (helper missing)

**Step 3: Write minimal implementation**

```ts
export function hasValidBillingWindow(start: string, end: string): boolean {
  return new Date(start).getTime() <= new Date(end).getTime();
}
```

Then apply runway UI:
- Billing period timeline header
- Candidate queue board + batch action dock
- Separate 1099 projection panel with stronger contrast callouts

**Step 4: Run tests**

Run:
```bash
npx vitest run src/components/features/invoices/__tests__/invoiceGenerator.period.test.ts
npx eslint src/app/(admin)/invoice-generation/page.tsx src/components/features/invoices/InvoiceGenerator.tsx
```
Expected: PASS + no lint errors

**Step 5: Commit**

```bash
git add src/app/(admin)/invoice-generation/page.tsx src/components/features/invoices/InvoiceGenerator.tsx src/components/features/invoices/__tests__/invoiceGenerator.period.test.ts
git commit -m "feat(ui): redesign invoice generation as billing runway"
```

---

### Task 7: Redesign Reports Dashboard as Signal Lab

**Files:**
- Modify: `src/app/(admin)/reports/page.tsx`
- Modify: `src/components/features/dashboard/ReportsDashboard.tsx`
- Test: `src/components/features/dashboard/__tests__/reportsDashboard.series.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { getSeriesPeak } from '@/components/features/dashboard/ReportsDashboard';

describe('getSeriesPeak', () => {
  it('returns 0 for empty series', () => {
    expect(getSeriesPeak([])).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/features/dashboard/__tests__/reportsDashboard.series.test.ts
```
Expected: FAIL (helper missing)

**Step 3: Write minimal implementation**

```ts
export function getSeriesPeak(values: number[]): number {
  return values.length ? Math.max(...values) : 0;
}
```

Then apply signal-lab UI:
- Builder controls docked in top strip
- KPI cards with differentiated shapes/icons per metric
- Chart arena with side legend + export dock

**Step 4: Run tests**

Run:
```bash
npx vitest run src/components/features/dashboard/__tests__/reportsDashboard.series.test.ts
npx eslint src/app/(admin)/reports/page.tsx src/components/features/dashboard/ReportsDashboard.tsx
```
Expected: PASS + no lint errors

**Step 5: Commit**

```bash
git add src/app/(admin)/reports/page.tsx src/components/features/dashboard/ReportsDashboard.tsx src/components/features/dashboard/__tests__/reportsDashboard.series.test.ts
git commit -m "feat(ui): redesign reports dashboard as signal lab"
```

---

### Task 8: Sharp Border System + Animation Consistency

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/common/data-display/DataTable.tsx`
- Test: `src/components/ui/button.theme.test.ts`
- Test: `tests/e2e/theme-routes.ts`
- Test: `tests/e2e/ui-theme-consistency.spec.ts`

**Step 1: Write failing assertions for sharp border invariants**

Add/extend test assertions in `src/components/ui/button.theme.test.ts`:

```ts
expect(cssText).toContain('border-[#ffc038]');
expect(cssText).toContain('focus-visible:ring-[2px]');
```

**Step 2: Run tests to verify failure**

Run:
```bash
npx vitest run src/components/ui/button.theme.test.ts
```
Expected: FAIL if class/token absent

**Step 3: Implement minimal sharp-border utilities**

In `src/app/globals.css`:

```css
.storm-sharp-border {
  border: 1px solid #ffc038;
  border-radius: 0.5rem;
}
.storm-sharp-focus {
  box-shadow: 0 0 0 2px #ffc038;
}
```

Apply to key filter/control/table wrappers in `DataTable`.
Update `tests/e2e/theme-routes.ts` so these admin operation routes require contrast controls.

**Step 4: Run tests**

Run:
```bash
npx vitest run src/components/ui/button.theme.test.ts
npx playwright test tests/e2e/ui-theme-consistency.spec.ts --project=chromium --grep @admin-theme
```
Expected: unit PASS; e2e PASS (or SKIP if credentials are missing)

**Step 5: Commit**

```bash
git add src/app/globals.css src/components/common/data-display/DataTable.tsx src/components/ui/button.theme.test.ts tests/e2e/theme-routes.ts tests/e2e/ui-theme-consistency.spec.ts
git commit -m "feat(ui): enforce sharp gold border system across admin operations surfaces"
```

---

### Task 9: Documentation + Final QA Gate

**Files:**
- Modify: `grid-electric-docs/04-DESIGN-SYSTEM.md`
- Modify: `grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md`

**Step 1: Write failing checklist gate in docs**

Add checklist item placeholders:
- “Each admin ops page has unique layout signature class”
- “Filter controls use solid gold borders”

**Step 2: Run docs lint/format checks (if configured)**

Run:
```bash
npx eslint "src/**/*.tsx"
```
Expected: PASS or only known non-blocking warnings

**Step 3: Write final documentation updates**

Add sections:
- `Admin Operations Visual Families`
- `Sharp Border & Focus Tokens`
- `Animation constraints (150-300ms + prefers-reduced-motion)`

**Step 4: Final regression sweep**

Run:
```bash
npx vitest run
npx eslint src/app/(admin)/time-review/page.tsx src/app/(admin)/expense-review/page.tsx src/app/(admin)/assessment-review/page.tsx src/app/(admin)/invoice-generation/page.tsx src/app/(admin)/reports/page.tsx
```
Expected: PASS (or document known unrelated baseline failures)

**Step 5: Commit**

```bash
git add grid-electric-docs/04-DESIGN-SYSTEM.md grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md
git commit -m "docs: record unique admin operations UI system and QA gates"
```

---

## Implementation Guardrails

- Keep `RLS`, data services, and mutation logic unchanged unless explicitly required.
- Preserve minimum touch target `44x44`.
- Maintain contrast `>= 4.5:1` and keyboard focus visibility.
- Use `motion-reduce` fallbacks for all non-essential animations.
- Avoid introducing one-off style literals when a shared token/class can be reused.

## Suggested Commit Order

1. Variant registry
2. Reusable shell
3. Time review
4. Expense review
5. Assessment review
6. Invoice generation
7. Reports
8. Sharp border + e2e
9. Docs + QA

