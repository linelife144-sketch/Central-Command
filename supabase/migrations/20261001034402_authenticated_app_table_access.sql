BEGIN;
GRANT USAGE ON SCHEMA public TO authenticated;
-- Verified RLS policies govern only these named workflows. No delete,
-- sequence, future-table or other public-table grants are introduced.
GRANT SELECT,UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.contractors TO authenticated;
GRANT SELECT ON TABLE public.ticket_templates TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.storm_events,public.tickets,public.ticket_payloads TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.storm_event_roster_revisions,public.storm_event_roster_members TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.contractor_invoices,public.invoice_line_items,public.time_entries,public.expense_reports,public.expense_items TO authenticated;
GRANT SELECT ON TABLE public.contractor_rates,public.contractor_banking TO authenticated;
-- The existing verified-user profile API uses the server-only service role.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.profiles TO service_role;
CREATE POLICY profiles_update_super_admin ON public.profiles FOR UPDATE TO authenticated
USING(public.is_super_admin()) WITH CHECK(public.is_super_admin());
NOTIFY pgrst,'reload schema';
COMMIT;