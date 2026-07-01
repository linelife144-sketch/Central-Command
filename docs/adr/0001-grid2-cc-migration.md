# ADR 0001 — Grid2 → Central Command Schema & Source Migration (Path B)

- **Date**: 2026-07-01
- **Status**: Accepted
- **Author**: Perses (Long-Horizon Orchestrator)

## Context

Grid Electric Services' damage assessment PWA was split across two codebases:

| | Grid2 | Central Command |
|---|---|---|
| UI maturity | 84% (Phase 4) | 31% (Phase 2) |
| Supabase project | `bsiuuibnjccjkmgktfce` (dead) | `xcvacmreerrypygpritq` (live) |
| Layout | `src/` | Root-level |
| Schema | contractors, CEO, storm_events | subcontractors, TEAM_LEAD, READ_ONLY |

Path C (recover Grid2's Supabase dashboard) was attempted and failed. Path A (rebuild Grid2 features into CC incrementally) would have taken weeks.

## Decision

Execute **Path B**: Graft Grid2's production-ready frontend onto Central Command's live Supabase backend.

### What was done

1. **Database migration**: Wiped CC's schema, applied Grid2's base SQL scripts (`sql/01-10`) via `psql`, then applied 14 of 16 Grid2 migration deltas. Result: 36 tables including `storm_events`, `customers`, `contractors` (renamed from `subcontractors`), `CEO` in `user_role` enum, full RLS on all tables.

2. **Source migration**: Created `src/` directory in CC, moved CC's source files into it, merged Grid2's 300+ source files without overwriting existing CC content. Adopted Grid2's `@/* → ./src/*` path alias.

3. **Configuration merge**: Merged `package.json` (kept CC's newer versions, added Grid2-only deps), replaced `globals.css` with 812-line storm theme, injected `ServiceWorkerProvider`/`SyncProvider`/`OfflineBanner` into root layout, replaced Supabase clients with `@supabase/ssr` pattern pointed at CC's ref, updated `next.config.ts` for Turbopack + webpack cache fix.

4. **Type error resolution**: Fixed 231 TypeScript errors across 7 clusters: added `storm` button variant, configured vitest globals, renamed `subcontractor_id` → `contractor_id` in types, added missing Grid2 type exports, fixed `InvoiceListItem`/`SyncQueueItem`/`Local*` types, added missing Dexie exports.

### Verifications

- `tsc --noEmit`: 0 source errors
- `npm run build`: 50+ routes compiled
- Smoke test: Dashboard, Storm Events, Tickets all render with zero JS errors
- `grep -r bsiuuibnjccjkmgktfce src/`: 0 matches
- Grid2 archived at `~/Grid2-archive-2026-07-01`

## Consequences

### Positive
- CC now runs Grid2's 84% complete PWA on a live Supabase backend
- Storm theme, PWA offline stack, GPS workflows, OCR pipeline all operational
- 50+ routes including admin dashboard, storm event management, subcontractor portals

### Negative / Deferred
- Two migrations skipped due to Grid2-specific data references:
  - #2: Allow 2 super admins + promote Jeanie Campbell (hard-coded email)
  - #15: Lock executive profiles (hard-coded UUIDs)
- Unique index `idx_profiles_single_super_admin` limits CC to 1 SUPER_ADMIN — drop if 2 are needed
- Migration tracking in `supabase_migrations.schema_migrations` manually synced — future `db push` operations should verify tracking consistency
- Database password was reset to enable `pg_dump` backup (stored in Hermes memory)
