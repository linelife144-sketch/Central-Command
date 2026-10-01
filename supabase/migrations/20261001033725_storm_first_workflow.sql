-- Storm-first operating scope. Existing UUID links are preserved; event_code is
-- the unique immutable business key. All functions use the caller's RLS context.
BEGIN;
ALTER TABLE public.ticket_templates ADD COLUMN IF NOT EXISTS default_values jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payload_version integer NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS storm_event_code_case_unique ON public.storm_events (upper(btrim(event_code)));
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_ticket_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS tickets_number_per_storm ON public.tickets(storm_event_id,ticket_number);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_require_storm CHECK (storm_event_id IS NOT NULL) NOT VALID;

CREATE OR REPLACE FUNCTION public.freeze_storm_utility_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.utility_client IS DISTINCT FROM OLD.utility_client OR NEW.ticket_template_key IS DISTINCT FROM OLD.ticket_template_key THEN
    RAISE EXCEPTION 'A storm utility and ticket template cannot change after creation';
  END IF;
  IF OLD.config_snapshot ? 'field_definitions' AND NEW.config_snapshot IS DISTINCT FROM OLD.config_snapshot THEN
    RAISE EXCEPTION 'Storm utility configuration is frozen; create a new storm for different rules';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER storm_freeze_utility_context BEFORE UPDATE ON public.storm_events
FOR EACH ROW EXECUTE FUNCTION public.freeze_storm_utility_context();

CREATE OR REPLACE FUNCTION public.set_storm_event_ticket_template_key() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE config public.ticket_templates%ROWTYPE;
BEGIN
  SELECT * INTO config FROM public.ticket_templates WHERE utility_client=NEW.utility_client AND is_active
    AND ((NEW.ticket_template_key IS NULL AND is_default) OR template_key=NEW.ticket_template_key) LIMIT 1;
  IF NOT FOUND OR jsonb_array_length(config.field_definitions)=0 THEN RAISE EXCEPTION 'No configured ticket form for utility %',NEW.utility_client; END IF;
  NEW.ticket_template_key:=config.template_key;
  IF TG_OP='INSERT' THEN
    NEW.config_snapshot:=jsonb_build_object('utility_client',NEW.utility_client,'ticket_template_key',config.template_key,
      'field_definitions',config.field_definitions,'default_values',config.default_values,'payload_version',config.payload_version);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.validate_storm_ticket_payload(p_storm_id uuid,p_payload jsonb) RETURNS void LANGUAGE plpgsql AS $$
DECLARE fields jsonb; field jsonb; value jsonb; key text;
BEGIN
  SELECT config_snapshot->'field_definitions' INTO fields FROM public.storm_events WHERE id=p_storm_id AND NOT is_deleted;
  IF fields IS NULL OR jsonb_typeof(fields)<>'array' OR jsonb_array_length(fields)=0 THEN RAISE EXCEPTION 'Create a configured storm event first'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Ticket payload must be an object'; END IF;
  FOR key IN SELECT jsonb_object_keys(p_payload) LOOP
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(fields) f WHERE f->>'fieldKey'=key) THEN RAISE EXCEPTION 'Field % is not allowed by this utility',key; END IF;
  END LOOP;
  FOR field IN SELECT * FROM jsonb_array_elements(fields) LOOP
    key:=field->>'fieldKey'; value:=p_payload->key;
    IF (field->>'required')::boolean AND (value IS NULL OR value='null'::jsonb OR btrim(value#>>'{}')='') THEN RAISE EXCEPTION 'Utility field % is required',key; END IF;
    IF value IS NULL OR value='null'::jsonb OR value='""'::jsonb THEN CONTINUE; END IF;
    IF field->>'controlType'='number' THEN
      IF jsonb_typeof(value)<>'number' OR (value#>>'{}')::numeric<0 OR trunc((value#>>'{}')::numeric)<>(value#>>'{}')::numeric THEN RAISE EXCEPTION 'Field % must be a nonnegative integer',key; END IF;
    ELSIF field->>'controlType'='toggle' THEN
      IF jsonb_typeof(value)<>'boolean' THEN RAISE EXCEPTION 'Field % must be boolean',key; END IF;
    ELSE
      IF jsonb_typeof(value)<>'string' THEN RAISE EXCEPTION 'Field % must be text',key; END IF;
    END IF;
    IF field ? 'enumValues' AND NOT (field->'enumValues' ? (value#>>'{}')) THEN RAISE EXCEPTION 'Value for % is not allowed by this utility',key; END IF;
    IF field->'formattingRules'->'regex'->>'pattern' IS NOT NULL AND NOT ((value#>>'{}') ~ (field->'formattingRules'->'regex'->>'pattern')) THEN RAISE EXCEPTION 'Field % does not match the utility format',key; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_storm_payload() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE storm_id uuid;
BEGIN
  SELECT storm_event_id INTO storm_id FROM public.tickets WHERE id=NEW.ticket_id;
  PERFORM public.validate_storm_ticket_payload(storm_id,NEW.payload);
  RETURN NEW;
END $$;
CREATE TRIGGER ticket_payload_utility_rules BEFORE INSERT OR UPDATE ON public.ticket_payloads
FOR EACH ROW EXECUTE FUNCTION public.enforce_storm_payload();

CREATE OR REPLACE FUNCTION public.prevent_ticket_storm_move() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.storm_event_id IS NOT NULL AND NEW.storm_event_id IS DISTINCT FROM OLD.storm_event_id THEN RAISE EXCEPTION 'A ticket cannot be moved between storm events'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ticket_storm_immutable BEFORE UPDATE OF storm_event_id ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.prevent_ticket_storm_move();

-- Atomic ticket + utility payload creation. No account elevation or definer privileges.
CREATE OR REPLACE FUNCTION public.create_storm_ticket(p_storm_id uuid,p_common jsonb,p_payload jsonb,p_confidence jsonb DEFAULT '{}',p_warnings text[] DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE storm public.storm_events%ROWTYPE; ticket_id uuid; number text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role::text IN ('CEO','SUPER_ADMIN')) THEN RAISE EXCEPTION 'Only authorized users can create tickets'; END IF;
  SELECT * INTO storm FROM public.storm_events WHERE id=p_storm_id AND NOT is_deleted FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Create or select a storm first'; END IF;
  PERFORM public.validate_storm_ticket_payload(p_storm_id,p_payload);
  number:=CASE WHEN storm.utility_client='ENTERGY' THEN p_payload->>'incident_number' ELSE p_payload->>'external_ticket_id' END;
  IF coalesce(btrim(number),'')='' THEN RAISE EXCEPTION 'Utility ticket number is required'; END IF;
  INSERT INTO public.tickets(storm_event_id,ticket_number,utility_client,template_key,status,priority,source_type,address,work_description,created_by)
    VALUES(storm.id,number,storm.utility_client,storm.ticket_template_key,
      coalesce(p_common->>'status','DRAFT')::public.ticket_status,coalesce(p_common->>'priority','C')::public.priority_level,
      coalesce(p_common->>'source_type','MANUAL')::public.ticket_source_type,p_payload->>'address_line',storm.name||' - '||number,auth.uid()) RETURNING id INTO ticket_id;
  INSERT INTO public.ticket_payloads(ticket_id,payload,payload_version,extraction_confidence,extraction_warnings)
    VALUES(ticket_id,p_payload,coalesce((storm.config_snapshot->>'payload_version')::integer,1),p_confidence,p_warnings);
  RETURN ticket_id;
END $$;
REVOKE ALL ON FUNCTION public.create_storm_ticket(uuid,jsonb,jsonb,jsonb,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_storm_ticket(uuid,jsonb,jsonb,jsonb,text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_storm_contractors(p_storm_id uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('contractorId',c.id,'displayName',p.first_name||' '||p.last_name) ORDER BY p.last_name),'[]'::jsonb)
  FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id
  JOIN public.storm_event_roster_members m ON m.contractor_id=c.id
  JOIN public.storm_event_roster_revisions r ON r.id=m.roster_revision_id
  WHERE r.storm_event_id=p_storm_id AND m.member_status<>'REMOVED'
    AND r.revision_number=(SELECT max(revision_number) FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id);
$$;
CREATE OR REPLACE FUNCTION public.assign_contractor_to_storm(p_storm_id uuid,p_contractor_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE revision uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role::text IN ('CEO','SUPER_ADMIN')) THEN RAISE EXCEPTION 'Only authorized users can assign contractors'; END IF;
  PERFORM 1 FROM public.storm_events WHERE id=p_storm_id AND NOT is_deleted FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Create a storm first'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.contractors WHERE id=p_contractor_id AND onboarding_status::text='APPROVED' AND is_eligible_for_assignment) THEN RAISE EXCEPTION 'Select an approved, eligible contractor'; END IF;
  SELECT id INTO revision FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id AND NOT is_locked ORDER BY revision_number DESC LIMIT 1;
  IF revision IS NULL THEN
    IF EXISTS(SELECT 1 FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id) THEN RAISE EXCEPTION 'The storm roster is locked. Create an unlocked roster revision first'; END IF;
    INSERT INTO public.storm_event_roster_revisions(storm_event_id,revision_number,revision_label,created_by) VALUES(p_storm_id,0,'Initial roster',auth.uid()) RETURNING id INTO revision;
  END IF;
  IF EXISTS(SELECT 1 FROM public.storm_event_roster_members WHERE roster_revision_id=revision AND contractor_id=p_contractor_id AND member_status<>'REMOVED') THEN RETURN; END IF;
  INSERT INTO public.storm_event_roster_members(roster_revision_id,contractor_id,member_status,created_by) VALUES(revision,p_contractor_id,'CONFIRMED',auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.list_storm_contractors(uuid),public.assign_contractor_to_storm(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_storm_contractors(uuid),public.assign_contractor_to_storm(uuid,uuid) TO authenticated;

-- Reject invoice lines that refer to time/expenses from another storm.
CREATE OR REPLACE FUNCTION public.enforce_invoice_line_storm() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE invoice_storm uuid; source_storm uuid;
BEGIN
  SELECT storm_event_id INTO invoice_storm FROM public.contractor_invoices WHERE id=NEW.invoice_id;
  IF NEW.item_type='TIME_ENTRY' THEN SELECT storm_event_id INTO source_storm FROM public.time_entries WHERE id=NEW.reference_id;
  ELSIF NEW.item_type='EXPENSE_REPORT' THEN SELECT storm_event_id INTO source_storm FROM public.expense_reports WHERE id=NEW.reference_id;
  ELSE RAISE EXCEPTION 'Invoice line type must be TIME_ENTRY or EXPENSE_REPORT'; END IF;
  IF invoice_storm IS NULL OR source_storm IS DISTINCT FROM invoice_storm THEN RAISE EXCEPTION 'Invoice entries must belong to the same storm'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invoice_line_storm_scope BEFORE INSERT OR UPDATE ON public.invoice_line_items FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_line_storm();

CREATE OR REPLACE FUNCTION public.enforce_ticket_roster_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.storm_event_roster_members m JOIN public.storm_event_roster_revisions r ON r.id=m.roster_revision_id
    WHERE r.storm_event_id=NEW.storm_event_id AND m.contractor_id=NEW.assigned_to AND m.member_status='CONFIRMED'
      AND r.revision_number=(SELECT max(revision_number) FROM public.storm_event_roster_revisions WHERE storm_event_id=NEW.storm_event_id)
  ) THEN RAISE EXCEPTION 'Assign the contractor to this storm roster first'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ticket_assignee_storm_roster BEFORE INSERT OR UPDATE OF assigned_to,storm_event_id ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_roster_assignment();

CREATE OR REPLACE FUNCTION public.freeze_invoice_storm() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.storm_event_id IS NOT NULL AND NEW.storm_event_id IS DISTINCT FROM OLD.storm_event_id THEN RAISE EXCEPTION 'An invoice cannot move between storm events'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invoice_storm_immutable BEFORE UPDATE OF storm_event_id ON public.contractor_invoices FOR EACH ROW EXECUTE FUNCTION public.freeze_invoice_storm();

CREATE OR REPLACE FUNCTION public.enforce_expense_item_storm() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE report_storm uuid; ticket_storm uuid;
BEGIN
  SELECT storm_event_id INTO report_storm FROM public.expense_reports WHERE id=NEW.expense_report_id;
  IF NEW.ticket_id IS NOT NULL THEN
    SELECT storm_event_id INTO ticket_storm FROM public.tickets WHERE id=NEW.ticket_id;
    IF report_storm IS NULL OR ticket_storm IS DISTINCT FROM report_storm THEN RAISE EXCEPTION 'Expense tickets must belong to the report storm'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER expense_item_storm_scope BEFORE INSERT OR UPDATE OF expense_report_id,ticket_id ON public.expense_items FOR EACH ROW EXECUTE FUNCTION public.enforce_expense_item_storm();
COMMIT;
