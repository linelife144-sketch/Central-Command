-- Append-only ticket notes and urgent reports. The actor comes from Auth, never the client.
CREATE TABLE public.ticket_work_notes (
 id uuid PRIMARY KEY,
 ticket_id uuid NOT NULL REFERENCES public.tickets(id),
 actor_profile_id uuid NOT NULL REFERENCES public.profiles(id),
 kind text NOT NULL CHECK(kind IN ('NOTE','ENVIRONMENTAL','PUBLIC_SAFETY')),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 4000),
 reported_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_work_notes_ticket_idx ON public.ticket_work_notes(ticket_id,created_at);
CREATE INDEX ticket_work_notes_actor_idx ON public.ticket_work_notes(actor_profile_id);
ALTER TABLE public.ticket_work_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ticket_work_notes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ticket_work_notes TO authenticated;
CREATE POLICY ticket_work_notes_read ON public.ticket_work_notes FOR SELECT TO authenticated
 USING(private.can_access_ticket(ticket_id));

CREATE FUNCTION private.record_ticket_work_note(p_id uuid,p_ticket_id uuid,p_kind text,p_body text,p_reported_at timestamptz)
 RETURNS public.ticket_work_notes LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.tickets; n public.ticket_work_notes; recipient uuid; actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT private.can_access_ticket(p_ticket_id) OR
 (private.active_profile_role()<>'CONTRACTOR' AND NOT private.has_permission(actor,'admin.tickets.edit')) THEN
 RAISE EXCEPTION 'Assigned crew or authorized ticket manager access required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_kind IS NULL OR p_kind NOT IN ('NOTE','ENVIRONMENTAL','PUBLIC_SAFETY') OR p_body IS NULL OR length(btrim(p_body)) NOT BETWEEN 1 AND 4000 OR p_reported_at IS NULL THEN
 RAISE EXCEPTION 'Choose a report type and enter 1–4000 characters' USING ERRCODE='23514'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 SELECT * INTO n FROM public.ticket_work_notes WHERE id=p_id;
 IF FOUND THEN
  IF n.ticket_id=p_ticket_id AND n.actor_profile_id=actor AND n.kind=p_kind AND n.body=btrim(p_body) AND n.reported_at=p_reported_at THEN RETURN n; END IF;
  RAISE EXCEPTION 'This note identifier belongs to another saved record' USING ERRCODE='23514';
 END IF;
 IF t.status::text IN ('PENDING_REVIEW','APPROVED','CLOSED','ARCHIVED','EXPIRED') THEN
 RAISE EXCEPTION 'This ticket is closed for field work. Contact your team lead.' USING ERRCODE='23514'; END IF;
 INSERT INTO public.ticket_work_notes(id,ticket_id,actor_profile_id,kind,body,reported_at)
 VALUES(p_id,p_ticket_id,actor,p_kind,btrim(p_body),p_reported_at) RETURNING * INTO n;
 IF p_kind<>'NOTE' THEN
  UPDATE public.tickets SET severity='CRITICAL',is_important=true,updated_by=actor WHERE id=t.id;
  FOR recipient IN SELECT id FROM public.profiles WHERE is_active AND
   (id=t.team_lead_id OR role::text IN ('CEO','SUPER_ADMIN') AND private.has_permission(id,'admin.tickets.view')) LOOP
   PERFORM private.notify_ticket_user(recipient,t.id,
    CASE p_kind WHEN 'ENVIRONMENTAL' THEN 'Environmental escalation · ' ELSE 'Public safety escalation · ' END||t.ticket_number,
    n.body,'ticket-work-note:'||n.id||':'||recipient);
  END LOOP;
 END IF;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,new_values,change_summary)
 VALUES(CASE WHEN p_kind='NOTE' THEN 'TICKET_WORK_NOTE_ADDED' ELSE 'TICKET_SAFETY_ESCALATED' END,'ticket',t.id,actor,
 private.active_profile_role()::public.user_role,jsonb_build_object('note_id',n.id,'kind',p_kind),
 CASE WHEN p_kind='NOTE' THEN 'Ticket work note added' ELSE 'Urgent ticket report saved and dispatch notified in-app' END);
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION private.record_ticket_work_note(uuid,uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.record_ticket_work_note(uuid,uuid,text,text,timestamptz) TO authenticated;
CREATE FUNCTION public.record_ticket_work_note(p_id uuid,p_ticket_id uuid,p_kind text,p_body text,p_reported_at timestamptz)
 RETURNS public.ticket_work_notes LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.record_ticket_work_note(p_id,p_ticket_id,p_kind,p_body,p_reported_at);
$$;
REVOKE ALL ON FUNCTION public.record_ticket_work_note(uuid,uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_ticket_work_note(uuid,uuid,text,text,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
