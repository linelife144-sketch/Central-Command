# Storm compensation rollout — 2026-10-08

## Delivered behavior

Storm creation stores five required hourly contractor wages and five required hourly utility bill rates with the storm in one database operation. Payroll rate editing is scoped to a selected storm; later clock-ins receive updated values, while an existing shift retains its snapshots. Roster assignment stores an optional contractor wage override and a required hourly vehicle allowance for Drivers only. Costing resolves the storm/role rate and contractor exception on the server and earns the Driver allowance only during recorded vehicle-use intervals. Closed storms reject compensation edits, and ticket assignment remains limited to the selected storm roster.

## Verification

- 48 focused Vitest tests pass across 11 storm compensation UI/service test files.
- The isolated PGlite harness passes nine groups covering RLS and unauthorized access, separate storm rate cards, incomplete-card rejection, per-Driver allowances, rollback of invalid creation, wage resolution across work types, immutable snapshots, closed-storm edits, and compensation foreign-key indexes.
- Scoped ESLint passes for the edited storm, payroll, compensation, and verification files.
- Live schema readback confirms the role-keyed bill-rate column, two new compensation tables, snapshot column, all four storm compensation RPCs, new costing trigger body, and storm-scoped RLS policies. Ordinary ADMIN authorization is denied for Storms/Payroll by the current deployed permission helper; the new operations use the permissions available to CEO/SUPER_ADMIN roles.
- Live migration ledger on `xcvacmreerrypygpritq` records `20261008230422_role_keyed_utility_billing_rates`, `20261008234452_storm_compensation`, and `20261008234601_storm_compensation_fk_indexes`.
- Read-only postflight found three existing storms, four legacy work-type billing rows, zero open shifts, and zero storm role-rate or contractor-exception rows. No production rate values or QA data were inserted. Existing storms need their own five-role rate cards and each assigned Driver's allowance before they can accept new clock-ins.
- The Supabase security advisor reports no finding naming the new storm compensation objects. Current unrelated notices include the existing ticket-disable `SECURITY DEFINER` RPC and disabled leaked-password protection. Performance advisor no longer reports unindexed foreign keys for the new compensation tables; its fresh indexes currently appear in the unused-index informational list.

## Outstanding acceptance

The hosted frontend was not deployed: this checkout has no configured hosting provider, project, or production URL. Provide the hosting target and production URL to deploy the frontend. A signed-in browser check of storm creation, Payroll edits, and roster compensation is also pending. Configure the existing three storms with their actual approved rates before workers clock in; those values must come from the operator and were not inferred from global or other-storm rates.

The repository-wide TypeScript check still reports errors in duplicate archival Payroll files with ` 2` and ` 3` suffixes; the feature-scoped check passes. Live database metadata and isolated RLS tests do not substitute for signed-in production browser acceptance.
