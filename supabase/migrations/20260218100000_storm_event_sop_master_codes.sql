-- Add customer/utility master code tables and storm-event SOP code columns.

BEGIN;

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  customer_code char(3) NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_customer_code_format CHECK (customer_code = upper(customer_code) AND customer_code ~ '^[A-Z0-9]{3}$')
);

CREATE TABLE IF NOT EXISTS public.utilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  utility_code char(3) NOT NULL UNIQUE,
  utility_client_key text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT utilities_utility_code_format CHECK (utility_code = upper(utility_code) AND utility_code ~ '^[A-Z0-9]{3}$'),
  CONSTRAINT utilities_utility_client_key_format CHECK (utility_client_key = upper(utility_client_key))
);

CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(is_active);
CREATE INDEX IF NOT EXISTS idx_utilities_active ON public.utilities(is_active);
CREATE INDEX IF NOT EXISTS idx_utilities_client_key ON public.utilities(utility_client_key);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.storm_events
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id),
  ADD COLUMN IF NOT EXISTS utility_id uuid REFERENCES public.utilities(id),
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS city_code char(3),
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_sequence integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'storm_events_city_code_format'
      AND conrelid = 'public.storm_events'::regclass
  ) THEN
    ALTER TABLE public.storm_events
      ADD CONSTRAINT storm_events_city_code_format CHECK (
        city_code IS NULL OR (city_code = upper(city_code) AND city_code ~ '^[A-Z0-9]{3}$')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_storm_events_customer_id ON public.storm_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_storm_events_utility_id ON public.storm_events(utility_id);
CREATE INDEX IF NOT EXISTS idx_storm_events_city_code ON public.storm_events(city_code);
CREATE INDEX IF NOT EXISTS idx_storm_events_event_date ON public.storm_events(event_date);

INSERT INTO public.customers (name, customer_code)
VALUES
  ('UNKNOWN CUSTOMER', 'UNK'),
  ('GRID ELECTRIC SERVICES', 'GES')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.utilities (name, utility_code, utility_client_key)
VALUES
  ('ENTERGY', 'ENT', 'ENTERGY'),
  ('DUKE ENERGY', 'DUK', 'DUKE'),
  ('CENTERPOINT ENERGY', 'CEN', 'CENTERPOINT'),
  ('ONCOR', 'ONC', 'ONCOR'),
  ('FLORIDA POWER & LIGHT', 'FPL', 'FPL'),
  ('TECO', 'TEC', 'TECO'),
  ('EVERSOURCE', 'EVE', 'EVERSOURCE')
ON CONFLICT (name) DO NOTHING;

-- Backfill existing storm rows with placeholder customer and matched utility/event date.
UPDATE public.storm_events se
SET customer_id = c.id
FROM public.customers c
WHERE c.customer_code = 'UNK'
  AND se.customer_id IS NULL;

UPDATE public.storm_events se
SET utility_id = u.id
FROM public.utilities u
WHERE se.utility_id IS NULL
  AND upper(se.utility_client) = u.utility_client_key;

UPDATE public.storm_events se
SET city_code = substring(regexp_replace(upper(COALESCE(se.city, '')), '[^A-Z0-9]', '', 'g') from 1 for 3)
WHERE se.city_code IS NULL
  AND se.city IS NOT NULL;

UPDATE public.storm_events
SET event_date = COALESCE(event_date, created_at::date)
WHERE event_date IS NULL;

COMMIT;
