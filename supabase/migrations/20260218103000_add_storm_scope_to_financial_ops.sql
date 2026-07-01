-- Add storm_event scope to core financial/operational roots and enforce cross-entity consistency.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.contractor_invoices') IS NULL
    AND to_regclass('public.subcontractor_invoices') IS NOT NULL THEN
    ALTER TABLE public.subcontractor_invoices
      RENAME TO contractor_invoices;
  END IF;
END $$;

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS storm_event_id uuid;

ALTER TABLE public.expense_reports
  ADD COLUMN IF NOT EXISTS storm_event_id uuid;

ALTER TABLE public.contractor_invoices
  ADD COLUMN IF NOT EXISTS storm_event_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'time_entries_storm_event_id_fkey'
      AND conrelid = 'public.time_entries'::regclass
  ) THEN
    ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_storm_event_id_fkey
      FOREIGN KEY (storm_event_id)
      REFERENCES public.storm_events(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expense_reports_storm_event_id_fkey'
      AND conrelid = 'public.expense_reports'::regclass
  ) THEN
    ALTER TABLE public.expense_reports
      ADD CONSTRAINT expense_reports_storm_event_id_fkey
      FOREIGN KEY (storm_event_id)
      REFERENCES public.storm_events(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contractor_invoices_storm_event_id_fkey'
      AND conrelid = 'public.contractor_invoices'::regclass
  ) THEN
    ALTER TABLE public.contractor_invoices
      ADD CONSTRAINT contractor_invoices_storm_event_id_fkey
      FOREIGN KEY (storm_event_id)
      REFERENCES public.storm_events(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_time_entries_storm_event_id ON public.time_entries(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_storm_event_id ON public.expense_reports(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_storm_event_id ON public.contractor_invoices(storm_event_id);

-- Backfill time_entries from linked ticket scope when available.
UPDATE public.time_entries te
SET storm_event_id = t.storm_event_id
FROM public.tickets t
WHERE te.storm_event_id IS NULL
  AND te.ticket_id = t.id
  AND t.storm_event_id IS NOT NULL;

-- Backfill expense reports when all linked expense items point to one storm-scoped ticket.
WITH report_single_storm AS (
  SELECT
    ei.expense_report_id,
    MIN(t.storm_event_id::text)::uuid AS storm_event_id
  FROM public.expense_items ei
  JOIN public.tickets t
    ON t.id = ei.ticket_id
  WHERE t.storm_event_id IS NOT NULL
  GROUP BY ei.expense_report_id
  HAVING COUNT(DISTINCT t.storm_event_id) = 1
)
UPDATE public.expense_reports er
SET storm_event_id = rss.storm_event_id
FROM report_single_storm rss
WHERE er.id = rss.expense_report_id
  AND er.storm_event_id IS NULL;

-- Backfill invoices from linked time entries (single storm only).
WITH invoice_time_single_storm AS (
  SELECT
    te.invoice_id,
    MIN(te.storm_event_id::text)::uuid AS storm_event_id
  FROM public.time_entries te
  WHERE te.invoice_id IS NOT NULL
    AND te.storm_event_id IS NOT NULL
  GROUP BY te.invoice_id
  HAVING COUNT(DISTINCT te.storm_event_id) = 1
)
UPDATE public.contractor_invoices ci
SET storm_event_id = its.storm_event_id
FROM invoice_time_single_storm its
WHERE ci.id = its.invoice_id
  AND ci.storm_event_id IS NULL;

-- Backfill remaining invoices from linked expense reports (single storm only).
WITH invoice_expense_single_storm AS (
  SELECT
    er.invoice_id,
    MIN(er.storm_event_id::text)::uuid AS storm_event_id
  FROM public.expense_reports er
  WHERE er.invoice_id IS NOT NULL
    AND er.storm_event_id IS NOT NULL
  GROUP BY er.invoice_id
  HAVING COUNT(DISTINCT er.storm_event_id) = 1
)
UPDATE public.contractor_invoices ci
SET storm_event_id = iess.storm_event_id
FROM invoice_expense_single_storm iess
WHERE ci.id = iess.invoice_id
  AND ci.storm_event_id IS NULL;

-- Backfill expense reports/time entries from linked invoices after invoice backfill.
UPDATE public.expense_reports er
SET storm_event_id = ci.storm_event_id
FROM public.contractor_invoices ci
WHERE er.invoice_id = ci.id
  AND er.storm_event_id IS NULL
  AND ci.storm_event_id IS NOT NULL;

UPDATE public.time_entries te
SET storm_event_id = ci.storm_event_id
FROM public.contractor_invoices ci
WHERE te.invoice_id = ci.id
  AND te.storm_event_id IS NULL
  AND ci.storm_event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_time_entry_storm_scope()
RETURNS trigger AS $$
DECLARE
  ticket_storm uuid;
  invoice_storm uuid;
BEGIN
  IF NEW.ticket_id IS NOT NULL THEN
    SELECT t.storm_event_id INTO ticket_storm
    FROM public.tickets t
    WHERE t.id = NEW.ticket_id;

    IF ticket_storm IS NOT NULL THEN
      IF NEW.storm_event_id IS NULL THEN
        NEW.storm_event_id := ticket_storm;
      ELSIF NEW.storm_event_id <> ticket_storm THEN
        RAISE EXCEPTION 'time_entries.storm_event_id (%) must match tickets.storm_event_id (%)', NEW.storm_event_id, ticket_storm;
      END IF;
    END IF;
  END IF;

  IF NEW.invoice_id IS NOT NULL THEN
    SELECT ci.storm_event_id INTO invoice_storm
    FROM public.contractor_invoices ci
    WHERE ci.id = NEW.invoice_id;

    IF invoice_storm IS NOT NULL THEN
      IF NEW.storm_event_id IS NULL THEN
        NEW.storm_event_id := invoice_storm;
      ELSIF NEW.storm_event_id <> invoice_storm THEN
        RAISE EXCEPTION 'time_entries.storm_event_id (%) must match contractor_invoices.storm_event_id (%)', NEW.storm_event_id, invoice_storm;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.enforce_expense_report_storm_scope()
RETURNS trigger AS $$
DECLARE
  invoice_storm uuid;
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT ci.storm_event_id INTO invoice_storm
    FROM public.contractor_invoices ci
    WHERE ci.id = NEW.invoice_id;

    IF invoice_storm IS NOT NULL THEN
      IF NEW.storm_event_id IS NULL THEN
        NEW.storm_event_id := invoice_storm;
      ELSIF NEW.storm_event_id <> invoice_storm THEN
        RAISE EXCEPTION 'expense_reports.storm_event_id (%) must match contractor_invoices.storm_event_id (%)', NEW.storm_event_id, invoice_storm;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.enforce_invoice_storm_scope()
RETURNS trigger AS $$
BEGIN
  IF NEW.storm_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.time_entries te
    WHERE te.invoice_id = NEW.id
      AND te.storm_event_id IS NOT NULL
      AND te.storm_event_id <> NEW.storm_event_id
  ) THEN
    RAISE EXCEPTION 'contractor_invoices.storm_event_id (%) conflicts with linked time entries', NEW.storm_event_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.expense_reports er
    WHERE er.invoice_id = NEW.id
      AND er.storm_event_id IS NOT NULL
      AND er.storm_event_id <> NEW.storm_event_id
  ) THEN
    RAISE EXCEPTION 'contractor_invoices.storm_event_id (%) conflicts with linked expense reports', NEW.storm_event_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_enforce_time_entry_storm_scope ON public.time_entries;
CREATE TRIGGER tr_enforce_time_entry_storm_scope
BEFORE INSERT OR UPDATE OF storm_event_id, ticket_id, invoice_id
ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_time_entry_storm_scope();

DROP TRIGGER IF EXISTS tr_enforce_expense_report_storm_scope ON public.expense_reports;
CREATE TRIGGER tr_enforce_expense_report_storm_scope
BEFORE INSERT OR UPDATE OF storm_event_id, invoice_id
ON public.expense_reports
FOR EACH ROW
EXECUTE FUNCTION public.enforce_expense_report_storm_scope();

DROP TRIGGER IF EXISTS tr_enforce_invoice_storm_scope ON public.contractor_invoices;
CREATE TRIGGER tr_enforce_invoice_storm_scope
BEFORE INSERT OR UPDATE OF storm_event_id
ON public.contractor_invoices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_invoice_storm_scope();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'time_entries_storm_event_required'
      AND conrelid = 'public.time_entries'::regclass
  ) THEN
    ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_storm_event_required
      CHECK (storm_event_id IS NOT NULL)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expense_reports_storm_event_required'
      AND conrelid = 'public.expense_reports'::regclass
  ) THEN
    ALTER TABLE public.expense_reports
      ADD CONSTRAINT expense_reports_storm_event_required
      CHECK (storm_event_id IS NOT NULL)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contractor_invoices_storm_event_required'
      AND conrelid = 'public.contractor_invoices'::regclass
  ) THEN
    ALTER TABLE public.contractor_invoices
      ADD CONSTRAINT contractor_invoices_storm_event_required
      CHECK (storm_event_id IS NOT NULL)
      NOT VALID;
  END IF;
END $$;

COMMIT;
