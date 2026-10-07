-- Tickets are retained for audit and assessment history. Staff can only hide
-- or restore them through this permission-checked, server-audited RPC.
CREATE OR REPLACE FUNCTION public.set_ticket_disabled(p_ticket_id uuid, p_disabled boolean)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor uuid := (SELECT auth.uid());
  actor_role text := private.active_profile_role();
  current_ticket public.tickets%ROWTYPE;
  updated_ticket public.tickets%ROWTYPE;
BEGIN
  IF actor IS NULL
     OR actor_role NOT IN ('ADMIN', 'CEO', 'SUPER_ADMIN')
     OR NOT private.has_permission(actor, 'admin.tickets.edit') THEN
    RAISE EXCEPTION 'Ticket edit permission required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO current_ticket
  FROM public.tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(current_ticket.is_deleted, false) = p_disabled THEN
    RETURN current_ticket;
  END IF;

  UPDATE public.tickets
  SET is_deleted = p_disabled,
      deleted_at = CASE WHEN p_disabled THEN pg_catalog.now() ELSE NULL END,
      deleted_by = CASE WHEN p_disabled THEN actor ELSE NULL END,
      updated_at = pg_catalog.now(),
      updated_by = actor
  WHERE id = p_ticket_id
  RETURNING * INTO updated_ticket;

  INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, user_role, old_values, new_values, change_summary)
  VALUES (
    CASE WHEN p_disabled THEN 'TICKET_DISABLED' ELSE 'TICKET_RESTORED' END,
    'ticket',
    p_ticket_id,
    actor,
    actor_role::public.user_role,
    jsonb_build_object(
      'is_deleted', COALESCE(current_ticket.is_deleted, false),
      'deleted_at', current_ticket.deleted_at,
      'deleted_by', current_ticket.deleted_by
    ),
    jsonb_build_object(
      'is_deleted', updated_ticket.is_deleted,
      'deleted_at', updated_ticket.deleted_at,
      'deleted_by', updated_ticket.deleted_by
    ),
    CASE WHEN p_disabled
      THEN 'Ticket disabled from active lists; ticket and assessment history retained'
      ELSE 'Ticket restored to the active list'
    END
  );

  RETURN updated_ticket;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_ticket_disabled(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ticket_disabled(uuid, boolean) TO authenticated;
