# Central Command — Project Brief

**Updated:** 2026-10-09
**Audience:** AI coding agents and developers  
**Owner direction:** David McCarty, Storm Manager  
**Status:** Current product direction; implementation remains in Phase 4 refinement and acceptance.

## Purpose of this handoff

This brief explains the project and its general build direction to agents. The companion scope and master plan provide the requirements, relationships, dependencies, and acceptance criteria needed for an audit and subsequent task decomposition. The owner's request for this handoff is to write and update the documentation. Saving a plan is not a claim that its proposed application behavior has been implemented or verified.

The original [scratchpad](scratchpad.md) is dictated source material. Its repetitions, tentative alternatives, and instructions embedded in the prose must be interpreted against the owner's current request and clarifications. Use the normalized requirements here and in the scope; do not execute an isolated sentence from the scratchpad as an independent task. For example, tickets are assigned to crews even where the dictation calls the assignment target a contractor.

## What this project is

Central Command is GRID's existing web application for running utility storm-response work. It connects the company, storm management, contractor teams, two-person crews, utility-issued tickets, field assessments, official time, payroll, expenses, and financial reporting. Field contractors use a mobile-friendly portal with offline support; management uses a set of operational dashboards.

The project already contains substantial working application code. The job is to finish and align that application with the operating model below, preserving the pages, layout, and capabilities the owner already likes. This is not a request to restart the application, implement an old scaffold from scratch, or remove features that are absent from this brief.

Each operational page is a dashboard for its subject: Storms, Contractors, Tickets, Time, Payroll, Expenses, and the primary Dashboard. Map, Reports, People & Access, Account, fieldwork, and existing supporting pages remain part of the product. Calling these pages dashboards does not require merging or relocating them.

## Who runs the operation

The **CEO runs the company**. Each storm has **one responsible Storm Manager**, who runs that storm. Storm Manager replaces the Super Admin business role and has the existing full management access beneath the CEO, including the operational and financial dashboards. Do not invent a reduced-access manager persona or restrict management access to the assigned storm merely because each storm has an owner.

Application permissions and contractor pay roles are different concepts. A pay-role selection must not grant administrative access. The initial planning baseline used `SUPER_ADMIN` for management authority. Source reviewed on 2026-10-09 includes native `STORM_MANAGER` role guards and responsible-manager service inputs; that source alone does not establish live database activation or authenticated acceptance. Consult the dated implementation evidence and verify authentication, server checks, database policies, navigation, and labels together. A label change alone is insufficient.

Contractors perform the fieldwork. A **crew** contains one Driver and one Damage Assessor or Senior Damage Assessor. A **team** contains a Team Lead, that Team Lead's Driver, and its working crews. The leadership pair is distinct from the Driver/Assessor pairs below it. A contractor identity, a crew, a team, and an authenticated reviewer are not interchangeable records.

## How a storm operates

A storm is the operational project that everything else relates to. Management chooses the utility, identifies the storm, assigns its Storm Manager, and establishes contractor role wages and utility role billing rates. The utility determines the supported ticket format, forms, required fields, and validation rules. A new or unsupported utility requires deliberate configuration; the application must not substitute another utility's forms.

Management adds contractors and associates them with the storm. The form shows the wage inherited from the storm's role rate. A blank optional override keeps that wage; a supplied override changes that contractor's wage for that storm. A Driver's vehicle allowance is configured during this process and stays separate from wages. Contractor account setup remains self-service through the existing email verification, password setup, and onboarding flow after management has added the record.

Management organizes the storm roster into teams and crews. The Contractors dashboard shows those relationships, current activity, assigned work remaining, completed work, and availability. It retains the existing useful information and actions, including alerts, search, filters, exports, and contractor details.

Utilities supply tickets through documents such as emailed PDFs or scanned paper copies. Management can create tickets manually or review OCR-assisted extracted candidates before creation. One document may contain several tickets. A ticket may remain unassigned; when dispatched, it is assigned to an eligible **crew** on the same storm. The two crew members retain their individual identities and responsibilities for access, actions, and evidence.

The crew works through the existing ticket and assessment workflow: assigned work, travel/start, on-site work, forms, photos, notes, safety concerns, submission, review, corrections, and utility handoff. Keep the existing work screens, field tools, review stages, and linked evidence. Correct relationships in place instead of substituting a different workflow.

## Official time and money

The normal operating model is **16 hours per day, every day, from mobilization until release**. The work does not require a predetermined ending date, weekly payroll period, or daily attendance reconfirmation. Management establishes participation and handles the uncommon exceptions, such as a late arrival, shorter day, extra work, absence, or early release.

**The CEO or Storm Manager sets official time.** That time is authoritative for payroll and hourly utility billing. A contractor's personal clock remains available to track their own hours and estimated earnings, and to provide evidence when disputing official time. It does not directly set payable or billable hours. An approved management correction changes the affected official record with an explanation and history.

Being in the global contractor directory is not the same as being mobilized on a storm. Personal clock use, ticket assignment, or the absence of an assigned ticket must not determine whether management-authorized storm work is payable. The model must support the Storm Manager, Team Leads, their Drivers, and crews on standby.

Rates are established in storm setup and displayed as saved values on ordinary dashboards. Controlled edits belong in storm setup/detail, with an explicit effective boundary. Recorded official work keeps its calculation inputs; a correction to past work is a separate audited action. Do not silently apply an additional multiplier, overtime rule, deduction, or weekly cycle because the standard day is 16 hours. Preserve existing compensation capabilities while making the effective configured terms explicit.

Payroll shows individual wages and team/crew/role rollups for the storm, normally from mobilization through recorded work to date. Date filters remain useful analysis tools; they do not impose a pay period. Driver allowance and reimbursements are separate amounts and must not be counted twice.

Expenses include both company spending and contractor reimbursements: fuel, meals, lodging, rental vehicles, equipment rental, towing, repairs, fleet costs, personal spending where applicable, and miscellaneous costs, alongside existing categories. Track the storm, amount, category, payer/payment method, receipt, and relevant associations. Personal spending is not automatically reimbursable or billable to the utility. Receipt amounts remain entered amounts; only hour-based charges depend on official hours.

The primary Dashboard brings these records together: ticket flow, workforce activity, estimated payroll/payout, expenses, utility billable amounts, and margin, with useful graphs and links to the underlying dashboards. Every figure must reconcile with its detail view for the same storm and date/status basis. Estimated billing is not collected revenue; an estimated payout is not a recorded payment.

## Dashboard responsibilities

| Dashboard | Purpose and ownership |
|---|---|
| Primary Dashboard | Selected-storm operational summary, financial comparison, graphs, alerts, and navigation into the existing dashboards |
| Storms | Storm identity, utility/template configuration, responsible manager, lifecycle, rates, roster, and controlled configuration edits |
| Contractors | Add/manage people; show storm membership, onboarding state, team/crew relationships, workload, availability, and individual compensation exceptions |
| Tickets | Manual/document intake, OCR review, crew dispatch, work queues, field progress, assessment review, and operational statistics |
| Time | Management's official storm time, individual exceptions, supporting personal records, dispute review, and relevant allowance evidence |
| Payroll | Official-hours-based wages, allowances, reimbursements, rollups, utility labor billing, margins, and exports |
| Expenses | Company spending and contractor reimbursements, receipts, review, categories, billability, and spending analysis |
| Invoice preparation | Traceable labor/approved-expense billing inputs and exports; a full invoice-issuance product needs its own defined workflow |
| Existing supporting dashboards | Keep Map, Reports, People & Access, Account, contractor views, and other existing functions; update their shared inputs when affected |

The owner identified invoicing as a desired but unfinished area. The current invoice routes redirect. Preserve existing invoice structures and prepare reliable billing/export data. Do not invent the final invoice format, automatic email delivery, payment processing, or external billing integration as part of an unrelated task.

## Relationships agents must understand

- A storm owns operational participation and activity; company identities such as contractors and utilities can be reused across storms.
- A storm has one responsible Storm Manager and many participating contractors, teams, crews, tickets, official time records, and expenses.
- A ticket belongs to a storm and may be assigned to a crew. Crew members are the actors; they are not separate duplicate assignments.
- Team Lead, staff reviewer, application role, and pay role have separate meanings. Existing staff-review IDs must not be overwritten with contractor IDs.
- An official time correction affects payroll, hourly billing, allowance eligibility, dashboard summaries, reports, and billing exports.
- A personal clock change affects personal history and dispute evidence, without changing official financial totals.
- An expense's payment or reimbursement is settlement of the same cost, not another cost.
- A crew or roster change affects access, availability, assignment, offline replay, and historical attribution.

## General build approach

Continue the current Phase 4 work in this dependency order. These are workstreams for subsequent task decomposition, not a new calendar or authorization to implement everything in one pass.

1. **Reconcile the current app.** Classify each requirement as KEEP, MODIFY, ADD, VERIFY, or DEFER. Inspect canonical source, schema, actual entry points, and evidence before rebuilding anything.
2. **Establish management authority and shared storm context.** Align Storm Manager access and make the same selected storm flow through every affected dashboard, service, cache, and export.
3. **Complete contractor participation and staffing.** Connect storm defaults, optional wage overrides, mobilization/release, teams, and crews with the existing contractor/account flow.
4. **Complete crew dispatch and preserve fieldwork.** Use one crew-assignment model across Tickets and Contractors; retain assessment, evidence, review, and offline capabilities.
5. **Introduce official time.** Separate management-authorized 16-hour days and exceptions from personal time, with server-authoritative calculations and revision history.
6. **Align Payroll and Expenses.** Connect official time and storm-owned costs to the existing financial dashboards, with clear classifications and no duplicate amounts.
7. **Reconcile summaries, graphs, reports, and exports.** Use shared definitions and prove that the same source records agree across screens.
8. **Complete batch document intake.** Extend the existing OCR/template foundations; require human review and prevent duplicate creation.
9. **Verify the connected workflow and prepare launch.** Test the same linked records across management/contractor roles and required devices, then prepare the separate test-data reset.

## Preservation and acceptance rules

The existing records are test data. They are intended to be cleared at launch through an explicit reset runbook. Do not spend implementation effort preserving artificial test business history as though it were production history. Do preserve the application's ability to maintain correct history once real operations begin.

Test-data cleanup is separate from application development and is not authorization to drop the schema, remove features, delete accounts now, or change records during a documentation task. The launch runbook must identify what is reset and how the real CEO/Storm Manager configuration is bootstrapped.

Keep the existing blue/navy and gold/lightning visual system, shared components, useful page organization, private evidence, access isolation, and offline work. Retain the currently implemented click-driven ticket status actions and the GPS/photo requirements that apply to other captures; do not restore an older GPS-gated status workflow merely because a historical document describes one.

Completion requires connected evidence: the same storm, crew, ticket, official hours, payroll amounts, expenses, and reporting totals must persist and reconcile through the affected screens. Unit tests, a successful build, schema metadata, authenticated browser checks, and actual device/offline checks are different kinds of evidence. Record which were performed.

## How agents should use the documentation

Read the current sections of [implementation_plan.md](implementation_plan.md) and the [progress checklist](grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md), then this brief and the [project scope / PRD](grid-electric-docs/01-TECHNICAL-PRD.md). Use the [detailed workflow master plan](docs/plans/2026-10-08-central-command-workflow-master-plan.md) for requirement IDs, current-state findings, dependencies, and acceptance scenarios.

The owner's current instructions take precedence. This brief and the updated scope express product intent; the implementation plan gives build order; the detailed plan supplies the audit/decomposition reference. Current code and database inspection establish what exists, not what the owner necessarily wants. Historical plans and the original [scratchpad](scratchpad.md) provide context and do not revive superseded instructions. Implementation observations are dated snapshots: refresh them before planning a change so that completed or partially completed work is retained rather than duplicated.

The next planning output should be a set of bounded tasks derived from the [master plan's decomposition contract](docs/plans/2026-10-08-central-command-workflow-master-plan.md#decomposition-contract). Each task must state what exists, what changes, what remains available, which related records and dashboards are affected, what it depends on, and what evidence closes it. Use VERIFY for behavior whose source exists but whose connected acceptance is still unproven.

**Preservation rule:** An omitted feature is not a removal request. A wording correction is not permission to replace a workflow. Keep behavior that fits, document specific gaps, and decompose only the necessary changes. Before implementation, each task must identify its affected records, interfaces, permissions, dashboards, offline behavior, and acceptance evidence. Do not mark a requirement implemented merely because it has been documented here.
