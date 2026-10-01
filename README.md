# Central Command — Damage Assessment Platform

Welcome! This is the workspace directory for the **Central Command Damage Assessment Platform**, a Progressive Web Application (PWA) designed for managing independent 1099 contractor crews performing utility damage assessments under government contracts.

This README serves as the primary entry point and operational guide for **AI Coding Assistants** and human developers working in this codebase.

---

## ⚠️ CRITICAL: MANDATORY AGENT INSTRUCTIONS

Before taking any action or writing any code in this directory, you **MUST** follow this protocol:

1. **Read the Master Build Instructions**: Refer to [grid-electric-docs/MASTER_BUILD_INSTRUCTIONS.md](file:///Users/davidmccarty/Desktop/Grid2/grid-electric-docs/MASTER_BUILD_INSTRUCTIONS.md) first. It is the single source of truth for features, development phases, and roadmap.
2. **Check the Progress Tracker**: Review Section 2 of the [MASTER_BUILD_INSTRUCTIONS.md](file:///Users/davidmccarty/Desktop/Grid2/grid-electric-docs/MASTER_BUILD_INSTRUCTIONS.md) to see what tasks are already complete or in progress. Do not skip phases or duplicate work.
3. **Review the Agent Guidelines**: Read the rules defined in [AGENTS.md](file:///Users/davidmccarty/Desktop/Grid2/AGENTS.md). It outlines code style, security requirements, and offline-first/GPS validation rules.
4. **Document Your Work**: 
   - Use the [scratchpad.md](file:///Users/davidmccarty/Desktop/Grid2/scratchpad.md) file in this directory to track your current context, notes, and checklist during your session.
   - Update the Progress Tracker in [MASTER_BUILD_INSTRUCTIONS.md](file:///Users/davidmccarty/Desktop/Grid2/grid-electric-docs/MASTER_BUILD_INSTRUCTIONS.md) when finishing a task.

---

## 📂 Project Structure

```
Grid2/
├── app/                          # Next.js 14 App Router application
│   ├── (auth)/                   # Authentication routes (Login, Magic Link, etc.)
│   ├── (onboarding)/             # 12-step contractor onboarding flow
│   ├── (admin)/                  # Admin portal & dashboard (18 screens)
│   ├── (contractor)/          # Field contractor portal (16 screens)
│   └── api/                      # Backend API routes
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components (do not recreate existing ones!)
│   ├── common/                   # Shared layouts, feedback banners, data tables
│   └── features/                 # Feature-specific components (auth, map, tickets, etc.)
├── hooks/                        # Custom React hooks (geolocation, sync, offline)
├── lib/                          # Configurations, utility functions, database clients
│   ├── config/appConfig.ts       # Central application configuration & enums
│   ├── supabase/                 # Supabase server & browser clients
│   ├── db/dexie.ts               # Dexie.js (IndexedDB) offline-first database
│   └── utils/                    # Shared validation schemas & formatting utilities
├── stores/                       # Zustand global stores (auth, sync state)
├── sql/                          # Supabase PostgreSQL schema migrations and seed data
├── public/                       # Service worker (sw.ts/sw.js) and static assets
├── grid-electric-docs/           # 📚 Technical specifications, wireframes, and design specs
└── scratchpad.md                 # 📝 Active workspace for your notes, tasks, and code plans
```

---

## 🛠️ Technology Stack & Key Libraries

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS (4.x), shadcn/ui
- **State & Server State**: Zustand, TanStack Query (React Query)
- **Offline Storage & PWA**: Dexie.js (IndexedDB), Service Workers, Web Push API
- **Backend & Auth**: Supabase (PostgreSQL 15+, Auth, Storage, RLS, Realtime)
- **Maps & Routing**: Mapbox GL JS, Self-hosted OSRM

---

## 🔒 Crucial Development Constraints

- **Offline-First**: Field users work in areas with poor cellular coverage. All data operations must go to Dexie.js first, queueing up background synchronization via the Service Worker when online.
- **GPS Validation**: Photos and time tracking require GPS accuracy thresholds (<100m) and geofence verification (500m radius). Do not bypass location checks.
- **RLS & Security**: Row-Level Security (RLS) is strictly enforced in Supabase. Check [02-DATABASE-SCHEMA.md](file:///Users/davidmccarty/Desktop/Grid2/grid-electric-docs/02-DATABASE-SCHEMA.md) and [sql/08_rls_policies.sql](file:///Users/davidmccarty/Desktop/Grid2/sql/08_rls_policies.sql) before writing queries.
- **Aesthetic Excellence**: Follow the color palettes, fonts, and component structures in the design guidelines ([04-DESIGN-SYSTEM.md](file:///Users/davidmccarty/Desktop/Grid2/grid-electric-docs/04-DESIGN-SYSTEM.md)). UI should feel modern, clean, and professional.

---

## ⚙️ Development Commands

Use the following commands inside this directory to manage the application:

```bash
# Start the Next.js development server
npm run dev

# Run TypeScript compilation check
npx tsc --noEmit

# Lint the codebase
npm run lint

# Build for production
npm run build
```
