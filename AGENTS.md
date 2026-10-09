# Central Command — AI Agent Guide

## Current product direction — 2026-10-08

Read the current [implementation plan](implementation_plan.md) and [progress checklist](grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md), then [PROJECT_BRIEF.md](PROJECT_BRIEF.md) and the [updated scope / PRD](grid-electric-docs/01-TECHNICAL-PRD.md). The [workflow master plan](docs/plans/2026-10-08-central-command-workflow-master-plan.md) supplies requirement IDs, dependency/impact mapping, and acceptance scenarios for task decomposition.

The CEO runs the company. One responsible Storm Manager runs each storm with full management access beneath the CEO, replacing the Super Admin business role. Tickets are assigned to Driver/Assessor crews within teams. Management's official time normally allocates 16 hours per day, every day, from mobilization until release, with individual exceptions; contractor clocks remain personal reference/dispute evidence. No fixed pay period, predetermined release date, or daily attendance reconfirmation is required. Rates are set in storm setup, with optional contractor overrides and separate Driver allowance; controlled edits belong in storm setup/detail.

These are product requirements, not a statement that the current code already implements them. Preserve existing dashboards, navigation, useful controls, alerts, fieldwork, maps, forms, review, account setup, exports, and offline behavior. Omission or wording cleanup is not removal authority. Keep current click-driven field status actions and the GPS/photo protections that apply to other captures; do not restore a superseded status workflow from older documentation.

Current operational records are test data intended for a separately controlled launch reset. Do not erase them during ordinary implementation or preserve artificial test history at the expense of the intended design. All product assumptions and historical completion summaries below must be interpreted through the current brief/scope. Historical plans are evidence, not authority to rerun completed work or revive old removal instructions.

---

## ⚠️ CRITICAL: MANDATORY PRE-WORK CHECKLIST

**BEFORE TAKING ANY ACTION ON THIS PROJECT, YOU MUST:**

1. **Read `implementation_plan.md`, the progress checklist, `PROJECT_BRIEF.md`, and the current PRD scope** — Review the current task and product direction before consulting historical plans
2. **Follow the phase order** — Do not skip phases or jump ahead
3. **Update the Progress Tracker** — Mark tasks complete and add your agent identifier after finishing ANY work

**FAILURE TO FOLLOW THESE STEPS WILL RESULT IN DUPLICATED WORK AND PROJECT CONFUSION.**

---

## Quick Status Overview

The percentages and completed-feature inventory below are historical migration summaries. They do not measure acceptance of the 2026-10-08 operating model; use dated progress and current evidence.

| Metric | Value |
|--------|-------|
| **Current Phase** | Phase 4 — Polish & Launch (Week 13 ready) |
| **Overall Progress** | 84% Complete |
| **Phase 1 Status** | ✅ Complete |
| **Week 5 Status** | ✅ Complete |
| **Week 6-12 Status** | ✅ Complete (Grid2 migration — 2026-07-01) |

### Completed So Far

- ✅ Project initialization (Next.js 16 + TypeScript + Tailwind)
- ✅ shadcn/ui components installed (24 components)
- ✅ Dependencies installed (80+ packages)
- ✅ TypeScript type definitions
- ✅ Configuration files (appConfig.ts, Supabase clients, Dexie.js)
- ✅ Database SQL files + Grid2 schema (36 tables, storm events, CEO role, contractor naming)
- ✅ PWA manifest + service worker + offline sync
- ✅ Zustand auth store
- ✅ Utility functions (formatters, validators)
- ✅ Authentication screens, forms, & wrappers
- ✅ 12-Step Contractor Onboarding flow & components
- ✅ Admin Dashboard Shell & Layouts
- ✅ Ticket CRUD, components, status transitions, and timeline
- ✅ Map Integration (Mapbox GL, MapView, TicketMarkers, RouteOverlay, GeofenceCircle)
- ✅ GPS Workflow (Geofencing, GPS validation hook, route optimization)
- ✅ Status Update Flow (3-status workflow, GPS validation at each status, mobile map view)
- ✅ Photo capture, storage, and validation
- ✅ Time clock with GPS-verified clock in/out
- ✅ Expense submission and processing
- ✅ Assessment forms and review
- ✅ Invoice generation and 1099 tracking
- ✅ Dashboard metrics and reporting
- ✅ Storm event management

### Path B Migration (2026-07-01)

Grid2's 84% mature UI was grafted onto Central Command's Supabase backend (`xcvacmreerrypygpritq`). See `docs/adr/0001-grid2-cc-migration.md` for full details.

### Next Tasks (Week 13)

- ⏳ Task 13.1: Testing suite (unit, integration, E2E, offline, security, cross-browser, mobile)
- ⏳ Apply deferred migrations #2 (Jeanie Campbell promotion) and #15 (executive profile lock)

---

## Project Overview

**Central Command Damage Assessment Platform** — A Progressive Web Application (PWA) for managing independent 1099 contractor crews performing utility damage assessments for government contracts.

### Business Context

| Aspect | Details |
|--------|---------|
| **Prime Contractor** | Central Command |
| **Workforce Model** | Independent 1099 contractors (not employees) |
| **Client Base** | Power utility companies with government contracts |
| **Compliance Level** | FISMA/FedRAMP moderate |

### Core Purpose

Enable efficient dispatch, tracking, and billing of damage assessment crews while maintaining strict compliance with government contract standards and independent contractor legal requirements.

---

## Technology Stack

### Frontend

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 14+ (App Router) |
| Language | TypeScript | 5.x |
| UI Library | React | 19 |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui | 24+ components |
| State Management | Zustand | Latest |
| Server State | TanStack Query | Latest |
| Offline Storage | Dexie.js (IndexedDB) | Latest |
| Maps | Mapbox GL JS | Latest |

### Backend

| Component | Technology |
|-----------|------------|
| BaaS | Supabase |
| Database | PostgreSQL 15+ |
| Auth | Supabase Auth (email/password, magic link) |
| Storage | Supabase Storage |
| Real-time | Supabase Realtime |
| Security | Row-Level Security (RLS) |

### External Services

| Service | Purpose |
|---------|---------|
| Mapbox | Maps, routing, geocoding |
| OSRM (self-hosted) | Free unlimited routing |
| Web Push API | PWA notifications |
| Supabase Storage | Photos, documents, PDFs |

---

## Project Structure

```
Grid2/
├── app/                          # Next.js application
│   ├── (auth)/                   # Auth routes (login, forgot-password, etc.)
│   ├── (onboarding)/             # 12-step onboarding flow
│   ├── (admin)/                  # Admin portal (18 screens)
│   ├── (contractor)/          # Contractor portal (16 screens)
│   └── api/                      # API routes
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── common/                   # Shared components
│   │   ├── layout/               # AppShell, Sidebar, BottomNav, TopBar
│   │   ├── feedback/             # LoadingSpinner, ErrorBoundary, OfflineBanner
│   │   ├── data-display/         # DataTable, StatusBadge, MetricCard
│   │   └── forms/                # FormField, ImageUpload, SignaturePad
│   ├── features/                 # Feature-specific components
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── tickets/
│   │   ├── time-tracking/
│   │   ├── expenses/
│   │   ├── assessments/
│   │   ├── invoices/
│   │   ├── map/
│   │   └── dashboard/
│   └── providers/                # Context providers
│
├── hooks/                        # Custom React hooks
├── lib/                          # Utilities & configuration
│   ├── config/appConfig.ts       # App constants & enums
│   ├── supabase/                 # Supabase clients
│   ├── db/dexie.ts               # IndexedDB offline storage
│   ├── services/                 # External services (Mapbox, etc.)
│   ├── utils/                    # Utility functions
│   └── constants/                # App constants
│
├── stores/                       # Zustand stores
├── types/                        # TypeScript type definitions
├── sql/                          # Database SQL files (01-10)
├── public/                       # Static assets
│
└── grid-electric-docs/           # 📚 TECHNICAL DOCUMENTATION
    ├── README.md                     Documentation index
    ├── 01-TECHNICAL-PRD.md           Product requirements
    ├── 02-DATABASE-SCHEMA.md         Database schema
    ├── 03-WIREFRAMES.md              UI designs (52 screens)
    ├── 04-DESIGN-SYSTEM.md           Colors, typography
    ├── 05-API-SPECIFICATIONS.md      API documentation
    ├── 06-COMPONENT-ARCHITECTURE.md  React structure
    ├── 07-OFFLINE-PWA-STRATEGY.md    Service worker, IndexedDB
    ├── 08-PROJECT-ROADMAP.md         16-week timeline
    ├── 09-DATA-FLOW-ANALYSIS.md      Ticket lifecycle
    └── 10-IMPLEMENTATION-CHECKLIST.md Build checklist
```

---

## Key Documentation Reference

### Before Any Work, Read These Files in Order

1. **`implementation_plan.md` and `grid-electric-docs/10-IMPLEMENTATION-CHECKLIST.md`**
   - Review the requested task and implementation references
   - Check recorded progress before starting work

2. **Technical Specifications (as needed):**

   | Topic | Document | When to Reference |
   |-------|----------|-------------------|
   | Requirements | `01-TECHNICAL-PRD.md` | Feature planning |
   | Database | `02-DATABASE-SCHEMA.md` | Database work |
   | UI/UX | `03-WIREFRAMES.md` | UI implementation |
   | Styling | `04-DESIGN-SYSTEM.md` | Styling, theming |
   | API | `05-API-SPECIFICATIONS.md` | Backend integration |
   | Architecture | `06-COMPONENT-ARCHITECTURE.md` | Component development |
   | Offline | `07-OFFLINE-PWA-STRATEGY.md` | Offline functionality |
   | Roadmap | `08-PROJECT-ROADMAP.md` | Planning, tracking |
   | Data Flow | `09-DATA-FLOW-ANALYSIS.md` | Data flow implementation |
   | Checklist | `10-IMPLEMENTATION-CHECKLIST.md` | Daily task reference |

---

## Core Features & Requirements

### 1. User Roles

| Role | Permissions |
|------|-------------|
| CEO | Company leadership and highest management authority |
| STORM_MANAGER (target authority) | Full existing Super Admin management access beneath the CEO; one responsible manager per storm |
| Existing reviewer roles | Preserve permitted review capabilities; keep reviewer profile identity distinct from operational Team Lead identity |
| TEAM_LEAD / field contractors | Operational/pay roles with actor- and crew-scoped access; no administrative access implied by pay role |

Current application authority still includes `SUPER_ADMIN`; coordinate the compatibility transition rather than changing labels alone. Contractor access is not read-only access to all company data.

### 2. Ticket Lifecycle (13 Statuses)

```
DRAFT → ASSIGNED → IN_ROUTE → ON_SITE → IN_PROGRESS → COMPLETE → 
PENDING_REVIEW → APPROVED/NEEDS_REWORK → CLOSED
```

### 3. GPS Requirements

- **Accuracy threshold:** < 100 meters
- **Geofence radius:** 500 meters (configurable)
- **Clock-in photo:** Required with GPS verification
- **Update frequency:** 30s (IN_ROUTE), 5min (ON_SITE)

### 4. Photo Requirements

- **Minimum per assessment:** 4 photos
- **Mandatory types:** Overview, Equipment, Damage, Safety
- **GPS tagging:** Required (extracted from EXIF)
- **Minimum resolution:** 1920×1080
- **Maximum file size:** 10MB per photo
- **Format:** JPEG (quality: 85%)
- **Integrity:** SHA-256 checksum on upload

### 5. Time Tracking Rules

- **Official time target:** Management-controlled 16-hour days from mobilization until release, with explicit individual exceptions; no required payroll period or daily attendance reconfirmation.
- **Personal clocks:** Reference/dispute evidence only under the target model; preserve applicable current GPS/photo capture requirements.
- **Authority:** Official time, including approved exceptions, drives payroll and hourly billing. Do not infer official hours from a personal clock or ticket assignment.
- **Work types and personal-clock limits:** Inspect current configuration/schema; historical ADMIN/TRAINING work types and old 12-hour defaults are not instructions to reintroduce them.

---

## Code Style Guidelines

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Pages | `page.tsx` | `app/(admin)/dashboard/page.tsx` |
| Layouts | `layout.tsx` | `app/(admin)/layout.tsx` |
| Components | PascalCase | `TicketList.tsx`, `TimeClock.tsx` |
| Hooks | camelCase with `use` prefix | `useTickets.ts`, `useGeolocation.ts` |
| Utilities | camelCase | `formatters.ts`, `validators.ts` |
| Types | PascalCase | `Ticket.ts`, `TimeEntry.ts` |
| Constants | SCREAMING_SNAKE_CASE | `TICKET_STATUSES`, `WORK_TYPES` |

### Import Order

1. React/Next.js imports
2. Third-party library imports
3. shadcn/ui components (`@/components/ui/*`)
4. Custom components (`@/components/*`)
5. Hooks (`@/hooks/*`)
6. Utilities (`@/lib/*`)
7. Types (`@/types/*`)
8. Constants (`@/lib/constants/*`)

### Component Structure Template

```typescript
// 1. Imports (ordered per above)
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils/formatters';
import { Ticket } from '@/types/ticket';

// 2. Type definitions
interface TicketCardProps {
  ticket: Ticket;
  onStatusChange?: (id: string, status: string) => void;
}

// 3. Component
export function TicketCard({ ticket, onStatusChange }: TicketCardProps) {
  // Implementation
}

// 4. Default export (if needed)
export default TicketCard;
```

---

## Build and Development Commands

### Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type checking
npx tsc --noEmit
```

### Environment Variables

Create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAX_TIME_ENTRY_HOURS=12
NEXT_PUBLIC_GEOFENCE_RADIUS_METERS=500
NEXT_PUBLIC_MAX_PHOTO_SIZE_MB=10
NEXT_PUBLIC_MIN_PHOTOS_REQUIRED=4
```

---

## Development Rules

### ✅ DO

- Review the implementation plan and existing checklist before work
- Check what's already completed in Section 2
- Follow the phase order (1 → 2 → 3 → 4)
- Update progress tracker after each task
- Use existing components from `components/ui/`
- Follow the design system (`04-DESIGN-SYSTEM.md`)
- Test offline functionality when building features
- Make minimal changes to achieve the goal
- Follow existing code patterns

### ❌ DON'T

- Skip reviewing task scope and recorded progress
- Duplicate work already completed
- Skip phases or jump ahead
- Forget to update progress tracker
- Create new components that already exist in shadcn/ui
- Ignore the design system colors/typography
- Forget to handle offline scenarios
- Bypass GPS checks or photo requirements
- Run git operations without user confirmation

---

## Offline-First Architecture

### Storage Hierarchy

| Layer | Technology | Purpose |
|-------|------------|---------|
| React State | useState/useReducer | UI state (session only) |
| Zustand Store | Zustand | App state (memory + partial persist) |
| React Query Cache | TanStack Query | Server state (memory + cache) |
| IndexedDB | Dexie.js | Local database (persistent) |
| Cache API | Service Worker | Static assets (persistent) |

### Sync Strategy

1. **Optimistic UI updates** — UI updates immediately
2. **Local-first data** — All data originates in IndexedDB
3. **Background sync** — Queue operations for when connectivity returns
4. **Conflict resolution** — Server timestamp priority with user prompts

---

## Security Considerations

### Authentication

- Password policy: 12+ chars, complexity requirements
- Failed login lockout: 5 attempts = 15 min lockout
- Session timeout: 8 hours idle, 24 hours max
- MFA: Optional for MVP, required for admins post-MVP

### Data Encryption

| Layer | Method |
|-------|--------|
| Data at rest | AES-256 (Supabase default) |
| Data in transit | TLS 1.3 |
| Sensitive fields | Column-level encryption |
| File storage | Server-side encryption |

### Audit Logging

All actions logged with:

- User ID
- Timestamp (UTC)
- Action type
- IP address
- Device fingerprint
- Before/after values (for changes)

---

## Testing Instructions

### Critical Test Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Contractor clocks in outside geofence | Error: "Must be within 500m of site" |
| Photo without GPS | Error: "Enable location services" |
| Submit assessment with 3 photos | Error: "Minimum 4 photos required" |
| Normal official storm day | 16 hours for mobilized participants; management exceptions and release apply |
| Personal time differs from official time | Preserve both; official payroll/billing changes only through management correction |
| Duplicate photo uploaded | Flag for admin review |
| GPS spoofing detected | Flag for admin review |
| Offline assessment submission | Queued for sync |

### Performance Targets

- Page load (initial): < 2s
- Page load (subsequent): < 1s
- API response: < 200ms
- Photo upload: < 5s per MB
- Map initialization: < 3s

---

## Need Help?

### Documentation by Topic

| Topic | Primary Doc | Secondary Doc |
|-------|-------------|---------------|
| Requirements | `01-TECHNICAL-PRD.md` | `08-PROJECT-ROADMAP.md` |
| Database | `02-DATABASE-SCHEMA.md` | `09-DATA-FLOW-ANALYSIS.md` |
| UI/UX | `03-WIREFRAMES.md` | `04-DESIGN-SYSTEM.md` |
| API | `05-API-SPECIFICATIONS.md` | `06-COMPONENT-ARCHITECTURE.md` |
| Offline | `07-OFFLINE-PWA-STRATEGY.md` | `10-IMPLEMENTATION-CHECKLIST.md` |

### External References

- **Next.js 14:** <https://nextjs.org/docs>
- **shadcn/ui:** <https://ui.shadcn.com>
- **Supabase:** <https://supabase.com/docs>
- **TanStack Query:** <https://tanstack.com/query/latest>
- **Zustand:** <https://docs.pmnd.rs/zustand>
- **Dexie.js:** <https://dexie.org/docs>
- **Mapbox GL JS:** <https://docs.mapbox.com/mapbox-gl-js>
- **Tailwind CSS:** <https://tailwindcss.com/docs>

---

## Summary

**This is an existing working application with documentation and implementation gaps.** Preserve compliant capabilities and complete the current Phase 4 plan; do not rebuild the old scaffold from these historical specifications.

**Compliance is critical.** All changes must maintain FISMA/FedRAMP moderate compliance requirements, especially:

- Audit logging
- Data encryption
- Access controls (RLS)
- 1099 tracking accuracy

**Offline-first is a core requirement.** Field contractors work in areas with poor cellular coverage. Always implement features with offline capability in mind.

**Preserve required GPS validation.** Keep the existing GPS/photo protections on personal clock and evidence-capture workflows that require them. Management's official-time records are a separate authority, not fabricated field clock captures. Current click-driven ticket status actions must not be changed back to historical GPS-gated transitions merely because an older document describes them.

---

**Last Updated:** February 9, 2026  
**Documentation Version:** 1.1  
**Next Milestone:** Supabase Project Setup & Authentication Screens

---

*Review the implementation plan and update the existing checklist after completing work.*

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
