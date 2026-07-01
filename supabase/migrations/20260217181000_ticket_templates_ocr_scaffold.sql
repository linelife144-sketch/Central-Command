-- Ticket template + OCR scaffold tables/constraints.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_source_type') THEN
    CREATE TYPE public.ticket_source_type AS ENUM ('MANUAL', 'OCR_SCAN', 'PDF_IMPORT', 'CSV_IMPORT', 'API');
  END IF;
END $$;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS source_type public.ticket_source_type,
  ADD COLUMN IF NOT EXISTS source_file_id UUID,
  ADD COLUMN IF NOT EXISTS raw_ocr_text TEXT;

ALTER TABLE public.tickets
  ALTER COLUMN source_type SET DEFAULT 'MANUAL';

UPDATE public.tickets
SET source_type = 'MANUAL'
WHERE source_type IS NULL;

ALTER TABLE public.tickets
  ALTER COLUMN source_type SET NOT NULL;

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_storm_event_required;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_storm_event_required CHECK (storm_event_id IS NOT NULL) NOT VALID;

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_utility_client_supported;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_utility_client_supported CHECK (
    utility_client IN (
      'ENTERGY', 'DUKE', 'CENTERPOINT', 'ONCOR', 'FPL',
      'Entergy', 'Duke Energy', 'Florida Power & Light', 'TECO'
    )
  ) NOT VALID;

CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id UUID NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_storm_event ON public.ticket_attachments(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_source_file_id_fkey;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_source_file_id_fkey
  FOREIGN KEY (source_file_id)
  REFERENCES public.ticket_attachments(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.ticket_payloads (
  ticket_id UUID PRIMARY KEY REFERENCES public.tickets(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_version INTEGER NOT NULL DEFAULT 1,
  extraction_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  extraction_warnings TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_payloads_payload_gin ON public.ticket_payloads USING GIN (payload);

CREATE TABLE IF NOT EXISTS public.ticket_extraction_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id UUID NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  utility_client TEXT NOT NULL,
  attachment_id UUID REFERENCES public.ticket_attachments(id) ON DELETE SET NULL,
  ocr_text TEXT,
  draft_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_extraction_sessions_storm_event ON public.ticket_extraction_sessions(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_extraction_sessions_status ON public.ticket_extraction_sessions(status);

CREATE OR REPLACE FUNCTION public.enforce_ticket_storm_utility_match()
RETURNS TRIGGER AS $$
DECLARE
  storm_utility TEXT;
BEGIN
  SELECT utility_client INTO storm_utility
  FROM public.storm_events
  WHERE id = NEW.storm_event_id;

  IF storm_utility IS NULL THEN
    RAISE EXCEPTION 'storm_event_id % does not exist', NEW.storm_event_id;
  END IF;

  IF NEW.utility_client IS NULL OR NEW.utility_client <> storm_utility THEN
    RAISE EXCEPTION 'tickets.utility_client must match parent storm_events.utility_client';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_enforce_storm_utility_match ON public.tickets;
CREATE TRIGGER tickets_enforce_storm_utility_match
BEFORE INSERT OR UPDATE OF storm_event_id, utility_client
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ticket_storm_utility_match();

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_extraction_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_attachments_select_admin ON public.ticket_attachments;
CREATE POLICY ticket_attachments_select_admin ON public.ticket_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS ticket_attachments_write_super_admin ON public.ticket_attachments;
CREATE POLICY ticket_attachments_write_super_admin ON public.ticket_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS ticket_payloads_select_admin ON public.ticket_payloads;
CREATE POLICY ticket_payloads_select_admin ON public.ticket_payloads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS ticket_payloads_write_super_admin ON public.ticket_payloads;
CREATE POLICY ticket_payloads_write_super_admin ON public.ticket_payloads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS ticket_extraction_sessions_select_admin ON public.ticket_extraction_sessions;
CREATE POLICY ticket_extraction_sessions_select_admin ON public.ticket_extraction_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS ticket_extraction_sessions_write_super_admin ON public.ticket_extraction_sessions;
CREATE POLICY ticket_extraction_sessions_write_super_admin ON public.ticket_extraction_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'SUPER_ADMIN'
    )
  );
