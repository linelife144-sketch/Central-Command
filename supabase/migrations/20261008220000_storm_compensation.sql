-- Storm-owned role wages and utility billing, plus storm-contractor exceptions.
-- Rates are read at clock-in and persisted on time_entries; an open shift never
-- resolves the current settings again when it is closed.
BEGIN;

CREATE TABLE public.storm_role_pay_rates (
  storm_event_id uuid NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  role public.contractor_role NOT NULL,
  hourly_rate numeric(12,2) NOT NULL CHECK(hourly_rate >= 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by uuid REFERENCES public.profiles(id),
  PRIMARY KEY(storm_event_id, role)
);
ALTER TABLE public.storm_role_pay_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storm_role_pay_rates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storm_role_pay_rates TO authenticated;
GRANT ALL ON public.storm_role_pay_rates TO service_role;
CREATE POLICY storm_role_pay_rates_read ON public.storm_role_pay_rates FOR SELECT TO authenticated
  USING(private.has_permission((SELECT auth.uid()),'admin.payroll.view'));
CREATE POLICY storm_role_pay_rates_insert ON public.storm_role_pay_rates FOR INSERT TO authenticated
  WITH CHECK(private.has_permission((SELECT auth.uid()),'admin.payroll.edit'));
CREATE POLICY storm_role_pay_rates_update ON public.storm_role_pay_rates FOR UPDATE TO authenticated
  USING(private.has_permission((SELECT auth.uid()),'admin.payroll.edit'))
  WITH CHECK(private.has_permission((SELECT auth.uid()),'admin.payroll.edit'));
CREATE POLICY storm_role_pay_rates_delete ON public.storm_role_pay_rates FOR DELETE TO authenticated
  USING(private.has_permission((SELECT auth.uid()),'admin.payroll.edit'));

CREATE TABLE public.storm_contractor_compensation (
  storm_event_id uuid NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id),
  pay_rate_override numeric(12,2) CHECK(pay_rate_override IS NULL OR pay_rate_override >= 0),
  vehicle_hourly_rate numeric(12,2) CHECK(vehicle_hourly_rate IS NULL OR vehicle_hourly_rate >= 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by uuid REFERENCES public.profiles(id),
  PRIMARY KEY(storm_event_id, contractor_id)
);
ALTER TABLE public.storm_contractor_compensation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storm_contractor_compensation FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storm_contractor_compensation TO authenticated;
GRANT ALL ON public.storm_contractor_compensation TO service_role;
CREATE POLICY storm_contractor_compensation_read ON public.storm_contractor_compensation FOR SELECT TO authenticated
  USING(private.has_permission((SELECT auth.uid()),'admin.payroll.view'));
CREATE POLICY storm_contractor_compensation_insert ON public.storm_contractor_compensation FOR INSERT TO authenticated
  WITH CHECK(private.has_permission((SELECT auth.uid()),'admin.payroll.edit'));
CREATE POLICY storm_contractor_compensation_update ON public.storm_contractor_compensation FOR UPDATE TO authenticated
  USING(private.has_permission((SELECT auth.uid()),'admin.payroll.edit'))
  WITH CHECK(private.has_permission((SELECT auth.uid()),'admin.payroll.edit'));
CREATE POLICY storm_contractor_compensation_delete ON public.storm_contractor_compensation FOR DELETE TO authenticated
  USING(private.has_permission((SELECT auth.uid()),'admin.payroll.edit'));

ALTER TABLE public.time_entries ADD COLUMN vehicle_hourly_rate_applied numeric(12,2);
-- Preserve the rate held by any shift that was open at deployment. Its stored
-- wage and bill snapshots already exist; only the new vehicle snapshot needs
-- a one-time fill from the agreement active when that shift started.
UPDATE public.time_entries t SET vehicle_hourly_rate_applied=(
 SELECT CASE WHEN a.terms->>'role'='DRIVER' AND (a.terms->>'driver_eligible')::boolean AND (a.terms->>'vehicle_allowance_enabled')::boolean
   THEN (a.terms->>'vehicle_hourly_rate')::numeric ELSE NULL END
 FROM public.contractor_pay_agreements a WHERE a.contractor_id=t.contractor_id AND a.effective_from<=t.clock_in_at
 ORDER BY a.effective_from DESC LIMIT 1)
WHERE t.clock_out_at IS NULL AND t.calculation_version='AGREEMENT';

CREATE FUNCTION private.guard_storm_compensation_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_storm uuid; storm_status text; target_contractor uuid; actor uuid:=auth.uid(); actor_role text;
BEGIN
 target_storm:=CASE WHEN TG_OP='DELETE' THEN OLD.storm_event_id ELSE NEW.storm_event_id END;
 SELECT status INTO storm_status FROM public.storm_events WHERE id=target_storm FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Storm event not found' USING ERRCODE='23503'; END IF;
 IF storm_status='CLOSED' THEN RAISE EXCEPTION 'Closed storm compensation cannot be changed' USING ERRCODE='23514'; END IF;
 IF NOT private.has_permission(auth.uid(),'admin.payroll.edit') THEN
  RAISE EXCEPTION 'Storm payroll editing required' USING ERRCODE='42501';
 END IF;
 IF TG_OP='UPDATE' THEN
  IF TG_TABLE_NAME='storm_role_pay_rates' AND ROW(NEW.storm_event_id,NEW.role) IS DISTINCT FROM ROW(OLD.storm_event_id,OLD.role) THEN
   RAISE EXCEPTION 'Storm role wage keys are immutable; save the complete rate card' USING ERRCODE='23514';
  ELSIF TG_TABLE_NAME='storm_contractor_compensation' AND ROW(NEW.storm_event_id,NEW.contractor_id) IS DISTINCT FROM ROW(OLD.storm_event_id,OLD.contractor_id) THEN
   RAISE EXCEPTION 'Storm contractor compensation keys are immutable' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_TABLE_NAME='storm_contractor_compensation' AND TG_OP<>'DELETE' THEN
  IF NEW.pay_rate_override IS NOT NULL AND NEW.pay_rate_override<0 THEN
   RAISE EXCEPTION 'Pay override must be nonnegative' USING ERRCODE='23514';
  END IF;
  IF NEW.vehicle_hourly_rate IS NOT NULL AND NEW.vehicle_hourly_rate<0 THEN
   RAISE EXCEPTION 'Vehicle allowance must be nonnegative' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.contractors WHERE id=NEW.contractor_id AND role='DRIVER') AND NEW.vehicle_hourly_rate IS NOT NULL THEN
   RAISE EXCEPTION 'Only Drivers can receive a vehicle allowance' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM public.contractors WHERE id=NEW.contractor_id AND role='DRIVER') AND NEW.vehicle_hourly_rate IS NULL THEN
   RAISE EXCEPTION 'Every Driver requires a storm hourly vehicle allowance' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.storm_event_roster_members m JOIN public.storm_event_roster_revisions r ON r.id=m.roster_revision_id
   WHERE r.storm_event_id=NEW.storm_event_id AND m.contractor_id=NEW.contractor_id AND m.member_status='CONFIRMED'
    AND r.revision_number=(SELECT max(revision_number) FROM public.storm_event_roster_revisions WHERE storm_event_id=NEW.storm_event_id)) THEN
   RAISE EXCEPTION 'Storm contractor compensation requires a confirmed roster assignment' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_TABLE_NAME='storm_contractor_compensation' AND TG_OP='DELETE' THEN
  IF EXISTS(
   SELECT 1 FROM public.contractors c JOIN public.storm_event_roster_members m ON m.contractor_id=c.id
   JOIN public.storm_event_roster_revisions r ON r.id=m.roster_revision_id
   WHERE c.id=OLD.contractor_id AND c.role='DRIVER' AND m.member_status='CONFIRMED' AND r.storm_event_id=OLD.storm_event_id
    AND r.revision_number=(SELECT max(revision_number) FROM public.storm_event_roster_revisions WHERE storm_event_id=OLD.storm_event_id)
  ) THEN
   RAISE EXCEPTION 'Remove the Driver from the current storm roster before deleting the allowance' USING ERRCODE='23514';
  END IF;
 END IF;
 SELECT role::text INTO actor_role FROM public.profiles WHERE id=actor;
 IF TG_OP='DELETE' THEN
  IF TG_TABLE_NAME='storm_contractor_compensation' THEN
   target_contractor:=OLD.contractor_id;
   INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,change_summary)
    VALUES('STORM_CONTRACTOR_COMPENSATION_DELETED','contractor',target_contractor,actor,actor_role::public.user_role,to_jsonb(OLD),'Storm contractor compensation deleted');
  ELSE
   INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,change_summary)
    VALUES('STORM_ROLE_PAY_RATE_DELETED','storm_event',OLD.storm_event_id,actor,actor_role::public.user_role,to_jsonb(OLD),'Storm role wage rate deleted');
  END IF;
  RETURN OLD;
 END IF;
 NEW.updated_at:=clock_timestamp(); NEW.updated_by:=actor;
 IF TG_TABLE_NAME='storm_contractor_compensation' THEN
  target_contractor:=NEW.contractor_id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
   VALUES('STORM_CONTRACTOR_COMPENSATION_SAVED','contractor',target_contractor,actor,actor_role::public.user_role,
    CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW),'Storm-specific contractor compensation saved');
 ELSE
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
   VALUES('STORM_ROLE_PAY_RATE_SAVED','storm_event',NEW.storm_event_id,actor,actor_role::public.user_role,
    CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW),'Storm role wage rate saved');
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_storm_compensation_row() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER storm_role_pay_rate_guard BEFORE INSERT OR UPDATE OR DELETE ON public.storm_role_pay_rates
 FOR EACH ROW EXECUTE FUNCTION private.guard_storm_compensation_row();
CREATE TRIGGER storm_contractor_compensation_guard BEFORE INSERT OR UPDATE OR DELETE ON public.storm_contractor_compensation
 FOR EACH ROW EXECUTE FUNCTION private.guard_storm_compensation_row();

CREATE FUNCTION private.guard_storm_bill_rate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_storm uuid; storm_status text; actor uuid:=auth.uid(); actor_role text;
BEGIN
 IF (TG_OP='INSERT' AND NEW.role IS NULL) OR (TG_OP='DELETE' AND OLD.role IS NULL)
   OR (TG_OP='UPDATE' AND OLD.role IS NULL AND NEW.role IS NULL) THEN
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.storm_event_id,NEW.role,NEW.work_type) IS DISTINCT FROM ROW(OLD.storm_event_id,OLD.role,OLD.work_type) THEN
  RAISE EXCEPTION 'Storm bill rate keys are immutable; save the complete rate card' USING ERRCODE='23514';
 END IF;
 target_storm:=CASE WHEN TG_OP='DELETE' THEN OLD.storm_event_id ELSE NEW.storm_event_id END;
 IF target_storm IS NULL THEN RAISE EXCEPTION 'Role bill rates must belong to a storm' USING ERRCODE='23514'; END IF;
 IF NOT private.has_permission(actor,'admin.payroll.edit') THEN
  RAISE EXCEPTION 'Storm payroll editing required' USING ERRCODE='42501';
 END IF;
 SELECT status INTO storm_status FROM public.storm_events WHERE id=target_storm FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Storm event not found' USING ERRCODE='23503'; END IF;
 IF storm_status='CLOSED' THEN RAISE EXCEPTION 'Closed storm compensation cannot be changed' USING ERRCODE='23514'; END IF;
 IF TG_OP<>'DELETE' AND (NEW.hourly_rate<0 OR NEW.hourly_rate>9999999999.99 OR round(NEW.hourly_rate,2)<>NEW.hourly_rate) THEN
  RAISE EXCEPTION 'Storm bill rate must be nonnegative with cent precision' USING ERRCODE='23514';
 END IF;
 SELECT role::text INTO actor_role FROM public.profiles WHERE id=actor;
 IF TG_OP<>'DELETE' THEN NEW.updated_at:=clock_timestamp(); NEW.updated_by:=actor; END IF;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
  VALUES('STORM_ROLE_BILL_RATE_SAVED','storm_event',target_storm,actor,actor_role::public.user_role,
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,
   CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END,'Storm role utility bill rate saved');
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_storm_bill_rate() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER storm_bill_rate_guard BEFORE INSERT OR UPDATE OR DELETE ON public.utility_billing_rates
 FOR EACH ROW EXECUTE FUNCTION private.guard_storm_bill_rate();
CREATE POLICY storm_role_bill_rates_read ON public.utility_billing_rates FOR SELECT TO authenticated
 USING(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission((SELECT auth.uid()),'admin.payroll.view'));
CREATE POLICY storm_role_bill_rates_insert ON public.utility_billing_rates FOR INSERT TO authenticated
 WITH CHECK(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission((SELECT auth.uid()),'admin.payroll.edit'));
CREATE POLICY storm_role_bill_rates_update ON public.utility_billing_rates FOR UPDATE TO authenticated
 USING(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission((SELECT auth.uid()),'admin.payroll.edit'))
 WITH CHECK(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission((SELECT auth.uid()),'admin.payroll.edit'));
CREATE POLICY storm_role_bill_rates_delete ON public.utility_billing_rates FOR DELETE TO authenticated
 USING(storm_event_id IS NOT NULL AND role IS NOT NULL AND private.has_permission((SELECT auth.uid()),'admin.payroll.edit'));

CREATE FUNCTION private.validate_storm_role_rates(p_role_rates jsonb) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE item jsonb; seen text[]:='{}'; pay numeric; bill numeric;
BEGIN
 IF jsonb_typeof(p_role_rates) IS DISTINCT FROM 'array' OR jsonb_array_length(p_role_rates)<>5 THEN
  RAISE EXCEPTION 'Exactly five role rates are required' USING ERRCODE='23514';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_role_rates) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' OR jsonb_typeof(item->'role') IS DISTINCT FROM 'string'
    OR item->>'role' NOT IN ('STORM_MANAGER','TEAM_LEAD','SR_DAMAGE_ASSESSER','DAMAGE_ASSESSER','DRIVER')
    OR jsonb_typeof(item->'pay_rate') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'bill_rate') IS DISTINCT FROM 'number' THEN
   RAISE EXCEPTION 'Each role needs a numeric pay rate and bill rate' USING ERRCODE='23514';
  END IF;
  pay:=(item->>'pay_rate')::numeric; bill:=(item->>'bill_rate')::numeric;
  IF pay NOT BETWEEN 0 AND 9999999999.99 OR bill NOT BETWEEN 0 AND 9999999999.99
    OR round(pay,2)<>pay OR round(bill,2)<>bill THEN
   RAISE EXCEPTION 'Rates must be nonnegative amounts with cent precision' USING ERRCODE='23514';
  END IF;
  IF item->>'role'=ANY(seen) THEN RAISE EXCEPTION 'Role rates cannot be duplicated' USING ERRCODE='23514'; END IF;
  seen:=array_append(seen,item->>'role');
 END LOOP;
 IF cardinality(seen)<>5 THEN RAISE EXCEPTION 'All five roles require rates' USING ERRCODE='23514'; END IF;
END $$;
REVOKE ALL ON FUNCTION private.validate_storm_role_rates(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.validate_storm_role_rates(jsonb) TO authenticated,service_role;

-- The complete five-role card is a database invariant, not only an RPC/UI
-- convention. Deferred checks permit the atomic creation/edit functions to
-- replace all ten wage and bill rows in one transaction, but reject partial
-- direct table writes or storms created without a complete card.
CREATE FUNCTION private.assert_storm_compensation_rate_card() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_storm uuid; pay_count integer; bill_count integer;
BEGIN
 IF TG_TABLE_NAME='storm_events' THEN
  target_storm:=NEW.id;
 ELSE
  IF TG_TABLE_NAME='utility_billing_rates' THEN
   IF (TG_OP='DELETE' AND OLD.role IS NULL) OR (TG_OP<>'DELETE' AND NEW.role IS NULL) THEN RETURN NULL; END IF;
  END IF;
  target_storm:=CASE WHEN TG_OP='DELETE' THEN OLD.storm_event_id ELSE NEW.storm_event_id END;
 END IF;
 IF target_storm IS NULL OR NOT EXISTS(SELECT 1 FROM public.storm_events WHERE id=target_storm) THEN RETURN NULL; END IF;
 SELECT count(DISTINCT role)::integer INTO pay_count FROM public.storm_role_pay_rates WHERE storm_event_id=target_storm;
 SELECT count(DISTINCT role)::integer INTO bill_count FROM public.utility_billing_rates WHERE storm_event_id=target_storm AND role IS NOT NULL AND work_type IS NULL;
 IF pay_count<>5 OR bill_count<>5 THEN
  RAISE EXCEPTION 'Every storm must retain all five pay and bill roles' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.assert_storm_compensation_rate_card() FROM PUBLIC,anon,authenticated;
CREATE CONSTRAINT TRIGGER storm_event_compensation_card_required AFTER INSERT ON public.storm_events
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.assert_storm_compensation_rate_card();
CREATE CONSTRAINT TRIGGER storm_role_pay_rate_card_complete AFTER INSERT OR UPDATE OR DELETE ON public.storm_role_pay_rates
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.assert_storm_compensation_rate_card();
CREATE CONSTRAINT TRIGGER storm_bill_rate_card_complete AFTER INSERT OR UPDATE OR DELETE ON public.utility_billing_rates
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.assert_storm_compensation_rate_card();

CREATE FUNCTION public.create_storm_event_with_rates(p_event jsonb,p_role_rates jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); event_row public.storm_events; item jsonb; initial_status text;
BEGIN
 IF actor IS NULL OR NOT private.has_permission(actor,'admin.storms.edit') OR NOT private.has_permission(actor,'admin.payroll.view') OR NOT private.has_permission(actor,'admin.payroll.edit') THEN
  RAISE EXCEPTION 'Storm and payroll editing permissions are required' USING ERRCODE='42501';
 END IF;
 PERFORM private.validate_storm_role_rates(p_role_rates);
 IF jsonb_typeof(p_event) IS DISTINCT FROM 'object' OR nullif(btrim(p_event->>'event_code'),'') IS NULL
   OR nullif(btrim(p_event->>'name'),'') IS NULL OR nullif(btrim(p_event->>'utility_client'),'') IS NULL THEN
  RAISE EXCEPTION 'Storm code, name, and utility are required' USING ERRCODE='23514';
 END IF;
 initial_status:=coalesce(nullif(p_event->>'status',''),'MOB');
 IF initial_status NOT IN ('MOB','ACTIVE','DE-MOB','RELEASED','BILLING','CLOSED') THEN
  RAISE EXCEPTION 'Invalid storm status' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.storm_events(event_code,name,utility_client,status,region,contract_reference,start_date,end_date,notes,created_by,updated_by)
 VALUES(upper(btrim(p_event->>'event_code')),btrim(p_event->>'name'),upper(btrim(p_event->>'utility_client')),
   CASE WHEN initial_status='CLOSED' THEN 'MOB' ELSE initial_status END,
   nullif(btrim(p_event->>'region'),''),nullif(btrim(p_event->>'contract_reference'),''),
   nullif(p_event->>'start_date','')::date,nullif(p_event->>'end_date','')::date,nullif(p_event->>'notes',''),actor,actor)
 RETURNING * INTO event_row;
 FOR item IN SELECT value FROM jsonb_array_elements(p_role_rates) LOOP
  INSERT INTO public.storm_role_pay_rates(storm_event_id,role,hourly_rate,updated_by)
   VALUES(event_row.id,(item->>'role')::public.contractor_role,(item->>'pay_rate')::numeric,actor);
  INSERT INTO public.utility_billing_rates(storm_event_id,role,work_type,hourly_rate,currency,updated_by)
   VALUES(event_row.id,(item->>'role')::public.contractor_role,NULL,(item->>'bill_rate')::numeric,'USD',actor);
 END LOOP;
 IF initial_status='CLOSED' THEN UPDATE public.storm_events SET status='CLOSED' WHERE id=event_row.id RETURNING * INTO event_row; END IF;
 RETURN to_jsonb(event_row);
END $$;
REVOKE ALL ON FUNCTION public.create_storm_event_with_rates(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_storm_event_with_rates(jsonb,jsonb) TO authenticated;

CREATE FUNCTION public.get_storm_compensation_rates(p_storm_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT private.has_permission(auth.uid(),'admin.payroll.view') THEN RAISE EXCEPTION 'Payroll view permission required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT jsonb_agg(jsonb_build_object('role',roles.role,'pay_rate',pay.hourly_rate,'bill_rate',bill.hourly_rate) ORDER BY roles.ordinal)
  FROM (VALUES ('STORM_MANAGER'::public.contractor_role,1),('TEAM_LEAD',2),('SR_DAMAGE_ASSESSER',3),('DAMAGE_ASSESSER',4),('DRIVER',5)) roles(role,ordinal)
  LEFT JOIN public.storm_role_pay_rates pay ON pay.storm_event_id=p_storm_id AND pay.role=roles.role
  LEFT JOIN public.utility_billing_rates bill ON bill.storm_event_id=p_storm_id AND bill.role=roles.role);
END $$;
REVOKE ALL ON FUNCTION public.get_storm_compensation_rates(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_storm_compensation_rates(uuid) TO authenticated;

CREATE FUNCTION public.save_storm_compensation_rates(p_storm_id uuid,p_role_rates jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); item jsonb;
BEGIN
 IF actor IS NULL OR NOT private.has_permission(actor,'admin.payroll.view') OR NOT private.has_permission(actor,'admin.payroll.edit') THEN RAISE EXCEPTION 'Payroll view and editing permissions are required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.storm_events WHERE id=p_storm_id AND is_deleted IS NOT TRUE AND status<>'CLOSED' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Storm not found or closed' USING ERRCODE='23514'; END IF;
 PERFORM private.validate_storm_role_rates(p_role_rates);
 DELETE FROM public.storm_role_pay_rates WHERE storm_event_id=p_storm_id;
 DELETE FROM public.utility_billing_rates WHERE storm_event_id=p_storm_id AND role IS NOT NULL;
 FOR item IN SELECT value FROM jsonb_array_elements(p_role_rates) LOOP
  INSERT INTO public.storm_role_pay_rates(storm_event_id,role,hourly_rate,updated_by)
   VALUES(p_storm_id,(item->>'role')::public.contractor_role,(item->>'pay_rate')::numeric,actor);
  INSERT INTO public.utility_billing_rates(storm_event_id,role,work_type,hourly_rate,currency,updated_by)
   VALUES(p_storm_id,(item->>'role')::public.contractor_role,NULL,(item->>'bill_rate')::numeric,'USD',actor);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.save_storm_compensation_rates(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_storm_compensation_rates(uuid,jsonb) TO authenticated;

-- The old two-argument entry point must not silently create a roster row without
-- the required storm-specific driver allowance.
CREATE OR REPLACE FUNCTION public.assign_contractor_to_storm(p_storm_id uuid,p_contractor_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 RAISE EXCEPTION 'Storm-scoped pay and vehicle rates are required for assignment' USING ERRCODE='23514';
END $$;

CREATE FUNCTION public.assign_contractor_to_storm_with_compensation(
 p_storm_id uuid,p_contractor_id uuid,p_pay_rate_override numeric,p_vehicle_hourly_rate numeric
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE revision uuid; contractor_role public.contractor_role;
BEGIN
 IF NOT private.has_permission(auth.uid(),'admin.assignments.edit') OR NOT private.has_permission(auth.uid(),'admin.payroll.view') OR NOT private.has_permission(auth.uid(),'admin.payroll.edit') THEN
  RAISE EXCEPTION 'Assignment and payroll editing permissions are required' USING ERRCODE='42501';
 END IF;
 IF p_pay_rate_override IS NOT NULL AND (p_pay_rate_override<0 OR round(p_pay_rate_override,2)<>p_pay_rate_override) THEN
  RAISE EXCEPTION 'Pay override must be nonnegative with cent precision' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.storm_events WHERE id=p_storm_id AND is_deleted IS NOT TRUE AND status<>'CLOSED' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Storm not found or closed' USING ERRCODE='23514'; END IF;
 SELECT c.role INTO contractor_role FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id
  WHERE c.id=p_contractor_id AND c.is_deleted IS NOT TRUE AND p.is_active AND p.role::text='CONTRACTOR';
 IF contractor_role IS NULL THEN RAISE EXCEPTION 'Select an active contractor' USING ERRCODE='23514'; END IF;
 IF contractor_role='DRIVER' THEN
  IF p_vehicle_hourly_rate IS NULL OR p_vehicle_hourly_rate<0 OR round(p_vehicle_hourly_rate,2)<>p_vehicle_hourly_rate THEN
   RAISE EXCEPTION 'Every Driver requires a nonnegative storm hourly vehicle allowance' USING ERRCODE='23514'; END IF;
 ELSIF p_vehicle_hourly_rate IS NOT NULL THEN
  RAISE EXCEPTION 'Only Drivers can receive a vehicle allowance' USING ERRCODE='23514';
 END IF;
 SELECT id INTO revision FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id AND NOT is_locked ORDER BY revision_number DESC LIMIT 1;
 IF revision IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id) THEN RAISE EXCEPTION 'The storm roster is locked. Create an unlocked roster revision first'; END IF;
  INSERT INTO public.storm_event_roster_revisions(storm_event_id,revision_number,revision_label,created_by) VALUES(p_storm_id,0,'Initial roster',auth.uid()) RETURNING id INTO revision;
 END IF;
 UPDATE public.storm_event_roster_members SET member_status='CONFIRMED',updated_by=auth.uid()
  WHERE roster_revision_id=revision AND contractor_id=p_contractor_id;
 IF NOT FOUND THEN
  INSERT INTO public.storm_event_roster_members(roster_revision_id,contractor_id,member_status,created_by) VALUES(revision,p_contractor_id,'CONFIRMED',auth.uid());
 END IF;
 INSERT INTO public.storm_contractor_compensation(storm_event_id,contractor_id,pay_rate_override,vehicle_hourly_rate,updated_by)
 VALUES(p_storm_id,p_contractor_id,p_pay_rate_override,p_vehicle_hourly_rate,auth.uid())
 ON CONFLICT(storm_event_id,contractor_id) DO UPDATE SET pay_rate_override=excluded.pay_rate_override,
  vehicle_hourly_rate=excluded.vehicle_hourly_rate,updated_at=clock_timestamp(),updated_by=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.assign_contractor_to_storm_with_compensation(uuid,uuid,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assign_contractor_to_storm_with_compensation(uuid,uuid,numeric,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_storm_contractors(p_storm_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('contractorId',c.id,'displayName',p.first_name||' '||p.last_name,
   'role',c.role,'payRateOverride',CASE WHEN private.has_permission(auth.uid(),'admin.payroll.view') THEN comp.pay_rate_override ELSE NULL END,
   'vehicleHourlyRate',CASE WHEN private.has_permission(auth.uid(),'admin.payroll.view') THEN comp.vehicle_hourly_rate ELSE NULL END)
   ORDER BY p.last_name,p.first_name),'[]'::jsonb)
 FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id
 JOIN public.storm_event_roster_members m ON m.contractor_id=c.id
 JOIN public.storm_event_roster_revisions r ON r.id=m.roster_revision_id
 LEFT JOIN public.storm_contractor_compensation comp ON comp.storm_event_id=p_storm_id AND comp.contractor_id=c.id
 WHERE r.storm_event_id=p_storm_id AND m.member_status<>'REMOVED' AND p.is_active AND c.is_deleted IS NOT TRUE
  AND r.revision_number=(SELECT max(revision_number) FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id);
$$;

CREATE OR REPLACE FUNCTION private.apply_time_entry_costing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.contractor_pay_agreements; p jsonb; tier jsonb; cursor_at timestamptz; finish timestamptz; next_change timestamptz;
 week_at timestamptz; week_end timestamptz; prior_seconds numeric; local_seconds numeric; segment_seconds numeric;
 base_rate numeric; mult numeric; first_mult numeric; threshold numeric; amount numeric; vehicle_seconds numeric; vehicle_rate numeric;
 sum_wage numeric:=0; sum_vehicle numeric:=0; regular_sum numeric:=0; storm_role public.contractor_role; storm_base numeric; personal_override numeric;
 bill_rate numeric; storm_vehicle_rate numeric;
BEGIN
 IF TG_OP='UPDATE' AND OLD.clock_out_at IS NOT NULL THEN
  IF ROW(NEW.contractor_id,NEW.ticket_id,NEW.storm_event_id,NEW.clock_in_at,NEW.clock_out_at,NEW.work_type,NEW.break_minutes,NEW.is_deleted,NEW.activity_intervals,NEW.calculation_version)
   IS DISTINCT FROM ROW(OLD.contractor_id,OLD.ticket_id,OLD.storm_event_id,OLD.clock_in_at,OLD.clock_out_at,OLD.work_type,OLD.break_minutes,OLD.is_deleted,OLD.activity_intervals,OLD.calculation_version) THEN RAISE EXCEPTION 'Closed shift inputs are immutable' USING ERRCODE='23514'; END IF;
  NEW:=jsonb_populate_record(NEW,(SELECT jsonb_object_agg(key,value) FROM jsonb_each(to_jsonb(OLD)) WHERE key=ANY(ARRAY['contractor_role','work_type_rate','pay_rate_applied','payroll_amount','utility_bill_rate_applied','utility_bill_amount','vehicle_hourly_rate_applied','regular_minutes','overtime_minutes','regular_pay_amount','overtime_pay_amount','overtime_rate_applied','weekly_allocations','paid_minutes_exact','pay_segments','vehicle_minutes','vehicle_allowance_amount','legacy_vehicle_rate_applied'])));
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' THEN
  NEW.contractor_role:=OLD.contractor_role; NEW.work_type_rate:=OLD.work_type_rate; NEW.pay_rate_applied:=OLD.pay_rate_applied;
  NEW.utility_bill_rate_applied:=OLD.utility_bill_rate_applied; NEW.vehicle_hourly_rate_applied:=OLD.vehicle_hourly_rate_applied;
 ELSE
  SELECT c.role INTO storm_role FROM public.contractors c WHERE c.id=NEW.contractor_id AND c.is_deleted IS NOT TRUE;
  SELECT hourly_rate INTO storm_base FROM public.storm_role_pay_rates WHERE storm_event_id=NEW.storm_event_id AND role=storm_role;
  SELECT pay_rate_override,vehicle_hourly_rate INTO personal_override,storm_vehicle_rate FROM public.storm_contractor_compensation
   WHERE storm_event_id=NEW.storm_event_id AND contractor_id=NEW.contractor_id;
  SELECT hourly_rate INTO bill_rate FROM public.utility_billing_rates WHERE storm_event_id=NEW.storm_event_id AND role=storm_role;
  IF storm_role IS NULL OR storm_base IS NULL OR bill_rate IS NULL THEN
   RAISE EXCEPTION 'Storm role compensation is incomplete for %; configure this storm before clock-in',coalesce(storm_role::text,'(unknown)') USING ERRCODE='23514'; END IF;
  IF storm_role='DRIVER' AND storm_vehicle_rate IS NULL THEN RAISE EXCEPTION 'Driver storm vehicle allowance is not configured' USING ERRCODE='23514'; END IF;
  NEW.contractor_role:=storm_role; NEW.pay_rate_applied:=coalesce(personal_override,storm_base); NEW.work_type_rate:=NEW.pay_rate_applied;
  NEW.utility_bill_rate_applied:=bill_rate; NEW.vehicle_hourly_rate_applied:=storm_vehicle_rate;
 END IF;
 IF NEW.calculation_version='LEGACY' THEN
  IF TG_OP='INSERT' THEN RAISE EXCEPTION 'New shifts require storm compensation costing' USING ERRCODE='23514'; END IF;
  NEW.payroll_amount:=round(greatest(0,extract(epoch FROM coalesce(NEW.clock_out_at,NEW.clock_in_at)-NEW.clock_in_at)/60-NEW.break_minutes)/60*NEW.pay_rate_applied,2);
  NEW.utility_bill_amount:=round(greatest(0,extract(epoch FROM coalesce(NEW.clock_out_at,NEW.clock_in_at)-NEW.clock_in_at)/60-NEW.break_minutes)/60*NEW.utility_bill_rate_applied,2);
  RETURN NEW;
 END IF;
 SELECT * INTO a FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from<=NEW.clock_in_at ORDER BY effective_from DESC LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save an effective contractor pay agreement before clock-in' USING ERRCODE='23514'; END IF;
 p:=a.terms;
 NEW.pay_segments:='[]'; NEW.weekly_allocations:='[]'; NEW.paid_minutes_exact:=0; NEW.vehicle_minutes:=0;
 NEW.regular_minutes:=0; NEW.overtime_minutes:=0; NEW.regular_pay_amount:=0; NEW.overtime_pay_amount:=0; NEW.overtime_rate_applied:=NULL;
 IF NEW.clock_out_at IS NULL THEN NEW.payroll_amount:=0; NEW.vehicle_allowance_amount:=0; NEW.utility_bill_amount:=0; RETURN NEW; END IF;
 NEW.break_minutes:=round(coalesce((SELECT sum(extract(epoch FROM (i->>'end_at')::timestamptz-(i->>'start_at')::timestamptz)/60) FROM jsonb_array_elements(NEW.activity_intervals) i WHERE i->>'kind'='BREAK'),0));
 cursor_at:=NEW.clock_in_at;
 WHILE cursor_at<NEW.clock_out_at LOOP
  SELECT * INTO a FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from<=cursor_at ORDER BY effective_from DESC LIMIT 1;
  p:=a.terms; base_rate:=NEW.pay_rate_applied;
  week_at:=private.pay_week_start(cursor_at,p); week_end:=((week_at AT TIME ZONE (p->>'timezone'))+interval '7 days') AT TIME ZONE (p->>'timezone');
  SELECT min(effective_from) INTO next_change FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from>cursor_at;
  finish:=least(NEW.clock_out_at,week_end,coalesce(next_change,NEW.clock_out_at));
  SELECT least(finish,coalesce(min(boundary),finish)) INTO finish FROM (
   SELECT (value->>'start_at')::timestamptz boundary FROM jsonb_array_elements(NEW.activity_intervals)
   UNION ALL SELECT (value->>'end_at')::timestamptz FROM jsonb_array_elements(NEW.activity_intervals)) b WHERE boundary>cursor_at;
  SELECT coalesce(sum(CASE WHEN t.calculation_version='AGREEMENT' THEN private.paid_seconds(t.clock_in_at,t.clock_out_at,t.activity_intervals,week_at,week_end)
   ELSE greatest(0,extract(epoch FROM least(t.clock_out_at,week_end)-greatest(t.clock_in_at,week_at)))*(1-least(coalesce(t.break_minutes,0)*60/greatest(extract(epoch FROM t.clock_out_at-t.clock_in_at),1),1)) END),0)
   INTO prior_seconds FROM public.time_entries t WHERE t.contractor_id=NEW.contractor_id AND t.id<>NEW.id AND t.is_deleted IS NOT TRUE AND t.clock_out_at IS NOT NULL AND t.clock_in_at<week_end AND t.clock_out_at>week_at;
  local_seconds:=private.paid_seconds(NEW.clock_in_at,cursor_at,NEW.activity_intervals,week_at,week_end);
  segment_seconds:=private.paid_seconds(cursor_at,finish,NEW.activity_intervals,cursor_at,finish);
  IF p#>>'{policy,mode}'='FLAT' THEN mult:=(p#>>'{policy,multiplier}')::numeric; first_mult:=mult;
  ELSE
   SELECT value INTO tier FROM jsonb_array_elements(p#>'{policy,tiers}') WHERE (value->>'after_hours')::numeric*3600<=prior_seconds+local_seconds ORDER BY (value->>'after_hours')::numeric DESC LIMIT 1;
   mult:=(tier->>'multiplier')::numeric; first_mult:=(p#>>'{policy,tiers,0,multiplier}')::numeric;
   SELECT min((value->>'after_hours')::numeric*3600) INTO threshold FROM jsonb_array_elements(p#>'{policy,tiers}') WHERE (value->>'after_hours')::numeric*3600>prior_seconds+local_seconds;
   IF threshold IS NOT NULL AND segment_seconds>threshold-prior_seconds-local_seconds THEN finish:=cursor_at+((threshold-prior_seconds-local_seconds)*interval '1 second'); segment_seconds:=threshold-prior_seconds-local_seconds; END IF;
  END IF;
  vehicle_seconds:=0; vehicle_rate:=0;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.activity_intervals) i WHERE i->>'kind'='VEHICLE_USE' AND (i->>'start_at')::timestamptz<=cursor_at AND (i->>'end_at')::timestamptz>=finish)
    AND NEW.contractor_role='DRIVER' THEN vehicle_seconds:=segment_seconds; vehicle_rate:=coalesce(NEW.vehicle_hourly_rate_applied,0); END IF;
  amount:=segment_seconds/3600*base_rate*mult; sum_wage:=sum_wage+amount; sum_vehicle:=sum_vehicle+vehicle_seconds/3600*vehicle_rate;
  IF mult=first_mult THEN NEW.regular_minutes:=NEW.regular_minutes+segment_seconds/60; regular_sum:=regular_sum+amount;
  ELSE NEW.overtime_minutes:=NEW.overtime_minutes+segment_seconds/60; NEW.overtime_rate_applied:=base_rate*mult; END IF;
  NEW.paid_minutes_exact:=NEW.paid_minutes_exact+segment_seconds/60; NEW.vehicle_minutes:=NEW.vehicle_minutes+vehicle_seconds/60;
  NEW.pay_segments:=NEW.pay_segments||jsonb_build_array(jsonb_build_object('agreement_id',a.id,'start_at',cursor_at,'end_at',finish,'week_start_at',week_at,'paid_minutes',segment_seconds/60,'base_rate',base_rate,'multiplier',mult,'wage_amount',amount,'vehicle_minutes',vehicle_seconds/60,'vehicle_rate',vehicle_rate,'vehicle_amount',vehicle_seconds/3600*vehicle_rate));
  cursor_at:=finish;
 END LOOP;
 NEW.payroll_amount:=round(sum_wage,2); NEW.vehicle_allowance_amount:=round(sum_vehicle,2);
 NEW.regular_pay_amount:=round(regular_sum,2); NEW.overtime_pay_amount:=NEW.payroll_amount-NEW.regular_pay_amount;
 NEW.utility_bill_amount:=round(NEW.paid_minutes_exact/60*NEW.utility_bill_rate_applied,2);
 IF jsonb_array_length(NEW.pay_segments)>0 THEN
  SELECT jsonb_agg(value||jsonb_build_object('wage_amount',round((value->>'wage_amount')::numeric,2),'vehicle_amount',round((value->>'vehicle_amount')::numeric,2)) ORDER BY ord) INTO NEW.pay_segments FROM jsonb_array_elements(NEW.pay_segments) WITH ORDINALITY s(value,ord);
  NEW.pay_segments:=jsonb_set(NEW.pay_segments,ARRAY[(jsonb_array_length(NEW.pay_segments)-1)::text,'wage_amount'],to_jsonb((NEW.pay_segments->-1->>'wage_amount')::numeric+NEW.payroll_amount-(SELECT sum((value->>'wage_amount')::numeric) FROM jsonb_array_elements(NEW.pay_segments))));
  NEW.pay_segments:=jsonb_set(NEW.pay_segments,ARRAY[(jsonb_array_length(NEW.pay_segments)-1)::text,'vehicle_amount'],to_jsonb((NEW.pay_segments->-1->>'vehicle_amount')::numeric+NEW.vehicle_allowance_amount-(SELECT sum((value->>'vehicle_amount')::numeric) FROM jsonb_array_elements(NEW.pay_segments))));
 END IF;
 RETURN NEW;
END $$;

COMMIT;
