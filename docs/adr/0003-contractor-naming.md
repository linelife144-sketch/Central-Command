# Canonical contractor terminology

Use Contractor for one person or account and Contractors for collections. This applies to displayed labels, TypeScript models, portal roles, route-group folder names, Supabase queries, bootstrap SQL, scripts, and project documentation.

The application now uses only `contractors`, `contractor_rates`, `contractor_banking`, `contractor_invoices`, and `contractor_id` in active database queries. Legacy schema fallbacks are removed. Portal props use `contractor`; the stored role remains `CONTRACTOR`.

`20260930130000_complete_contractor_naming.sql` finishes database naming by renaming existing tables, columns, constraints, indexes, policies, triggers, enum values, and affected routines. It preserves table and routine identities, rows, foreign-key dependencies, grants, RLS, and execution context. Conflicting parallel names or old routine parameter signatures stop the transaction for review rather than discarding records or dropping dependencies.

Existing migration history is preserved. Its original identifiers are required to recognize and upgrade old installations. Middleware keeps redirects for old bookmarks. The schema verification script keeps old identifiers only as a detection list; they are not application database targets.

The baseline SQL and reference documentation now describe the canonical schema. The old type snapshot is archived outside the application in this task's backup folder.

## Verification and deployment

Full TypeScript validation and 53 focused tests passed. Nine checks in temporary PostgreSQL verified row preservation, enum values, dependencies, RLS, grants, foreign keys, routine behavior, renamed schema objects, rerun safety, and stopping on ambiguous names. Browser checks confirmed the contractor list, detail page, and contractor portal route.

Live Supabase has not been modified. The linked project's management credential returned HTTP 401, and the CLI has no saved login. Restore valid management access, inspect the actual target schema, then apply only the contractor naming migration through the normal migration process. Unrelated pending migrations are outside this naming task.

The master progress tracker referenced by AGENTS.md is missing; this ADR and the verification report record the requested work.
