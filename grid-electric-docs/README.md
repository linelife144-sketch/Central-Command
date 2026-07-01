# Central Command

## Internal Damage Assessment Platform — Technical Documentation

---

## 📋 DOCUMENTATION OVERVIEW

This comprehensive documentation package contains everything needed to build the Central Command Damage Assessment Platform — a Progressive Web App (PWA) for managing independent subcontractor crews performing utility damage assessments.

### Document Index

| # | Document | Purpose |
|---|----------|---------|
| 1 | **[Technical PRD](01-TECHNICAL-PRD.md)** | Complete product requirements, architecture decisions, and feature specifications |
| 2 | **[Database Schema](02-DATABASE-SCHEMA.md)** | Full Supabase PostgreSQL schema with tables, RLS policies, and triggers |
| 3 | **[Wireframes](03-WIREFRAMES.md)** | ASCII wireframes for all 52 screens across auth, onboarding, admin, and subcontractor portals |
| 4 | **[Design System](04-DESIGN-SYSTEM.md)** | Blue/yellow theme, typography, components, and styling specifications |
| 5 | **[API Specifications](05-API-SPECIFICATIONS.md)** | Complete REST API documentation for all endpoints |
| 6 | **[Component Architecture](06-COMPONENT-ARCHITECTURE.md)** | React component structure, hooks, and folder organization |
| 7 | **[Offline PWA Strategy](07-OFFLINE-PWA-STRATEGY.md)** | Service worker, IndexedDB, and background sync implementation |
| 8 | **[Project Roadmap](08-PROJECT-ROADMAP.md)** | 16-week development timeline with milestones |
| 9 | **[Data Flow Analysis](09-DATA-FLOW-ANALYSIS.md)** | End-to-end ticket lifecycle, validation rules, gaps identified from field forms |
| 10 | **[Implementation Checklist](10-IMPLEMENTATION-CHECKLIST.md)** | Step-by-step build guide with wire sizes, equipment catalog, photo validation |

---

## 🎯 PROJECT SUMMARY

### Business Model

- **Prime Contractor:** Central Command (You)
- **Workforce:** Independent 1099 subcontractors
- **Clients:** Power utility companies with government contracts
- **Compliance:** FISMA/FedRAMP moderate

### Core Features

#### Ticketing & Workflow

- 13-status ticket lifecycle
- GPS-validated 3-status field workflow (In Route → On Site → Complete)
- Route optimization with Mapbox/OSRM
- Geofenced status updates (500m radius)

#### Time Tracking

- GPS-verified clock in/out
- Multiple work types (Standard, Emergency, Travel, Standby, Admin, Training)
- Automatic billable hours calculation
- Photo verification at clock-in

#### Expense Management

- 8 expense categories
- Receipt capture with OCR
- Automatic mileage calculation (IRS rate)
- Policy enforcement and flagging

#### Damage Assessments

- Safety observation checklist
- Equipment catalog with damage indicators
- Photo requirements (min 4 per assessment)
- Digital signatures
- NFPA 70B priority classification

#### Invoicing & Payments

- Automated invoice generation
- 1099 threshold tracking ($600)
- PDF export
- Payment workflow tracking

### Technical Stack

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND                                               │
│  ├── Next.js 14 (App Router)                           │
│  ├── React 18 + TypeScript                             │
│  ├── Tailwind CSS 3.4                                  │
│  ├── shadcn/ui (40+ components)                        │
│  ├── Zustand (state management)                        │
│  ├── TanStack Query (server state)                     │
│  └── Dexie.js (IndexedDB)                              │
├─────────────────────────────────────────────────────────┤
│  BACKEND                                                │
│  ├── Supabase (PostgreSQL + Auth)                      │
│  ├── Row-Level Security (RLS)                          │
│  ├── Realtime subscriptions                            │
│  └── Storage (photos, documents)                       │
├─────────────────────────────────────────────────────────┤
│  EXTERNAL SERVICES                                      │
│  ├── Mapbox (maps, routing, geocoding)                 │
│  └── Web Push API (notifications)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 DESIGN SYSTEM HIGHLIGHTS

### Color Palette

```
Primary:   Navy 900    #0F172A  (Headers, sidebar)
Action:    Blue 700    #1D4ED8  (Buttons, links)
Accent:    Yellow 400  #FACC15  (Highlights, badges)
Success:   Green 500   #10B981  (Complete, approved)
Warning:   Amber 500   #F59E0B  (Pending, attention)
Danger:    Red 600     #DC2626  (Errors, rejected)
```

### Typography

- **Font:** Inter (sans-serif), JetBrains Mono (code/data)
- **Scale:** Display (48px) → H1 (30px) → H2 (24px) → Body (16px) → Caption (12px)

### Component Library

- 40+ pre-installed shadcn/ui components
- Custom theme with brand colors
- Mobile-first responsive design
- Accessibility (WCAG 2.1 AA)

---

## 📱 SCREEN INVENTORY

### Authentication (6 screens)

- Login, Forgot Password, Reset Password, Magic Link, Role Selection, Session Expired

### Onboarding (12 screens)

- Welcome, Personal Info, Business Info, Insurance, Credentials, Banking, Rates, Agreements, Training, Profile Photo, Review, Pending Approval

### Admin Portal (18 screens)

- Dashboard, Tickets (list/detail/create/assign), Subcontractors (list/detail/approval), Time Review, Expense Review, Assessment Review, Invoices (list/generate), Reports, Map, Settings, Audit Logs

### Subcontractor Portal (16 screens)

- Dashboard, Tickets (list/detail/assess), Time (list/clock), Expenses (list/new), Invoices (list/detail), Profile, Sync Status

**Total: 52 screens**

---

## 🗄️ DATABASE HIGHLIGHTS

### Key Tables

1. `profiles` — User accounts (extends auth.users)
2. `subcontractors` — Business info, 1099 tracking
3. `subcontractor_credentials` — Insurance, licenses with expiration alerts
4. `tickets` — Work orders with GPS tracking
5. `time_entries` — Clock in/out with GPS verification
6. `expense_reports` + `expense_items` — Expense management
7. `damage_assessments` — Assessment forms
8. `subcontractor_invoices` — Automated billing
9. `media_assets` — Photos with EXIF/GPS
10. `sync_queue` — Offline sync tracking

### Security

- Row-Level Security (RLS) on all tables
- Role-based access control
- Encrypted sensitive fields (SSN, bank accounts)
- Audit logging for all changes

---

## 🔄 OFFLINE-FIRST CAPABILITIES

### Service Worker

- Cache-first for static assets
- Stale-while-revalidate for API calls
- Background sync for queued operations

### IndexedDB (Dexie.js)

- Local ticket storage
- Time entry queue
- Photo upload queue
- Sync status tracking

### Sync Strategy

- Optimistic UI updates
- Automatic sync when online
- Retry with exponential backoff
- Conflict resolution UI

---

## 📅 DEVELOPMENT TIMELINE

| Phase | Weeks | Focus | Key Deliverables |
|-------|-------|-------|------------------|
| 1 | 1-4 | Foundation | Auth, Database, Onboarding |
| 2 | 5-8 | Core Features | Tickets, GPS, Photos, Offline |
| 3 | 9-12 | Operations | Time, Expenses, Assessments, Invoicing |
| 4 | 13-16 | Polish & Launch | Testing, Sync, Documentation, Deploy |

**Total MVP Duration: 16 weeks**

---

## 🚀 QUICK START

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Mapbox account

### Installation

```bash
# 1. Initialize project
npx create-next-app@latest grid-electric --typescript --tailwind --app

# 2. Install shadcn/ui
npx shadcn-ui@latest init

# 3. Install dependencies
npm install @supabase/supabase-js zustand @tanstack/react-query dexie dexie-react-hooks mapbox-gl date-fns zod

# 4. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 5. Run development server
npm run dev
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📊 SUCCESS METRICS

### Technical

- [ ] Page load < 2s (subsequent < 1s)
- [ ] API response < 200ms
- [ ] 99.9% uptime
- [ ] < 0.1% error rate

### Business

- [ ] Onboarding completion > 90%
- [ ] Time tracking accuracy > 95%
- [ ] Expense approval < 24 hours
- [ ] Invoice generation < 1 hour

### Compliance

- [ ] 100% audit trail completeness
- [ ] 100% 1099 accuracy
- [ ] 100% insurance verification

---

## 📞 SUPPORT

For questions or issues with this documentation:

1. Check the specific document for detailed information
2. Review the code examples in each section
3. Refer to the external documentation links provided

---

## 📄 LICENSE

Internal Use Only — Central Command

---

**Documentation Version:** 1.0  
**Last Updated:** February 4, 2026  
**Prepared By:** Technical Team

---

*This documentation package represents a complete technical specification for building the Central Command Damage Assessment Platform. All documents should be reviewed before beginning development.*
