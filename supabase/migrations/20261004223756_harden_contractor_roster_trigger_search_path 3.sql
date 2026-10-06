BEGIN;
ALTER FUNCTION public.enforce_ticket_roster_assignment() SET search_path='';
NOTIFY pgrst,'reload schema';
COMMIT;
