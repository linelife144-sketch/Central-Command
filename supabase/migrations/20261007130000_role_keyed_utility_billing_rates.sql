-- Role-keyed utility billing rates.
--
-- The admin "Global Utility Bill Rates" card bills the utility per contractor
-- role, not per work type. This migration adds a nullable role column to
-- public.utility_billing_rates, keeps every existing work_type row untouched
-- (no backfill, no copied amounts), and redefines private.apply_time_entry_costing()
-- so a stored role rate wins.
--
-- Unresolved case, named here and in the trigger: a clock-in whose contractor
-- role has no stored utility billing rate cannot be costed. The trigger raises
-- 'No utility billing rate configured for contractor role <ROLE>' instead of
-- substituting a number or silently copying a work-type rate onto the role.
-- Existing rows stay keyed by work_type and are no longer consulted by the
-- costing trigger.

ALTER TABLE public.utility_billing_rates
  ADD COLUMN role public.contractor_role;

ALTER TABLE public.utility_billing_rates
  ALTER COLUMN work_type DROP NOT NULL;

-- A role rate row carries a role and no work type; a preserved work-type row
-- carries a work type and no role. Nothing may carry both or neither.
ALTER TABLE public.utility_billing_rates
  ADD CONSTRAINT utility_billing_rates_key_chk CHECK (
    (role IS NOT NULL AND work_type IS NULL) OR (role IS NULL AND work_type IS NOT NULL)
  );

CREATE UNIQUE INDEX utility_billing_rates_role_global_uk
  ON public.utility_billing_rates (role) WHERE role IS NOT NULL AND storm_event_id IS NULL;
CREATE UNIQUE INDEX utility_billing_rates_role_storm_uk
  ON public.utility_billing_rates (storm_event_id, role) WHERE role IS NOT NULL AND storm_event_id IS NOT NULL;

-- The CREATE OR REPLACE FUNCTION private.apply_time_entry_costing() body is
-- appended below. It is identical to the definition in
-- 20261004174918_configurable_contractor_time_payroll.sql except the utility
-- bill rate resolution, which now keys on the contractor's role.
CREATE OR REPLACE FUNCTION private.apply_time_entry_costing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.contractor_pay_agreements; p jsonb; tier jsonb; cursor_at timestamptz; finish timestamptz; next_change timestamptz;
 week_at timestamptz; week_end timestamptz; prior_seconds numeric; local_seconds numeric; segment_seconds numeric;
 base_rate numeric; mult numeric; first_mult numeric; threshold numeric; amount numeric; vehicle_seconds numeric; vehicle_rate numeric;
 sum_wage numeric:=0; sum_vehicle numeric:=0; regular_sum numeric:=0; elapsed numeric; legacy_rate numeric;
 bill_role public.contractor_role;
BEGIN
 IF TG_OP='UPDATE' AND OLD.clock_out_at IS NOT NULL THEN
  IF ROW(NEW.contractor_id,NEW.ticket_id,NEW.storm_event_id,NEW.clock_in_at,NEW.clock_out_at,NEW.work_type,NEW.break_minutes,NEW.is_deleted,NEW.activity_intervals,NEW.calculation_version)
   IS DISTINCT FROM ROW(OLD.contractor_id,OLD.ticket_id,OLD.storm_event_id,OLD.clock_in_at,OLD.clock_out_at,OLD.work_type,OLD.break_minutes,OLD.is_deleted,OLD.activity_intervals,OLD.calculation_version) THEN RAISE EXCEPTION 'Closed shift inputs are immutable' USING ERRCODE='23514'; END IF;
  NEW:=jsonb_populate_record(NEW,(SELECT jsonb_object_agg(key,value) FROM jsonb_each(to_jsonb(OLD)) WHERE key=ANY(ARRAY['contractor_role','work_type_rate','pay_rate_applied','payroll_amount','utility_bill_rate_applied','utility_bill_amount','regular_minutes','overtime_minutes','regular_pay_amount','overtime_pay_amount','overtime_rate_applied','weekly_allocations','paid_minutes_exact','pay_segments','vehicle_minutes','vehicle_allowance_amount','legacy_vehicle_rate_applied'])));
  RETURN NEW;
 END IF;
 -- Utility bill rate is keyed by contractor role. A storm-scoped role rate wins
 -- over the global role rate. A role with no stored rate is an unresolved case:
 -- the trigger refuses to cost the line rather than inventing or copying a rate.
 -- Work-type keyed rows are preserved but never consulted here.
 IF TG_OP='UPDATE' THEN NEW.utility_bill_rate_applied:=OLD.utility_bill_rate_applied; ELSE
  SELECT (terms->>'role')::public.contractor_role INTO bill_role FROM public.contractor_pay_agreements
   WHERE contractor_id=NEW.contractor_id AND effective_from<=NEW.clock_in_at ORDER BY effective_from DESC LIMIT 1;
  IF bill_role IS NULL THEN
   SELECT role INTO bill_role FROM public.contractors WHERE id=NEW.contractor_id;
  END IF;
  IF bill_role IS NOT NULL THEN
   SELECT hourly_rate INTO NEW.utility_bill_rate_applied FROM public.utility_billing_rates
    WHERE role=bill_role AND (storm_event_id=NEW.storm_event_id OR storm_event_id IS NULL)
    ORDER BY (storm_event_id IS NOT NULL) DESC LIMIT 1;
  END IF;
 END IF;
 IF NEW.calculation_version='AGREEMENT' AND NEW.utility_bill_rate_applied IS NULL THEN
  RAISE EXCEPTION 'No utility billing rate configured for contractor role %', coalesce(bill_role::text,'(unknown)') USING ERRCODE='23514';
 END IF;
 IF NEW.calculation_version='LEGACY' THEN
  NEW.pay_rate_applied:=OLD.pay_rate_applied; NEW.work_type_rate:=OLD.work_type_rate; NEW.contractor_role:=OLD.contractor_role;
  NEW.payroll_amount:=round(greatest(0,extract(epoch FROM coalesce(NEW.clock_out_at,NEW.clock_in_at)-NEW.clock_in_at)/60-NEW.break_minutes)/60*NEW.pay_rate_applied,2);
  NEW.utility_bill_amount:=round(greatest(0,extract(epoch FROM coalesce(NEW.clock_out_at,NEW.clock_in_at)-NEW.clock_in_at)/60-NEW.break_minutes)/60*NEW.utility_bill_rate_applied,2);
  RETURN NEW;
 END IF;
 SELECT * INTO a FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from<=NEW.clock_in_at ORDER BY effective_from DESC LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save an effective contractor pay agreement before clock-in' USING ERRCODE='23514'; END IF;
 p:=a.terms; NEW.contractor_role:=(p->>'role')::public.contractor_role;
 NEW.pay_rate_applied:=coalesce((p->'work_type_rates'->>NEW.work_type::text)::numeric,(p->>'base_hourly_rate')::numeric); NEW.work_type_rate:=NEW.pay_rate_applied;
 NEW.pay_segments:='[]'; NEW.weekly_allocations:='[]'; NEW.paid_minutes_exact:=0; NEW.vehicle_minutes:=0;
 NEW.regular_minutes:=0; NEW.overtime_minutes:=0; NEW.regular_pay_amount:=0; NEW.overtime_pay_amount:=0; NEW.overtime_rate_applied:=NULL;
 -- No paid interval exists until clock-out. Open activities cannot create wages.
 IF NEW.clock_out_at IS NULL THEN NEW.payroll_amount:=0; NEW.vehicle_allowance_amount:=0; NEW.utility_bill_amount:=0; RETURN NEW; END IF;
 NEW.break_minutes:=round(coalesce((SELECT sum(extract(epoch FROM (i->>'end_at')::timestamptz-(i->>'start_at')::timestamptz)/60) FROM jsonb_array_elements(NEW.activity_intervals) i WHERE i->>'kind'='BREAK'),0));
 cursor_at:=NEW.clock_in_at;
 WHILE cursor_at<NEW.clock_out_at LOOP
  SELECT * INTO a FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from<=cursor_at ORDER BY effective_from DESC LIMIT 1;
  p:=a.terms; base_rate:=coalesce((p->'work_type_rates'->>NEW.work_type::text)::numeric,(p->>'base_hourly_rate')::numeric);
  week_at:=private.pay_week_start(cursor_at,p); week_end:=((week_at AT TIME ZONE (p->>'timezone'))+interval '7 days') AT TIME ZONE (p->>'timezone');
  SELECT min(effective_from) INTO next_change FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from>cursor_at;
  finish:=least(NEW.clock_out_at,week_end,coalesce(next_change,NEW.clock_out_at));
  -- Every interval boundary creates a segment; no proportional allocation of new breaks.
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
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.activity_intervals) i WHERE i->>'kind'='VEHICLE_USE' AND (i->>'start_at')::timestamptz<=cursor_at AND (i->>'end_at')::timestamptz>=finish) THEN
   IF (p->>'driver_eligible')::boolean AND (p->>'vehicle_allowance_enabled')::boolean THEN vehicle_seconds:=segment_seconds; vehicle_rate:=(p->>'vehicle_hourly_rate')::numeric; END IF;
  END IF;
  amount:=segment_seconds/3600*base_rate*mult; sum_wage:=sum_wage+amount; sum_vehicle:=sum_vehicle+vehicle_seconds/3600*vehicle_rate;
  IF mult=first_mult THEN NEW.regular_minutes:=NEW.regular_minutes+segment_seconds/60; regular_sum:=regular_sum+amount;
  ELSE NEW.overtime_minutes:=NEW.overtime_minutes+segment_seconds/60; NULL; NEW.overtime_rate_applied:=base_rate*mult; END IF;
  NEW.paid_minutes_exact:=NEW.paid_minutes_exact+segment_seconds/60; NEW.vehicle_minutes:=NEW.vehicle_minutes+vehicle_seconds/60;
  NEW.pay_segments:=NEW.pay_segments||jsonb_build_array(jsonb_build_object('agreement_id',a.id,'start_at',cursor_at,'end_at',finish,'week_start_at',week_at,'paid_minutes',segment_seconds/60,'base_rate',base_rate,'multiplier',mult,'wage_amount',amount,'vehicle_minutes',vehicle_seconds/60,'vehicle_rate',vehicle_rate,'vehicle_amount',vehicle_seconds/3600*vehicle_rate));
  cursor_at:=finish;
 END LOOP;
 NEW.payroll_amount:=round(sum_wage,2); NEW.vehicle_allowance_amount:=round(sum_vehicle,2);
 NEW.regular_pay_amount:=round(regular_sum,2); NEW.overtime_pay_amount:=NEW.payroll_amount-NEW.regular_pay_amount;
 NEW.utility_bill_amount:=round(NEW.paid_minutes_exact/60*NEW.utility_bill_rate_applied,2);
 -- Reconcile cent-rounded segment displays to the final rounded subtotals.
 IF jsonb_array_length(NEW.pay_segments)>0 THEN
  SELECT jsonb_agg(value||jsonb_build_object('wage_amount',round((value->>'wage_amount')::numeric,2),'vehicle_amount',round((value->>'vehicle_amount')::numeric,2)) ORDER BY ord) INTO NEW.pay_segments FROM jsonb_array_elements(NEW.pay_segments) WITH ORDINALITY s(value,ord);
  NEW.pay_segments:=jsonb_set(NEW.pay_segments,ARRAY[(jsonb_array_length(NEW.pay_segments)-1)::text,'wage_amount'],to_jsonb((NEW.pay_segments->-1->>'wage_amount')::numeric+NEW.payroll_amount-(SELECT sum((value->>'wage_amount')::numeric) FROM jsonb_array_elements(NEW.pay_segments))));
  NEW.pay_segments:=jsonb_set(NEW.pay_segments,ARRAY[(jsonb_array_length(NEW.pay_segments)-1)::text,'vehicle_amount'],to_jsonb((NEW.pay_segments->-1->>'vehicle_amount')::numeric+NEW.vehicle_allowance_amount-(SELECT sum((value->>'vehicle_amount')::numeric) FROM jsonb_array_elements(NEW.pay_segments))));
 END IF;
 RETURN NEW;
END $$;
