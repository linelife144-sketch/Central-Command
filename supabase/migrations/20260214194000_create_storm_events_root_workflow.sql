-- Create storm_events as root workflow entity and link tickets to storm events.
-- Backward-compatible and idempotent for staged rollouts.

CREATE TABLE IF NOT EXISTS public.storm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code VARCHAR(50),
  name VARCHAR(255),
  utility_client VARCHAR(255),
  status VARCHAR(20) DEFAULT 'PLANNED',
  region VARCHAR(255),
  contract_reference VARCHAR(255),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS event_code VARCHAR(50);
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS utility_client VARCHAR(255);
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PLANNED';
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS region VARCHAR(255);
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS contract_reference VARCHAR(255);
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.storm_events ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

UPDATE public.storm_events
SET event_code = CONCAT('SE-', UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8)))
WHERE event_code IS NULL OR BTRIM(event_code) = '';

UPDATE public.storm_events
SET name = COALESCE(NULLIF(BTRIM(name), ''), CONCAT(utility_client, ' Storm Event'))
WHERE name IS NULL OR BTRIM(name) = '';

UPDATE public.storm_events
SET utility_client = COALESCE(NULLIF(BTRIM(utility_client), ''), 'Unassigned Utility')
WHERE utility_client IS NULL OR BTRIM(utility_client) = '';

UPDATE public.storm_events
SET status = 'PLANNED'
WHERE status IS NULL OR BTRIM(status) = '';

ALTER TABLE public.storm_events
  ALTER COLUMN event_code SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN utility_client SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN is_deleted SET DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'storm_events_status_check'
      AND conrelid = 'public.storm_events'::regclass
  ) THEN
    ALTER TABLE public.storm_events
      ADD CONSTRAINT storm_events_status_check CHECK (
        status IN ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETE', 'ARCHIVED')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_storm_events_event_code ON public.storm_events (event_code);
CREATE INDEX IF NOT EXISTS idx_storm_events_status ON public.storm_events (status);
CREATE INDEX IF NOT EXISTS idx_storm_events_utility_client ON public.storm_events (utility_client);
CREATE INDEX IF NOT EXISTS idx_storm_events_created_at ON public.storm_events (created_at DESC);

ALTER TABLE public.storm_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storm_events_select_admin ON public.storm_events;
CREATE POLICY storm_events_select_admin ON public.storm_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS storm_events_write_super_admin ON public.storm_events;
CREATE POLICY storm_events_write_super_admin ON public.storm_events
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'SUPER_ADMIN'
    )
  );

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS storm_event_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_storm_event_id_fkey'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_storm_event_id_fkey
      FOREIGN KEY (storm_event_id)
      REFERENCES public.storm_events(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tickets_storm_event ON public.tickets (storm_event_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_storm_events_updated_at'
      AND tgrelid = 'public.storm_events'::regclass
  ) THEN
    CREATE TRIGGER update_storm_events_updated_at
      BEFORE UPDATE ON public.storm_events
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
