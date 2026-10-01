-- Read-only checks before applying the new storm-first migrations.
-- Resolve any reported data issues explicitly; the migration does not delete records.
SELECT upper(btrim(event_code)) AS event_code,count(*) FROM public.storm_events
GROUP BY upper(btrim(event_code)) HAVING count(*)>1;
SELECT id,ticket_number FROM public.tickets WHERE storm_event_id IS NULL;
SELECT t.id,t.ticket_number,t.utility_client,se.utility_client AS storm_utility
FROM public.tickets t JOIN public.storm_events se ON se.id=t.storm_event_id
WHERE t.utility_client IS DISTINCT FROM se.utility_client OR t.template_key IS DISTINCT FROM se.ticket_template_key;
SELECT storm_event_id,ticket_number,count(*) FROM public.tickets GROUP BY storm_event_id,ticket_number HAVING count(*)>1;
SELECT 'time_entries' AS source,count(*) FROM public.time_entries WHERE storm_event_id IS NULL
UNION ALL SELECT 'expense_reports',count(*) FROM public.expense_reports WHERE storm_event_id IS NULL
UNION ALL SELECT 'contractor_invoices',count(*) FROM public.contractor_invoices WHERE storm_event_id IS NULL;
