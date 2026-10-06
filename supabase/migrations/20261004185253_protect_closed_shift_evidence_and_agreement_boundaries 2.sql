BEGIN;
CREATE FUNCTION private.protect_closed_shift_evidence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF OLD.clock_out_at IS NOT NULL AND ROW(NEW.clock_in_latitude,NEW.clock_in_longitude,NEW.clock_in_accuracy,NEW.clock_in_photo_url,NEW.clock_in_ip,NEW.clock_in_user_agent,NEW.clock_out_latitude,NEW.clock_out_longitude,NEW.clock_out_accuracy,NEW.clock_out_photo_url,NEW.clock_out_ip,NEW.created_by,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.clock_in_latitude,OLD.clock_in_longitude,OLD.clock_in_accuracy,OLD.clock_in_photo_url,OLD.clock_in_ip,OLD.clock_in_user_agent,OLD.clock_out_latitude,OLD.clock_out_longitude,OLD.clock_out_accuracy,OLD.clock_out_photo_url,OLD.clock_out_ip,OLD.created_by,OLD.created_at) THEN
  RAISE EXCEPTION 'Closed shift evidence is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ab_closed_shift_evidence BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION private.protect_closed_shift_evidence();
CREATE FUNCTION private.validate_agreement_successor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE successor public.contractor_pay_agreements;
BEGIN
 SELECT * INTO successor FROM public.contractor_pay_agreements WHERE contractor_id=NEW.contractor_id AND effective_from>NEW.effective_from ORDER BY effective_from LIMIT 1;
 IF FOUND AND ROW(successor.terms->>'timezone',successor.terms->>'week_start_day') IS DISTINCT FROM ROW(NEW.terms->>'timezone',NEW.terms->>'week_start_day') AND private.pay_week_start(successor.effective_from,NEW.terms)<>successor.effective_from THEN
  RAISE EXCEPTION 'This edit would invalidate a scheduled workweek boundary' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_agreement_successor BEFORE INSERT ON public.contractor_pay_agreements FOR EACH ROW EXECUTE FUNCTION private.validate_agreement_successor();
CREATE FUNCTION private.apply_current_agreement_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.effective_from<=clock_timestamp() THEN
  UPDATE public.contractors SET role=(NEW.terms->>'role')::public.contractor_role WHERE id=NEW.contractor_id AND role::text IS DISTINCT FROM NEW.terms->>'role';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER agreement_current_role AFTER INSERT ON public.contractor_pay_agreements FOR EACH ROW EXECUTE FUNCTION private.apply_current_agreement_role();
REVOKE ALL ON FUNCTION private.protect_closed_shift_evidence(),private.validate_agreement_successor(),private.apply_current_agreement_role() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
