# Central Command — Workflow and Dashboard Master Implementation Plan

**Date:** 2026-10-08  
**Prepared by:** Codex /root  
**Goal:** Refine the existing application into a consistent storm-centered operating system while preserving its pages, capabilities, and established layout.  
**Architecture:** Each storm owns its operational participation, activity, and financial configuration. Shared services provide consistent records to every dashboard. Management-controlled official time determines payroll and hourly billing; contractors retain separate personal time records.  
**Tech Stack:** Existing Next.js, React, TypeScript, Supabase, TanStack Query, Zustand, and Dexie architecture.  
**Stage:** Master specification for audit and task decomposition; these requirements are not a claim of completed implementation.

> For coding agents: Read the [project brief](../../PROJECT_BRIEF.md), [current implementation plan](../../implementation_plan.md), and [project scope](../../grid-electric-docs/01-TECHNICAL-PRD.md) first. Audit this plan against the current app, then decompose it into bounded tasks with dependencies and acceptance evidence. Use the project's execution workflow for those tasks; do not treat this master document as an instruction to rebuild the app in one pass.

This saves the detailed plan developed from the owner's scratchpad and subsequent clarifications. The planning pass inspected source, project records, Graphify relationships, and read-only Supabase metadata for Central Command (`xcvacmreerrypygpritq`). It did not run authenticated application acceptance or change business records. Facts below describe that inspection baseline and must be refreshed where they can drift.

## 1. Controlling decisions and preservation requirements

### Confirmed operating model

| Subject | Requirement |
|---|---|
| Company leadership | The CEO runs the company and retains the highest authority. |
| Storm leadership | Each storm has one responsible Storm Manager. Storm Manager replaces the Super Admin business role and receives its full application access beneath the CEO. |
| Management access | Do not invent a reduced operations-only manager role. Selected storm is dashboard context, not an additional management access restriction. |
| Storm duration | Work continues from mobilization until release; a predetermined ending date or payroll period is not required. |
| Standard day | 16 hours per day, every day, until release, with management-controlled exceptions. |
| Official time | CEO/Storm Manager-controlled time is authoritative for payroll and hourly utility billing. |
| Personal time | Contractor clocks support personal tracking and disputes; they cannot directly change official payable or billable hours. |
| Assignment unit | Tickets are assigned to crews. Individual identities still identify crew members and permitted actions. |
| Crew | One Driver and one Damage Assessor or Senior Damage Assessor. |
| Team | Team Lead, Team Lead's Driver, and working crews. |
| Compensation | Storm setup establishes role wages and utility billing rates; a contractor's optional override replaces that role wage for that contractor on that storm. |
| Saved rate changes | Controlled editing in storm setup/detail, saved-value display elsewhere, and no silent repricing of recorded official work. |
| Current records | Existing operational records are test data; a separate controlled reset belongs in launch preparation. |

The owner explicitly selected controlled rate edits during planning. The later clarification establishes continuous 16-hour operation and Storm Manager's full management authority. Older period-based or restricted-manager assumptions do not override these decisions.

### Preserve the application

1. Keep existing dashboards, routes, navigation, useful controls, forms, exports, and workflows unless a specific approved requirement changes their behavior.
2. Calling operational pages dashboards does not require merging pages or reorganizing navigation.
3. A feature omitted from the scratchpad remains part of the application.
4. Repeated wording is an editorial issue, not proof that a feature should be deleted.
5. Extend the existing implementation; a partial subsystem is not permission to replace it wholesale.
6. Preserve alerts, maps, notes, assessments, photos, review, account setup, offline work, and reporting while integrating relationships.
7. Historical removal/replacement instructions are context, not fresh authorization. Reconcile them with the current preservation requirement.
8. Keep test-data reset separate from development; do not delete functionality, schema, migrations, or utility definitions under that label.

Use these dispositions in audits and tasks:

| Disposition | Meaning |
|---|---|
| KEEP | Existing behavior meets the requirement; verify and retain it. |
| MODIFY | Existing behavior needs a specific adjustment. |
| ADD | A required capability is absent. |
| VERIFY | Source/schema exists but connected behavior lacks sufficient evidence. |
| DEFER | A future extension is outside executable tasks until its product definition is complete. |

Technical mechanisms below are planning defaults, not additional owner requirements: a shared storm context, separate official-time records, stable membership history, and compatibility for legacy role tokens. Validate the smallest implementation that satisfies each contract. Do not invent rates, contracts, invoice terms, production identities, or utility form content.

## 2. Current implementation baseline

| Area | Observed foundation | Disposition |
|---|---|---|
| Primary dashboard | Storm banner, metrics, recent tickets, quick actions, payroll summary, expense summary, and access section exist. Some counts are global rather than scoped to the displayed storm. | KEEP + MODIFY |
| Storm setup | Creation saves five role wages and five role bill rates. Storm-specific contractor wage overrides and Driver allowances exist. | KEEP + MODIFY |
| Rate editing | Payroll mounts an editable storm compensation component. | MODIFY: keep saved-rate reference there and place controlled editing in storm setup/detail. |
| Management roles | Live `user_role` includes CEO, SUPER_ADMIN, ADMIN, CONTRACTOR; STORM_MANAGER exists in the separate contractor/pay enum. | MODIFY: business title alone does not grant application authority. |
| Contractor addition | Pending records and self-service account setup exist; the add form still requests a separate compensation agreement. | KEEP + MODIFY |
| Operational staffing | `field_crews` has storm, Driver, Assessor, and staff-review lead references. Team validation/display helpers exist; a complete persistent operational-team model was not found. | KEEP + ADD |
| Contractors dashboard | Names, roles, status, assigned-ticket counts, alerts, search, filters, and export exist; full operational team/crew/availability presentation is absent. | MODIFY |
| Ticket dispatch | Crew RPC/service methods exist; an individual-contractor assignment component also remains in source. Actual mounted entry points need connected verification. | MODIFY + VERIFY |
| Utility intake | Registered templates and an Entergy extractor exist. Other utility OCR extractors are placeholders; extraction result currently represents one ticket. | KEEP + ADD |
| Time | Contractor clocks currently feed payroll; Time Review approves/rejects their entries. No separate management-owned official-time ledger was found. | ADD + MODIFY |
| Payroll | Individual totals, utility billing, margins, exports, snapshots, and vehicle review exist; the page defaults to a date range and supports All Storms. | KEEP + MODIFY |
| Expenses | Receipt capture, categories, submissions, and review exist. Live `expense_reports.storm_event_id` exists but is nullable and is not consistently carried through service inputs/reads. `contractor_id` is required. | KEEP + MODIFY |
| Invoices | Existing admin/contractor invoice routes redirect; contractor-invoice tables do not establish a working utility invoice dashboard. | VERIFY + DEFER |
| Supporting features | Offline drafts, private evidence, review/rework, maps, reports, and reversible disable/restore have implementations. Several historical acceptance items remain open. | KEEP + VERIFY |

### Implementation anchors

Paths are relative to the repository root. Inspect callers and database dependencies as well as these entry points.

| Concern | Primary files to inspect |
|---|---|
| Main dashboard and metrics | `src/app/(admin)/admin/dashboard/page.tsx`; `src/lib/services/dashboardReportingService.ts`; `src/components/features/dashboard/` |
| Management authority | `src/lib/auth/roleGuards.ts`; `src/lib/auth/permissionCatalog.ts`; `src/lib/auth/serverPermissions.ts`; existing database role/permission functions |
| Storm configuration | `src/app/(admin)/admin/storms/create/page.tsx`; `src/components/features/storms/StormWorkspace.tsx`; `src/lib/services/stormEventService.ts`; `src/lib/services/stormCompensationService.ts` |
| Contractor addition and roster | `src/app/(admin)/admin/contractors/page.tsx`; `src/app/(admin)/admin/contractors/add/page.tsx`; `src/lib/services/contractorAddService.ts`; `src/lib/services/stormRosterService.ts`; `src/lib/utils/contractorTeams.ts` |
| Tickets and fieldwork | `src/lib/services/ticketIntakeService.ts`; `src/lib/services/ticketAssessmentWorkflow.ts`; `src/components/features/tickets/TicketAssign.tsx`; `src/app/tickets/[id]/work/page.tsx` |
| OCR/templates | `src/app/api/tickets/ocr-extract/route.ts`; `src/lib/tickets/ocr/`; `src/lib/tickets/templates/` |
| Time and payroll | `src/app/(admin)/admin/time-review/page.tsx`; `src/lib/services/timeEntryService.ts`; `src/lib/services/timeEntryManagementService.ts`; `src/components/features/payroll/PayrollDashboard.tsx`; `src/lib/services/payrollService.ts` |
| Expenses | `src/app/(admin)/admin/expense-review/page.tsx`; `src/components/features/expenses/`; `src/lib/services/expenseSubmissionService.ts`; `src/lib/services/expenseProcessingService.ts` |
| Contractor readback and offline | `src/lib/services/contractorDashboardService.ts`; `src/lib/db/dexie.ts`; `public/sw.js` |
| Dormant invoice routes | `src/app/(admin)/admin/invoice-generation/page.tsx`; `src/app/(contractor)/contractor/invoices/page.tsx` |

The read-only migration ledger reported `20261008230422_role_keyed_utility_billing_rates`, `20261008234452_storm_compensation`, and `20261008234601_storm_compensation_fk_indexes`. Some local filenames use different timestamps. Reconcile identities and actual definitions before applying anything; a filename mismatch is not proof that a change is missing.

## 3. Normalized workflow specification

### CC-01 — Storm ownership and dashboard context

**Purpose:** Every dashboard describes the same storm when a storm is selected.

- Give the storm a stable ID, utility, name/code, responsible manager, lifecycle, operating dates, timezone, saved compensation, and utility-template configuration.
- Link roster participation, teams, crews, tickets, official time, expenses, financial summaries, and future billing through that ID.
- Keep company contractor/utility identities reusable; their operational participation and financial terms belong to the storm.
- Carry selected-storm context through navigation, services, queries, cache keys, record creation, reports, and exports.
- Preserve explicit company-wide views. Label them so they cannot be mistaken for one storm's figures.
- A new operational record needs an explicit storm or a verified parent-derived storm. Do not silently attach it to whichever storm sorts first.
- Do not show one storm in a banner while adjacent figures describe other storms.

**Affected:** Every operational dashboard, filter, creation flow, cache, offline record, export, and report.

### CC-02 — CEO, Storm Manager, and permissions

**Purpose:** Match application authority to the company structure.

- Introduce STORM_MANAGER application authority with the existing full Super Admin capability set beneath the CEO.
- Preserve SUPER_ADMIN internally as needed for a coordinated compatibility transition; new business-facing management assignments use Storm Manager.
- Store one responsible manager per storm; replacements are audited changes.
- Keep pay-role selection separate from grants of management access.
- Preserve People & Access and existing review capabilities; protect the CEO's higher authority.
- Update server checks, database functions/policies, route guards, navigation, labels, sessions, and errors together.
- Keep authenticated reviewer identity distinct from operational Team Lead and contractor identity.

**Affected:** Authentication, all management operations, account administration, review, private files, and audit records.

### CC-03 — Storm setup and compensation

**Purpose:** Establish the terms once and display the same saved values everywhere.

- Capture utility and supported template, storm identification, responsible manager, hourly wage/bill rate for each supported role, and the official-time operating configuration.
- Blank wage override means inherit this storm's role wage; a supplied override replaces it for that contractor on this storm.
- Show effective compensation before saving participation. Save override and Driver allowance against the correct membership.
- Keep Driver allowance separate from wages.
- Show read-only saved values on operational dashboards; expose controlled editing in storm setup/detail.
- Use an explicit effective boundary for revisions; preserve recorded official calculation inputs. Correcting past work is a separate audited operation.
- Preserve advanced compensation capabilities while making their effect visible in setup. Do not silently add multipliers, overtime, deductions, or weekly pay cycles because days are 16 hours.
- Preserve template versions and storm snapshots. A name edit does not change identity; a utility edit must not reinterpret existing tickets under different forms.
- Unsupported utility configuration requires explicit work rather than fallback to another utility's forms.

### CC-04 — Contractors, mobilization, teams, and crews

**Purpose:** Manage people as storm participants organized into working teams.

1. Add the contractor's existing required contact/identity details and role.
2. Associate them with the selected storm, display the inherited wage, and accept an optional override.
3. Configure Driver allowance where applicable and persist participation consistently.
4. Keep the existing self-service email verification, password setup, and onboarding path.

- Pending account setup may coexist with planned staffing; current eligibility/onboarding rules still control field access and dispatch.
- Mobilization/release, not global directory membership or personal clock activity, defines official work participation.
- Normal days continue while mobilized. Exceptions cover arrival, absence, shorter/longer days, and release without routine daily roster reconfirmation.
- A team contains its Team Lead, lead Driver, and working Driver/Assessor pairs. Use stable IDs; numbers/initials are display values.
- Reuse complete-pair, role-compatibility, and conflicting-position validation. Retain the documented one-to-ten crew capacity as the initial editor default pending a separately requested change.
- Preserve historical attribution when membership changes.
- Add team/crew/lead, current field activity, remaining work, completed work, and availability to Contractors while keeping alerts and existing tools.
- Assignment from a contractor row resolves to the contractor's crew, not an individual assignment.
- Do not infer availability from a personal clock alone; use actual crew work and explicit standby/unavailable information.

### CC-05 — Ticket intake, OCR, and dispatch

**Purpose:** Turn utility-issued documents into verified storm tickets and crew work.

- Retain manual creation; accept PDFs and scanned paper documents through the existing intake surface.
- Associate source documents/candidates with the storm and utility configuration.
- Extract multiple reviewable candidates when a document contains multiple tickets.
- Show original source beside candidate values; preserve identifiers including leading zeros.
- Flag uncertain/missing/conflicting fields and duplicates. Management confirms selected candidates before creation.
- Preserve document/page linkage and extraction provenance; retries must not duplicate tickets.
- Retain Entergy's implementation. Distinguish manual template support from working OCR support for other utilities.
- Placeholder extractors are unavailable extraction, not successful OCR. Do not invent full utility forms from generic fields.
- Allow tickets to remain unassigned. Optional assignment at creation selects an eligible crew on the same storm.
- Store crew assignment and derive member identities, team, and operational lead. Keep individual identities for permissions and authorship.
- Use the same assignment operation from Tickets and Contractors; reject incomplete, incompatible, stale, or wrong-storm crews.
- Preserve reassignment history and keep staff-review identity separate from the operational lead.

### CC-06 — Fieldwork, assessments, and review

**Purpose:** Preserve the field workflow while correcting assignment relationships.

Keep ticket lists/details/work pages, assigned-ticket navigation, Start/Continue, utility forms, required field assessments, section-linked photos, notes, safety/environmental escalation, drafts, reconnect, review/rework, handoff, and reports.

- Derive Driver/Assessor access from crew membership and permitted responsibilities; crew membership does not grant Assessor-only actions to a Driver.
- Preserve the currently implemented click-driven status actions. Retain applicable GPS/photo requirements for other captures rather than reviving superseded status behavior from old documents.
- Preserve review stages and audit history while mapping management authority to CEO/Storm Manager.
- Do not require the operational Team Lead to masquerade as an unrelated staff ADMIN identity. Keep any actual reviewer relationship separately explicit and validated.
- Recheck reassignment/release and actor authority during offline replay.
- Distinguish assigned/unstarted, underway, field-submitted, awaiting review, approved, rework, and utility-delivered work in statistics using the existing statuses/review stages.
- Simplifying dashboard labels does not authorize deleting statuses or workflow capabilities.

### CC-07 — Official Time dashboard

**Purpose:** Make management's storm time the authoritative hours source.

Add logical records for the storm/operational day, standard 16-hour allocation, mobilized participants, individual exceptions, recording/approval actor/time, revisions, and calculation references.

- Management establishes mobilization and the official time basis. Normal 16-hour days continue until release unless an exception applies.
- Support weekends and calendar boundaries without introducing a pay period.
- Official work does not require personal clock-in, a ticket assignment, or a completed assessment. Include Team Leads, Storm Manager, lead Drivers, and standby crews.
- Distinguish recorded work through the current operating date from projections; do not create indefinite future completed work.
- Stop normal allocation at release and allow management to review/confirm multiple days without repetitive daily roster confirmation.
- Exceptions identify the person, operational day, changed hours, reason, actor, and prior value. A dispute may cite personal time/evidence; only management changes official hours.
- Keep personal Start/Stop, history, captures, and offline behavior. Label personal estimates separately from the contractor's official hours/wages.
- Do not make a personal clock record an official record by relabeling or approving it. Synchronization must not duplicate official hours.
- Compute Driver allowance from management-approved eligible vehicle hours capped at official hours; preserve vehicle/plate evidence and review. Personal observations support that review without controlling official payable amounts.

### CC-08 — Payroll and financial calculations

**Purpose:** Explain what the storm owes and what its labor can bill.

- Default to the selected storm from mobilization through recorded work to date. Date filters remain analysis tools, not required payroll periods.
- Retain individual breakdowns and add team/crew/role rollups.
- Show inherited wage versus override, official hours, wages, allowance, approved reimbursement, and payout distinctly.
- Preserve review/export capabilities and keep personal time as supporting information outside official totals.
- Read authoritative server-calculated amounts; do not implement different formulas per dashboard.

| Measure | Source |
|---|---|
| Contractor wages | Official hours and applicable saved wage terms |
| Labor billable amount | Official billable hours and saved utility role rate |
| Vehicle allowance | Approved eligible vehicle hours and saved allowance rate |
| Contractor payout | Wages plus approved allowance and reimbursements, counted once |
| Recorded storm cost | Labor, applicable allowances, and recorded operating expenses without duplicate costs |
| Estimated operating margin | Billable revenue estimate minus the included storm costs |

Separate estimates, approved amounts, invoices, and payments. A calculation alone is not paid/collected money. Historical correctness is required for the future live system; preserving every current artificial test transaction is not.

### CC-09 — Expenses

**Purpose:** Track company spending and contractor reimbursements on the storm.

Preserve receipt capture/OCR assistance, policy flags, review, and reimbursement. Extend the model to include payer/payment source, vendor, storm, category, date, amount, receipt, optional contractor/crew/vehicle/ticket association, and approved utility billability.

Category coverage includes fuel, meals, lodging, vehicle rental, equipment rental, towing, repairs/mechanical, fleet, personal spending where applicable, miscellaneous/Other, and existing mileage, tolls, parking, and materials. Reuse existing values and add missing ones without deleting categories.

- Complete the existing expense storm link through writes, reads, filters, caches, and reports.
- Company spending must not require a fictitious contractor.
- Receipt amounts remain entered amounts; only hour-based charges use official time.
- Reimbursement settles the same expense; company-card repayment is not another copy of purchases already recorded.
- Personal spending is not automatically reimbursable or client-billable.
- Only approved billable expenses feed billing preparation. Internal costs can reduce margin without increasing revenue.
- Add category/payment/date summaries and charts while retaining the review list.

### CC-10 — Primary Dashboard, Reports, and supporting pages

**Purpose:** Summarize the specialized dashboards reliably.

Preserve the current composition and refine selected storm/lifecycle, ticket flow, distinct contractors/teams/crews, workload/availability, wages/payout, operating expenses, utility billing, and estimated margin.

- Count crews by crew identity, not distinct assignees.
- Initial graphs show daily/cumulative billing versus costs, expense categories, and crew workload/completion.
- Every figure has a storm, date range, and status basis. Drill-down totals reconcile under the same filters.
- Keep Map, Reports, People & Access, Account, contractor dashboards, and existing exports. Update shared inputs rather than removing these surfaces because they were not described in the scratchpad.

### CC-11 — Invoice preparation and future invoicing

**Purpose:** Make future invoices traceable to correct operational records.

The owner identified invoice design as unfinished and the current routes are inactive. Preserve existing invoice structures/routes and expose reliable billing/export data from official labor and approved billable expenses, including source IDs, storm, utility, role, hours/quantity, rates, amounts, and references.

Utility billing and contractor invoices are different records. Not every expense is billable, and a PDF export does not mean an invoice was issued, emailed, paid, or accepted. Do not send email automatically.

Decompose source-data/export readiness now. Keep full invoice-dashboard design, final PDF layout, numbering, issuance/correction lifecycle, custom invoice composition, automatic delivery, and external billing integration in a separate deferred workstream until defined. Deferral is not permission to remove existing functionality.

## 4. Shared interfaces, dependencies, and build order

### Logical interface contracts

These contracts guide decomposition; inspect the actual schema before deciding migrations.

| Contract | Required change |
|---|---|
| Storm context | Selected storm and explicit company-wide mode carried into relevant services, navigation, caches, and exports |
| Management authority | Storm Manager full access, coordinated Super Admin compatibility, one responsible manager per storm |
| Participation | Mobilization/release, pay role, override, and Driver allowance independent of personal clocks |
| Team/crew | Operational teams, member positions, crews, and stable historical attribution |
| Assignment | Crew-based input/output with derived members and separate reviewer identity |
| Official time | Days, individual allocations/exceptions, revisions, and monetary snapshots |
| Personal time | Clearly identified reference records excluded from authoritative financial queries |
| Expenses | Storm-aware writes/reads, company versus contractor payer/ownership, receipt and review linkage |
| OCR | Candidate batch, source-page references, validation/confidence, confirmation, retry identity |
| Reporting | Shared operational/financial summaries with explicit scope and calculation basis |
| Billing preparation | Traceable source lines without implying invoice issuance or payment |

Reuse existing services/tables when their meaning fits, especially the expense storm link and compensation tables. Keep the official-time source distinguishable from observations so they cannot be accidentally summed together. Preserve actor/storm boundaries in offline stores and reconnect handling.

### Change-impact map

| Change | Recheck |
|---|---|
| Management role | Routes, server/DB authorization, private files, users, reviews, audits |
| Selected storm | All dashboards, creation defaults, queries/cache keys, exports, company-wide totals |
| Mobilization/release | Official time, payroll, allowance, staffing counts, dispatch eligibility |
| Pay role/override | Crew eligibility, wages, bill-rate lookup, future official records, projections |
| Team/crew membership | Ticket access, queues, offline actions, availability, performance, historical attribution |
| Official-time correction | Payroll, allowances, dashboard, reports, contractor readback, billing export |
| Personal clock | Personal views and dispute evidence; official money remains unchanged |
| Ticket status | Workload, availability, progress counts, review queues, maps, reports |
| Expense approval/billability | Reimbursements, costs, margin, charts, billing preparation |
| Utility/template version | Intake, OCR, forms, validation, evidence, printed reports |

### Dependency order within current Phase 4

1. Reconcile requirements with canonical routes, actual behavior, permissions, schema, migrations, and evidence.
2. Establish management authority and shared storm context.
3. Complete contractor addition/participation, compensation, mobilization/release, teams, and crews.
4. Complete crew dispatch and preserve connected fieldwork/review.
5. Introduce official time, exceptions, personal-reference separation, and authoritative calculations.
6. Integrate Payroll and Expenses with those sources.
7. Reconcile main/contractor dashboards, reports, graphs, and exports.
8. Complete reviewed batch OCR intake using the established storm/template/crew boundaries.
9. Run connected acceptance and prepare the separate launch reset.

OCR and company-expense tasks may proceed independently once shared contracts are fixed. Official-time design must precede authoritative financial-summary implementation. Retain existing completed-phase history; this order is not a fresh foundation build or a dated release promise.

## 5. Acceptance, launch, and agent handoff

### Connected scenarios

| ID | Scenario and expected result |
|---|---|
| AC-01 | Two storms with different utilities/rates stay separate; context changes every relevant dashboard consistently. |
| AC-02 | CEO/Storm Manager perform management actions; choosing a contractor pay role cannot grant that access. |
| AC-03 | Blank wage override inherits the storm default; an override affects only that contractor/storm. |
| AC-04 | Planned staffing survives account setup; verification/onboarding activates the same identity without duplication. |
| AC-05 | Team, leadership pair, and working crews have identical membership readback across management and contractor views. |
| AC-06 | Create an unassigned ticket and assign its crew; both members see it, while Assessor-only actions remain restricted. |
| AC-07 | Review a multi-ticket PDF, correct one candidate, skip another, and retry without duplicate tickets. |
| AC-08 | A mobilized contractor receives 16 official hours without personal clock use or an assigned ticket. |
| AC-09 | Personal 14 hours and official 16 hours coexist; financial totals use 16. |
| AC-10 | Approve a 12-hour exception; only the intended official allocation changes, with reason/history. |
| AC-11 | Midnight, weekends, calendar boundaries, and daylight-saving changes do not silently change the standard 16-hour allocation. |
| AC-12 | An individual release stops their allocation while other mobilized contractors continue. |
| AC-13 | Effective rate edits affect subsequent official work without repricing recorded work. |
| AC-14 | Company lodging and a reimbursable purchase affect the correct storm; reimbursement settlement does not duplicate cost. |
| AC-15 | Approved Driver allowance uses eligible official hours, preserves evidence, stays separate from wages, and counts once. |
| AC-16 | Main Dashboard, Payroll, Expenses, Reports, contractor official readback, and billing export reconcile to the same records. |
| AC-17 | Reassignment while an old member has offline work causes a visible stale-authority conflict without losing the draft or applying unauthorized changes. |
| AC-18 | Forms, photos, notes, review/rework, maps, disable/restore, and print/export remain usable. |
| AC-19 | Missing data/failed reads display unavailable or pending state, not invented zeroes or apparent save success. |

Calculation fixture, using explicit flat terms rather than proposed production rates: 16 official hours at $25/hour wage and $75/hour utility labor rate gives $400 wages and $1,200 labor billing. A personal clock of 14 hours changes neither. An approved 12-hour exception gives $300 and $900 for the affected allocation. Test allowances and expenses separately to prove they are not double counted.

### Evidence and validation

Record source implementation, focused tests, database constraints/permissions, applied migration/readback, authenticated browser behavior, same-record dashboard reconciliation, and real device/private-upload/offline/print acceptance separately.

Use the existing appropriate test commands during implementation: focused Vitest suites followed by `npm test`, `npm run typecheck`, scoped `npm run lint -- <paths>`, applicable isolated database harnesses, and the supported production build. Do not run destructive live rollback fixtures under a documentation or read-only audit task. Check current package scripts before execution; build scripts can have side effects.

Historical passing reports are not fresh proof. Distinguish active-source failures from copied archival files and tooling. Do not delete files or broadly weaken validation to manufacture a passing result. Graphify must be refreshed after subsequent code edits per the project guide.

### Launch reset

After functional acceptance, prepare an explicit runbook to inventory test rows/accounts/files/caches, identify real bootstrap identities/reference configuration, produce a reviewable manifest and recovery snapshot, and perform the approved reset at the launch boundary. Preserve code, schema, migrations, utility definitions, and needed reference configuration. Clear stale offline test queues so they cannot recreate test data. Create the real management/storm configuration using supplied values and verify clean totals/access.

Configuring every existing test storm with production terms is not a prerequisite. This plan does not execute or independently authorize the reset.

### Decomposition contract

Each task must include requirement IDs; KEEP/MODIFY/ADD/VERIFY disposition; current evidence; exact implementation anchors; before/after behavior; capabilities to preserve; affected records/interfaces/permissions/dashboards/offline paths; dependencies; and focused acceptance/evidence requirements.

Do not mark a requirement implemented because its documentation is complete. Append dated progress with the agent identifier to the existing implementation plan and checklist. Do not infer removal authority from silence, terminology cleanup, or an old document. Deferred invoice-product decisions remain outside executable tasks until their own scope is defined.
