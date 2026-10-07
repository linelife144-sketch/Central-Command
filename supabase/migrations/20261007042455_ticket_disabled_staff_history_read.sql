-- Disabled tickets remain readable to authorized staff so their detail, review
-- history, and Restore control remain available. Contractor field access remains
-- restricted to active tickets, and workflow mutations still use can_access_ticket.
CREATE OR REPLACE FUNCTION private.can_view_ticket(p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT private.contractor_portal_ready())
    AND EXISTS (
      SELECT 1
      FROM public.tickets AS t
      WHERE t.id = p_ticket_id
        AND (
          (
            private.active_profile_role() IN ('CEO', 'SUPER_ADMIN')
            AND private.has_permission((SELECT auth.uid()), 'admin.tickets.view')
          )
          OR (
            private.active_profile_role() = 'ADMIN'
            AND t.team_lead_id = (SELECT auth.uid())
            AND private.has_permission((SELECT auth.uid()), 'admin.tickets.view')
          )
          OR (
            private.active_profile_role() = 'CONTRACTOR'
            AND NOT coalesce(t.is_deleted, false)
            AND EXISTS (
              SELECT 1
              FROM public.contractors AS c
              WHERE c.profile_id = (SELECT auth.uid())
                AND NOT coalesce(c.is_deleted, false)
                AND c.id IN (t.assigned_to, t.assigned_driver_id)
            )
          )
        )
    );
$function$;

REVOKE ALL ON FUNCTION private.can_view_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_ticket(uuid) TO authenticated;

DROP POLICY ticket_team_scope ON public.tickets;
CREATE POLICY ticket_team_scope ON public.tickets
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (private.can_view_ticket(id));

DROP POLICY crew_ticket_read ON public.tickets;
CREATE POLICY crew_ticket_read ON public.tickets
  FOR SELECT TO authenticated
  USING (private.can_view_ticket(id));

DROP POLICY ticket_drafts_read ON public.ticket_assessment_drafts;
CREATE POLICY ticket_drafts_read ON public.ticket_assessment_drafts
  FOR SELECT TO authenticated
  USING (private.can_view_ticket(ticket_id));

DROP POLICY assessment_ticket_scope ON public.damage_assessments;
CREATE POLICY assessment_ticket_scope ON public.damage_assessments
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (private.can_view_ticket(ticket_id));

DROP POLICY crew_assessment_read ON public.damage_assessments;
CREATE POLICY crew_assessment_read ON public.damage_assessments
  FOR SELECT TO authenticated
  USING (private.can_view_ticket(ticket_id));

DROP POLICY crew_payload_read ON public.ticket_payloads;
CREATE POLICY crew_payload_read ON public.ticket_payloads
  FOR SELECT TO authenticated
  USING (private.can_view_ticket(ticket_id));

DROP POLICY payload_team_scope ON public.ticket_payloads;
CREATE POLICY payload_team_scope ON public.ticket_payloads
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (private.can_view_ticket(ticket_id));

DROP POLICY crew_history_read ON public.ticket_status_history;
CREATE POLICY crew_history_read ON public.ticket_status_history
  FOR SELECT TO authenticated
  USING (private.can_view_ticket(ticket_id));

DROP POLICY history_team_scope ON public.ticket_status_history;
CREATE POLICY history_team_scope ON public.ticket_status_history
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (private.can_view_ticket(ticket_id));

DO $migration$
BEGIN
  IF pg_catalog.to_regclass('public.ticket_work_notes') IS NOT NULL THEN
    EXECUTE 'DROP POLICY ticket_work_notes_read ON public.ticket_work_notes';
    EXECUTE 'CREATE POLICY ticket_work_notes_read ON public.ticket_work_notes FOR SELECT TO authenticated USING (private.can_view_ticket(ticket_id))';
  END IF;

  IF pg_catalog.to_regclass('public.ticket_entergy_forms') IS NOT NULL THEN
    EXECUTE 'DROP POLICY entergy_ticket_read ON public.ticket_entergy_forms';
    EXECUTE $policy$
      CREATE POLICY entergy_ticket_read ON public.ticket_entergy_forms
        FOR SELECT TO authenticated
        USING (
          private.can_view_ticket(ticket_id)
          AND (
            private.active_profile_role() = 'CONTRACTOR'
            OR private.has_permission((SELECT auth.uid()), 'admin.assessments.view')
          )
        )
    $policy$;
  END IF;
END;
$migration$;

DROP POLICY ticket_media_read ON public.media_assets;
CREATE POLICY ticket_media_read ON public.media_assets
  FOR SELECT TO authenticated
  USING (entity_type = 'ticket' AND private.can_view_ticket(entity_id));

DROP POLICY media_read_scope ON public.media_assets;
CREATE POLICY media_read_scope ON public.media_assets
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    (
      private.active_profile_role() = 'CONTRACTOR'
      AND (
        contractor_id IN (SELECT id FROM public.contractors WHERE profile_id = (SELECT auth.uid()))
        OR entity_type = 'ticket' AND private.can_view_ticket(entity_id)
      )
    )
    OR (
      private.active_profile_role() IN ('ADMIN', 'CEO', 'SUPER_ADMIN')
      AND entity_type = 'ticket'
      AND private.can_view_ticket(entity_id)
    )
  );

CREATE OR REPLACE FUNCTION private.ticket_photo_access(p_name text, p_write boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_ticket uuid;
  v_photo uuid;
BEGIN
  IF p_name !~ '^[0-9a-f-]{36}/tickets/[0-9a-f-]{36}/[0-9a-f-]{36}-(original|thumbnail)\.(jpg|jpeg|png|webp)$' THEN
    RETURN false;
  END IF;
  BEGIN
    v_ticket := split_part(p_name, '/', 3)::uuid;
    v_photo := left(split_part(p_name, '/', 4), 36)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  IF NOT p_write THEN
    RETURN private.can_view_ticket(v_ticket);
  END IF;
  IF NOT private.can_access_ticket(v_ticket) THEN
    RETURN false;
  END IF;
  RETURN split_part(p_name, '/', 1) = (SELECT auth.uid())::text
    AND private.can_assess_ticket(v_ticket)
    AND EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = v_ticket AND status::text IN ('ON_SITE', 'IN_PROGRESS', 'NEEDS_REWORK')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.damage_assessments AS a,
           jsonb_array_elements(a.photo_evidence) AS p
      WHERE a.ticket_id = v_ticket AND p->>'id' = v_photo::text
    );
END;
$function$;

REVOKE ALL ON FUNCTION private.ticket_photo_access(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.ticket_photo_access(text, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
