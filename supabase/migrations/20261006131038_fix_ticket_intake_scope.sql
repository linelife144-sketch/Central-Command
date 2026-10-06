-- INSERT ... RETURNING checks SELECT policies before a row can be looked up by a STABLE helper.
-- Compare the new row's scope directly; linked-record helpers remain useful for dependent tables.
DROP POLICY ticket_team_scope ON public.tickets;
CREATE POLICY ticket_team_scope ON public.tickets AS RESTRICTIVE FOR SELECT TO authenticated USING (
 NOT coalesce(is_deleted,false) AND private.contractor_portal_ready() AND (
  private.active_profile_role() IN ('CEO','SUPER_ADMIN') AND private.has_permission((SELECT auth.uid()),'admin.tickets.view') OR
  private.active_profile_role()='ADMIN' AND team_lead_id=(SELECT auth.uid()) AND private.has_permission((SELECT auth.uid()),'admin.tickets.view') OR
  private.active_profile_role()='CONTRACTOR' AND EXISTS(SELECT 1 FROM public.contractors c WHERE c.profile_id=(SELECT auth.uid()) AND NOT coalesce(c.is_deleted,false) AND c.id IN(assigned_to,assigned_driver_id))
 )
);
NOTIFY pgrst,'reload schema';
