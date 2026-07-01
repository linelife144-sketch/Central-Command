-- Expand storm event status model to operational lifecycle labels.

UPDATE public.storm_events
SET status = CASE UPPER(status)
  WHEN 'PLANNED' THEN 'MOB'
  WHEN 'COMPLETE' THEN 'DE-MOB'
  WHEN 'PAUSED' THEN 'RELEASED'
  WHEN 'ARCHIVED' THEN 'CLOSED'
  ELSE UPPER(status)
END
WHERE status IS NOT NULL;

ALTER TABLE public.storm_events
  ALTER COLUMN status SET DEFAULT 'MOB';

ALTER TABLE public.storm_events
  DROP CONSTRAINT IF EXISTS storm_events_status_check;

ALTER TABLE public.storm_events
  ADD CONSTRAINT storm_events_status_check CHECK (
    status IN ('MOB', 'ACTIVE', 'DE-MOB', 'RELEASED', 'BILLING', 'CLOSED')
  );
