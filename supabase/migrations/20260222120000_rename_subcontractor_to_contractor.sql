-- Align legacy subcontractor schema objects to contractor naming expected by app code.

BEGIN;

-- 1) Rename core tables when legacy names still exist.
DO $$
BEGIN
  IF to_regclass('public.subcontractors') IS NOT NULL
     AND to_regclass('public.contractors') IS NULL THEN
    ALTER TABLE public.subcontractors RENAME TO contractors;
  END IF;

  IF to_regclass('public.subcontractor_rates') IS NOT NULL
     AND to_regclass('public.contractor_rates') IS NULL THEN
    ALTER TABLE public.subcontractor_rates RENAME TO contractor_rates;
  END IF;

  IF to_regclass('public.subcontractor_banking') IS NOT NULL
     AND to_regclass('public.contractor_banking') IS NULL THEN
    ALTER TABLE public.subcontractor_banking RENAME TO contractor_banking;
  END IF;

  IF to_regclass('public.subcontractor_invoices') IS NOT NULL
     AND to_regclass('public.contractor_invoices') IS NULL THEN
    ALTER TABLE public.subcontractor_invoices RENAME TO contractor_invoices;
  END IF;
END $$;

-- 2) Rename foreign-key columns from subcontractor_id -> contractor_id where needed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'time_entries' AND column_name = 'subcontractor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'time_entries' AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.time_entries RENAME COLUMN subcontractor_id TO contractor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expense_reports' AND column_name = 'subcontractor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expense_reports' AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.expense_reports RENAME COLUMN subcontractor_id TO contractor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'damage_assessments' AND column_name = 'subcontractor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'damage_assessments' AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.damage_assessments RENAME COLUMN subcontractor_id TO contractor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tax_1099_tracking' AND column_name = 'subcontractor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tax_1099_tracking' AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.tax_1099_tracking RENAME COLUMN subcontractor_id TO contractor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_assets' AND column_name = 'subcontractor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_assets' AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.media_assets RENAME COLUMN subcontractor_id TO contractor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_rates' AND column_name = 'subcontractor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_rates' AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.contractor_rates RENAME COLUMN subcontractor_id TO contractor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_banking' AND column_name = 'subcontractor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_banking' AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.contractor_banking RENAME COLUMN subcontractor_id TO contractor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_invoices' AND column_name = 'subcontractor_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contractor_invoices' AND column_name = 'contractor_id'
  ) THEN
    ALTER TABLE public.contractor_invoices RENAME COLUMN subcontractor_id TO contractor_id;
  END IF;
END $$;

-- 3) Rename indexes and constraints to keep schema naming coherent.
ALTER INDEX IF EXISTS public.idx_subcontractors_profile RENAME TO idx_contractors_profile;
ALTER INDEX IF EXISTS public.idx_subcontractors_status RENAME TO idx_contractors_status;
ALTER INDEX IF EXISTS public.idx_subcontractors_eligible RENAME TO idx_contractors_eligible;
ALTER INDEX IF EXISTS public.idx_time_subcontractor RENAME TO idx_time_contractor;
ALTER INDEX IF EXISTS public.idx_expense_report_subcontractor RENAME TO idx_expense_report_contractor;
ALTER INDEX IF EXISTS public.idx_assessment_subcontractor RENAME TO idx_assessment_contractor;
ALTER INDEX IF EXISTS public.idx_invoice_subcontractor RENAME TO idx_invoice_contractor;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_subcontractor_year'
      AND conrelid = 'public.tax_1099_tracking'::regclass
  ) THEN
    ALTER TABLE public.tax_1099_tracking
      RENAME CONSTRAINT unique_subcontractor_year TO unique_contractor_year;
  END IF;
END $$;

-- 4) Rename contractor-related RLS policy names for consistency.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contractors' AND policyname = 'subcontractors_select_own'
  ) THEN
    ALTER POLICY subcontractors_select_own ON public.contractors RENAME TO contractors_select_own;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contractors' AND policyname = 'subcontractors_select_admin'
  ) THEN
    ALTER POLICY subcontractors_select_admin ON public.contractors RENAME TO contractors_select_admin;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contractors' AND policyname = 'subcontractors_update_own'
  ) THEN
    ALTER POLICY subcontractors_update_own ON public.contractors RENAME TO contractors_update_own;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contractors' AND policyname = 'subcontractors_write_admin'
  ) THEN
    ALTER POLICY subcontractors_write_admin ON public.contractors RENAME TO contractors_write_admin;
  END IF;
END $$;

-- 5) Rename legacy trigger name on the contractors table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_subcontractors_updated_at'
      AND tgrelid = 'public.contractors'::regclass
  ) THEN
    ALTER TRIGGER update_subcontractors_updated_at ON public.contractors
      RENAME TO update_contractors_updated_at;
  END IF;
END $$;

-- Refresh PostgREST schema cache so API immediately sees renamed tables.
NOTIFY pgrst, 'reload schema';

COMMIT;
