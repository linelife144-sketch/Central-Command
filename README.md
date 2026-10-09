# Central Command — Storm Operations

Central Command is GRID's existing application for managing utility storm-response work: contractor teams and crews, tickets, field assessments, official time, payroll, expenses, and operational/financial reporting. The task is to finish and align the existing application while preserving its pages and capabilities.

## Start here

Agents must read the current [implementation plan](implementation_plan.md) and [progress checklist](grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md), then the project brief and scope before changing the app.

| Document | Use it for |
|---|---|
| [Project brief](PROJECT_BRIEF.md) | What the project is, how the operation works, relationships, preservation rules, and general build approach |
| [Project scope / PRD](grid-electric-docs/01-TECHNICAL-PRD.md) | Current scope and operating requirements; labeled historical technical references |
| [Implementation plan](implementation_plan.md) | Current Phase 4 build order, dependencies, documentation progress, and preserved implementation history |
| [Detailed workflow master plan](docs/plans/2026-10-08-central-command-workflow-master-plan.md) | CC-01–CC-11 requirements, existing-app findings, impact map, and AC-01–AC-19 acceptance scenarios for later decomposition |
| [Progress checklist](grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md) | Dated completed work and outstanding verification; documentation completion is not feature completion |
| [Agent guide](AGENTS.md) | Project workflow, code conventions, tools, and change constraints |
| [Technical documentation index](grid-electric-docs/README.md) | Existing schema, API, component, design, offline, and workflow references |

## Operating model

- The CEO runs the company. Each storm has one responsible Storm Manager with full management access beneath the CEO, replacing the Super Admin business role.
- A storm owns operational participation and activity. Utility configuration determines the relevant ticket formats and forms.
- Tickets are assigned to crews: one Driver and one Assessor/Senior Assessor. A team contains a Team Lead, the lead's Driver, and working crews.
- Normal work is 16 hours per day, every day, from mobilization until release. Management records individual exceptions; no fixed pay period or daily roster reconfirmation is required.
- Management's official time controls payroll and hourly utility billing. Contractor clocks remain personal references and dispute evidence.
- Storm setup establishes role wages/bill rates; individual overrides and Driver allowance belong to the storm participation. Saved values appear on ordinary dashboards, with controlled editing in storm setup/detail.
- Keep existing dashboards, navigation, useful controls, forms, maps, reviews, evidence, account setup, reports, and offline work. Omission is not a removal request.
- Existing operational records are test data. A controlled reset is a separate launch task, not an instruction to delete records during ordinary development.

These are the target requirements. The current code still has gaps, particularly management-role mapping, full operational teams, and official time. See the master plan's baseline before claiming anything implemented.

## Workspace and stack

The canonical checkout is `/Users/davidmccarty/Desktop/GRID/Projects/Central Command`. Active application code is under `src/`; schema changes are under `supabase/migrations/`. This is a working app, not the older documentation-only Grid2 scaffold.

| Area | Foundation |
|---|---|
| App | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, existing shadcn/ui and GRID shared components |
| Data/state | Supabase, TanStack Query, Zustand |
| Field offline work | Dexie.js, existing sync queues, service worker |
| Maps | Existing Mapbox/routing integration |

Check `package.json`, current schema, and installed Next.js guides for exact versions/APIs. Extend the current blue/navy and gold/lightning design system rather than replacing it from an older design sample.

## Development and evidence

Common commands are `npm run dev`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Inspect current scripts and task-specific verification requirements before execution. Read-only documentation work does not require running the app's full test suite.

Preserve actor/storm isolation, private uploads, relevant GPS/photo capture, and offline draft recovery. Current ticket field-status actions are click-driven; historical GPS-gated status diagrams are not instructions to restore that behavior. Do not cache authenticated financial responses in a shared service-worker cache.

For implementation, verify the same linked records across every affected dashboard and role. Record local tests, applied schema/readback, authenticated browser evidence, and actual device/offline/print acceptance separately. Update the progress tracker with the agent identifier. Follow the repository's Git-operation rules.

The original [scratchpad](scratchpad.md) is source material containing dictation and superseded wording; agents should use the current brief/scope as their guide. Historical plans remain for evidence and must not revive conflicting rules or old removal instructions.
