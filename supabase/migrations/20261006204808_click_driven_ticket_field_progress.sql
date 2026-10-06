-- Field-stage progress is driven by contractor actions. GPS remains mandatory
-- for photo evidence and time tracking, but is not part of these transitions.

CREATE OR REPLACE FUNCTION private.update_ticket_field_status(
  p_ticket_id uuid,
  p_status text,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy numeric
) RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'GPS-based field status updates are retired. Use record_ticket_field_action.'
    USING ERRCODE = '0A000';
END;
$$;

-- The old public wrapper remains only so stale generated clients receive a
-- clear permission error instead of silently applying GPS-based progress.
REVOKE ALL ON FUNCTION public.update_ticket_field_status(uuid, text, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.update_ticket_field_status(uuid, text, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.record_ticket_field_action(
  p_ticket_id uuid,
  p_action text
) RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket public.tickets;
  v_contractor_id uuid;
  v_action text := upper(btrim(coalesce(p_action, '')));
  v_next_status public.ticket_status;
  v_reason text;
BEGIN
  IF private.active_profile_role() IS DISTINCT FROM 'CONTRACTOR'
     OR NOT private.can_access_ticket(p_ticket_id) THEN
    RAISE EXCEPTION 'Assigned contractor access is required for field progress.'
      USING ERRCODE = '42501';
  END IF;

  SELECT c.id INTO v_contractor_id
  FROM public.contractors AS c
  WHERE c.profile_id = (SELECT auth.uid())
    AND NOT coalesce(c.is_deleted, false);

  IF v_contractor_id IS NULL THEN
    RAISE EXCEPTION 'An active contractor account is required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT t.* INTO v_ticket
  FROM public.tickets AS t
  WHERE t.id = p_ticket_id
    AND NOT coalesce(t.is_deleted, false)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assigned ticket is unavailable.'
      USING ERRCODE = '42501';
  END IF;

  IF v_ticket.team_lead_id IS NULL
     OR v_ticket.crew_id IS NULL
     OR v_ticket.assigned_to IS NULL
     OR v_ticket.assigned_driver_id IS NULL
     OR v_ticket.storm_event_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.field_crews AS crew
       WHERE crew.id = v_ticket.crew_id
         AND crew.is_active
         AND crew.storm_event_id = v_ticket.storm_event_id
         AND crew.team_lead_id = v_ticket.team_lead_id
         AND crew.driver_id = v_ticket.assigned_driver_id
         AND crew.assessor_id = v_ticket.assigned_to
     ) THEN
    RAISE EXCEPTION 'A matching active dispatched crew is required before field progress.'
      USING ERRCODE = '42501';
  END IF;

  IF v_action = 'START' THEN
    IF v_contractor_id NOT IN (v_ticket.assigned_to, v_ticket.assigned_driver_id) THEN
      RAISE EXCEPTION 'Only the assigned driver or assessor can start this ticket.'
        USING ERRCODE = '42501';
    END IF;

    IF v_ticket.status = 'ASSIGNED' THEN
      v_next_status := 'IN_ROUTE';
      v_reason := 'Contractor selected Start';
    ELSIF v_ticket.status::text IN ('IN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETE', 'NEEDS_REWORK', 'PENDING_REVIEW', 'APPROVED', 'CLOSED', 'ARCHIVED', 'EXPIRED') THEN
      RETURN v_ticket;
    ELSE
      RAISE EXCEPTION 'This ticket cannot be started from its current status.'
        USING ERRCODE = '23514';
    END IF;
  ELSIF v_action = 'OPEN_CHECKLIST' THEN
    IF v_contractor_id <> v_ticket.assigned_to OR NOT private.can_assess_ticket(p_ticket_id) THEN
      RAISE EXCEPTION 'Only the assigned assessor can open this field checklist.'
        USING ERRCODE = '42501';
    END IF;

    IF v_ticket.status = 'IN_ROUTE' THEN
      v_next_status := 'ON_SITE';
      v_reason := 'Contractor opened field checklist';
    ELSIF v_ticket.status::text IN ('ON_SITE', 'IN_PROGRESS', 'COMPLETE', 'NEEDS_REWORK') THEN
      RETURN v_ticket;
    ELSIF v_ticket.status = 'ASSIGNED' THEN
      RAISE EXCEPTION 'Start the ticket before opening its field checklist.'
        USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'This ticket cannot open a field checklist from its current status.'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'Action must be START or OPEN_CHECKLIST.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.tickets AS t
  SET status = v_next_status,
      updated_by = (SELECT auth.uid())
  WHERE t.id = v_ticket.id
  RETURNING t.* INTO v_ticket;

  -- The status trigger writes one actor/timestamp row. Attach the explicit
  -- user action and keep the GPS evidence columns untouched and NULL.
  UPDATE public.ticket_status_history AS history
  SET change_reason = v_reason
  WHERE history.id = (
    SELECT latest.id
    FROM public.ticket_status_history AS latest
    WHERE latest.ticket_id = v_ticket.id
      AND latest.changed_by = (SELECT auth.uid())
      AND latest.from_status::text = (CASE WHEN v_action = 'START' THEN 'ASSIGNED' ELSE 'IN_ROUTE' END)
      AND latest.to_status::text = v_next_status::text
      AND latest.changed_at = now()
    ORDER BY latest.id DESC
    LIMIT 1
  );

  RETURN v_ticket;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_ticket_field_action(
  p_ticket_id uuid,
  p_action text
) RETURNS public.tickets
LANGUAGE sql
SET search_path = ''
AS $$
  SELECT private.record_ticket_field_action(p_ticket_id, p_action);
$$;

REVOKE ALL ON FUNCTION private.record_ticket_field_action(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.record_ticket_field_action(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.record_ticket_field_action(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ticket_field_action(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
