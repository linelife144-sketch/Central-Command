# Central Command — Documentation Index

**Updated:** 2026-10-08  
**Purpose:** Help agents understand and finish the existing application without duplicating or removing its capabilities.

## Current project guidance

| Document | Responsibility |
|---|---|
| [Project brief](../PROJECT_BRIEF.md) | Business purpose, CEO/Storm Manager operating model, workflow narrative, relationships, and preservation rules |
| [Project scope / PRD](01-TECHNICAL-PRD.md) | Current scope and requirements, with historical examples explicitly labeled |
| [Implementation plan](../implementation_plan.md) | Current Phase 4 dependency order and preserved implementation history |
| [Detailed workflow master plan](../docs/plans/2026-10-08-central-command-workflow-master-plan.md) | Auditable CC requirements, current-state findings, impact map, interface contracts, and connected acceptance scenarios |
| [Implementation checklist](10-IMPLEMENTATION-CHECKLIST.md) | Dated progress and outstanding work/evidence |
| [Agent guide](../AGENTS.md) | Mandatory pre-work, code conventions, verification, and tool instructions |

The current owner instructions govern. The brief and updated scope define intended behavior; current source/schema/runtime evidence identifies what exists. Historical documents and original dictation are context, not instructions to restore obsolete behavior, remove unmentioned features, or replay completed migrations.

## Operating model at a glance

The CEO runs the company; one responsible Storm Manager runs each storm with full management access beneath the CEO. A storm ties together utility configuration, participation, team/crew structure, tickets, official time, expenses, and financial reporting. Tickets belong to Driver/Assessor crews. Teams also have their Team Lead and lead Driver.

Normal work continues 16 hours per day from mobilization until release, with management-controlled exceptions and no required payroll period. Official management time drives wages and hourly billing; personal clocks remain references. Storm rates and per-contractor exceptions are saved setup values. All existing operational pages remain dashboards in their current organization.

The existing data is test data intended for a separately controlled launch reset. Future live history must be correct, but preserving artificial test transactions is not the product objective. This documentation update does not perform the reset or implement the new official-time model.

## Technical references

| Document | How to use it |
|---|---|
| [Database schema](02-DATABASE-SCHEMA.md) | Historical/schema design reference; compare with current migrations and actual schema before changes |
| [Wireframes](03-WIREFRAMES.md) | Original screen concepts; preserve the actual current UI rather than rebuilding old wireframes |
| [Design system](04-DESIGN-SYSTEM.md) | Design context; current shared components and `src/app/globals.css` establish the implemented blue/navy/gold system |
| [API specifications](05-API-SPECIFICATIONS.md) | Interface reference; verify actual routes/RPCs and ownership checks |
| [Component architecture](06-COMPONENT-ARCHITECTURE.md) | Architecture context; current code is under `src/` |
| [Offline PWA strategy](07-OFFLINE-PWA-STRATEGY.md) | Offline design context; preserve actual actor/storm queues and avoid caching authenticated/financial responses in shared caches |
| [Project roadmap](08-PROJECT-ROADMAP.md) | Current Phase 4 guidance followed by the original historical timeline |
| [Data-flow analysis](09-DATA-FLOW-ANALYSIS.md) | Existing workflow/evidence relationships; reconcile old time/status/assignment assumptions with current scope |
| [Implementation checklist](10-IMPLEMENTATION-CHECKLIST.md) | Historical checks plus dated execution records and current follow-up |

The initial documentation contains old framework versions, screen counts, status/GPS behavior, time/billing assumptions, invoice concepts, and policy examples. Their presence is not evidence that those features are active or that those values are approved. Preserve useful existing capabilities while resolving specific inconsistencies against the current brief, source, and owner direction.

## General build sequence

Within the current Phase 4: baseline/audit and decomposition → management authority and shared storm context → contractor participation/teams/crews → crew dispatch and preserved fieldwork → official time → Payroll/Expenses → reconciled dashboards/reports/exports → reviewed batch intake → connected acceptance and launch preparation.

The master plan records dependencies for work that can be decomposed independently. Full invoice issuance remains a separately defined workstream; reliable billing/export inputs are included now. No historical week number establishes a current delivery date.

## Verification and progress

Classify requirements as KEEP, MODIFY, ADD, VERIFY, or DEFER. A completed checklist entry must state the agent and actual evidence. Local tests, schema readback, signed-in browser workflows, real uploads, device behavior, offline recovery, and print acceptance are distinct. A documentation change or historical passing report does not prove the revised workflow is complete.

Use the original [scratchpad](../scratchpad.md) only for provenance. Update current authoritative guidance when the owner changes the operating model; do not add another conflicting source of truth.
