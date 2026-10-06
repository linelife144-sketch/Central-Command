-- Contractors can no longer reject tickets. Return any legacy REJECTED tickets to
-- ASSIGNED so they show as "Open" to the contractor. The enum value is retained
-- in Postgres (removing enum values is destructive) but is no longer used by the app.
update public.tickets
set status = 'ASSIGNED'
where status = 'REJECTED';
