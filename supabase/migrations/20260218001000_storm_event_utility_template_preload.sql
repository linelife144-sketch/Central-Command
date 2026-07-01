-- Enforce storm_event.utility_client -> preloaded ticket template.
-- Enforce tickets.template_key always matches parent storm event template.
-- Add storm_events.config_snapshot for frozen environment settings.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ticket_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_client text NOT NULL,
  template_key text NOT NULL,
  name text NOT NULL,
  description text,
  field_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_templates_unique_utility_key UNIQUE (utility_client, template_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ticket_templates_one_default_per_utility
  ON public.ticket_templates (utility_client)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_ticket_templates_utility_client
  ON public.ticket_templates (utility_client);

ALTER TABLE public.storm_events
  ADD COLUMN IF NOT EXISTS ticket_template_key text,
  ADD COLUMN IF NOT EXISTS config_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_storm_events_ticket_template_key
  ON public.storm_events (ticket_template_key);

INSERT INTO public.ticket_templates (utility_client, template_key, name, description, field_definitions, is_active, is_default)
VALUES
  ('ENTERGY', 'ENTERGY_TROUBLE_TICKET_V1', 'Entergy Trouble Ticket v1', 'Default Entergy ticket fields', '[]'::jsonb, true, true),
  ('DUKE', 'DUKE_TROUBLE_TICKET_V1', 'Duke Trouble Ticket v1', 'Default Duke ticket fields', '[]'::jsonb, true, true),
  ('CENTERPOINT', 'CENTERPOINT_TROUBLE_TICKET_V1', 'CenterPoint Trouble Ticket v1', 'Default CenterPoint ticket fields', '[]'::jsonb, true, true),
  ('ONCOR', 'ONCOR_TROUBLE_TICKET_V1', 'Oncor Trouble Ticket v1', 'Default Oncor ticket fields', '[]'::jsonb, true, true),
  ('FPL', 'FPL_TROUBLE_TICKET_V1', 'FPL Trouble Ticket v1', 'Default FPL ticket fields', '[]'::jsonb, true, true),
  ('TECO', 'TECO_TROUBLE_TICKET_V1', 'TECO Trouble Ticket v1', 'Default TECO ticket fields', '[]'::jsonb, true, true)
ON CONFLICT (utility_client, template_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_storm_event_ticket_template_key()
RETURNS trigger AS $$
DECLARE
  default_key text;
BEGIN
  IF NEW.ticket_template_key IS NOT NULL THEN
    PERFORM 1
    FROM public.ticket_templates tt
    WHERE tt.utility_client = NEW.utility_client
      AND tt.template_key = NEW.ticket_template_key
      AND tt.is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid ticket_template_key % for utility_client %', NEW.ticket_template_key, NEW.utility_client;
    END IF;
  ELSE
    SELECT tt.template_key INTO default_key
    FROM public.ticket_templates tt
    WHERE tt.utility_client = NEW.utility_client
      AND tt.is_default = true
      AND tt.is_active = true
    LIMIT 1;

    IF default_key IS NULL THEN
      RAISE EXCEPTION 'No default ticket template configured for utility_client %', NEW.utility_client;
    END IF;

    NEW.ticket_template_key := default_key;
  END IF;

  NEW.config_snapshot :=
    COALESCE(NEW.config_snapshot, '{}'::jsonb)
    || jsonb_build_object(
      'utility_client', NEW.utility_client,
      'ticket_template_key', NEW.ticket_template_key
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_storm_event_ticket_template_key ON public.storm_events;
CREATE TRIGGER tr_set_storm_event_ticket_template_key
BEFORE INSERT OR UPDATE OF utility_client, ticket_template_key
ON public.storm_events
FOR EACH ROW
EXECUTE FUNCTION public.set_storm_event_ticket_template_key();

CREATE OR REPLACE FUNCTION public.inherit_ticket_template_key_from_storm_event()
RETURNS trigger AS $$
DECLARE
  storm_key text;
BEGIN
  SELECT se.ticket_template_key INTO storm_key
  FROM public.storm_events se
  WHERE se.id = NEW.storm_event_id;

  IF storm_key IS NULL THEN
    RAISE EXCEPTION 'storm_event_id % does not exist or has no ticket_template_key', NEW.storm_event_id;
  END IF;

  IF NEW.template_key IS NULL THEN
    NEW.template_key := storm_key;
  END IF;

  IF NEW.template_key <> storm_key THEN
    RAISE EXCEPTION 'tickets.template_key (%) must match storm_events.ticket_template_key (%)', NEW.template_key, storm_key;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_inherit_ticket_template_key ON public.tickets;
CREATE TRIGGER tr_inherit_ticket_template_key
BEFORE INSERT OR UPDATE OF storm_event_id, template_key
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.inherit_ticket_template_key_from_storm_event();

UPDATE public.storm_events se
SET ticket_template_key = tt.template_key,
    config_snapshot = COALESCE(se.config_snapshot, '{}'::jsonb)
      || jsonb_build_object('utility_client', se.utility_client, 'ticket_template_key', tt.template_key)
FROM public.ticket_templates tt
WHERE se.ticket_template_key IS NULL
  AND tt.utility_client = se.utility_client
  AND tt.is_default = true
  AND tt.is_active = true;

UPDATE public.tickets t
SET template_key = se.ticket_template_key
FROM public.storm_events se
WHERE t.template_key IS NULL
  AND t.storm_event_id = se.id
  AND se.ticket_template_key IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.storm_events WHERE ticket_template_key IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.storm_events
      ALTER COLUMN ticket_template_key SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_templates_select_admin ON public.ticket_templates;
CREATE POLICY ticket_templates_select_admin ON public.ticket_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS ticket_templates_write_super_admin ON public.ticket_templates;
CREATE POLICY ticket_templates_write_super_admin ON public.ticket_templates
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

COMMIT;
