-- Add SOP-based storm event code generation and immutability.

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_storm_event_code_from_sop()
RETURNS trigger AS $$
DECLARE
  customer_code_value char(3);
  utility_code_value char(3);
  base_code text;
  next_suffix integer;
BEGIN
  -- Respect explicit event_code values for backward compatibility.
  IF NEW.event_code IS NOT NULL AND btrim(NEW.event_code) <> '' THEN
    RETURN NEW;
  END IF;

  -- Generate only when SOP coding inputs exist.
  IF NEW.customer_id IS NULL OR NEW.utility_id IS NULL OR NEW.city_code IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.customer_code
  INTO customer_code_value
  FROM public.customers c
  WHERE c.id = NEW.customer_id;

  IF customer_code_value IS NULL THEN
    RAISE EXCEPTION 'customer_id % does not map to a customer_code', NEW.customer_id;
  END IF;

  SELECT u.utility_code
  INTO utility_code_value
  FROM public.utilities u
  WHERE u.id = NEW.utility_id;

  IF utility_code_value IS NULL THEN
    RAISE EXCEPTION 'utility_id % does not map to a utility_code', NEW.utility_id;
  END IF;

  NEW.city_code := upper(NEW.city_code);
  NEW.event_date := COALESCE(NEW.event_date, (COALESCE(NEW.created_at, now()) AT TIME ZONE 'UTC')::date);

  base_code := to_char(NEW.event_date, 'YYMMDD') || customer_code_value || utility_code_value || NEW.city_code;

  SELECT COALESCE(
    MAX(
      CASE
        WHEN se.event_code = base_code THEN 0
        WHEN se.event_code ~ ('^' || base_code || '-[0-9]{2}$') THEN substring(se.event_code from '([0-9]{2})$')::int
        ELSE NULL
      END
    ),
    -1
  )
  INTO next_suffix
  FROM public.storm_events se
  WHERE se.event_code = base_code OR se.event_code LIKE base_code || '-%';

  IF next_suffix < 0 THEN
    NEW.event_code := base_code;
    NEW.event_sequence := 0;
  ELSE
    NEW.event_sequence := next_suffix + 1;
    NEW.event_code := base_code || '-' || lpad(NEW.event_sequence::text, 2, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.prevent_storm_event_code_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.event_code IS DISTINCT FROM OLD.event_code THEN
    RAISE EXCEPTION 'storm_events.event_code is immutable once created';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_storm_event_code_from_sop ON public.storm_events;
CREATE TRIGGER tr_generate_storm_event_code_from_sop
BEFORE INSERT ON public.storm_events
FOR EACH ROW
EXECUTE FUNCTION public.generate_storm_event_code_from_sop();

DROP TRIGGER IF EXISTS tr_prevent_storm_event_code_update ON public.storm_events;
CREATE TRIGGER tr_prevent_storm_event_code_update
BEFORE UPDATE OF event_code ON public.storm_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_storm_event_code_update();

COMMIT;
