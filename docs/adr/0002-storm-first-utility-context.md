# Storm-first utility context

The storm event is the operating and billing root. Its unique, immutable event code is the business reference. Existing UUID primary keys remain the internal foreign-key links, so historical references are preserved.

Create the storm first, select its utility, then add contractors to its roster and create tickets. Contractor accounts remain reusable across storms; event-specific membership lives in the existing roster tables. Ticket assignment requires membership in that event's roster.

The selected utility supplies a versioned ticket template, required fields, allowed values, and displayed terminology. Utility terminology must be configured from approved specifications. Existing template labels and fields are preserved. Canonical backend field names remain stable. Utility/template identifiers and the configuration snapshot become immutable after storm creation. A different set of rules requires a new template version and a new storm.

The generic ticket-creation entry now selects a storm and opens its configured form. The service reads the actual parent storm instead of trusting caller-supplied utility values. PostgreSQL validates the payload against frozen field definitions. The `create_storm_ticket` RPC saves ticket and payload atomically with the caller's authorization and RLS context.

Ticket numbers are unique per storm. Event codes are unique regardless of case. Billing generation requires one storm and selects only its approved time and expense entries. Invoice lines, expense-ticket links, ticket assignment, and immutable storm links are checked in the database as well as the application.

## Database rollout

1. Run the read-only `scripts/storm-workflow-preflight.sql` against the selected environment and reconcile reported legacy records.
2. Apply `20261001033725_storm_first_workflow.sql` and then `20261001033733_utility_profiles_seed.sql` using the normal Supabase migration workflow.
3. Verify the target environment's real schema, RLS, and role behavior before disabling local testing.

Applied to the live Central Command project through the Supabase plugin on 2026-09-30. Authenticated Super Admin storm and utility ticket creation passed in a rolled-back transaction. Auth and RLS also passed eight isolated integration checks. Legacy unscoped rows are preserved; new writes require storm scope.

`npm run schema:utilities -- <output.sql>` generates reviewable utility configuration SQL from the application registry; it never applies SQL. Template keys are versioned contracts: create a new version instead of changing existing published field structures.

## Scope and remaining configuration

Entergy's current form enforces its existing ten-digit incident number and feeder rules. FPL and the other utility templates retain the fields already configured in this app. Their complete production formats, additional equipment terms, and utility-specific operating steps require approved utility specifications; the implementation does not invent those rules.

The current development session continues to store storms, contractors, roster membership, tickets, payloads, and history in browser-local test storage. Local billing does not query real financial data and has no approved time/expense entries to invoice. GPS, photos, authentication in production, and database RLS remain in force.

The master progress tracker referenced by AGENTS.md is missing. This ADR and the verification report record this authorized work.
