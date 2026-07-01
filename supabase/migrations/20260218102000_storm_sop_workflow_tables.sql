-- Create structured SOP workflow tables for storm operations.

BEGIN;

CREATE TABLE IF NOT EXISTS public.storm_event_phase_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id uuid NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  phase smallint NOT NULL CHECK (phase IN (1, 2, 3)),
  step_key text NOT NULL,
  step_label text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'N/A')),
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storm_event_phase_steps_unique_step UNIQUE (storm_event_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_phase_steps_storm_event ON public.storm_event_phase_steps(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_phase_steps_phase_status ON public.storm_event_phase_steps(phase, status);

CREATE TABLE IF NOT EXISTS public.storm_event_roster_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id uuid NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number >= 0),
  revision_label text,
  is_locked boolean NOT NULL DEFAULT false,
  submitted_to_client_at timestamptz,
  submitted_by uuid REFERENCES public.profiles(id),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storm_event_roster_revisions_unique_revision UNIQUE (storm_event_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_roster_revisions_storm_event ON public.storm_event_roster_revisions(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_roster_revisions_locked ON public.storm_event_roster_revisions(is_locked);

CREATE TABLE IF NOT EXISTS public.storm_event_roster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_revision_id uuid NOT NULL REFERENCES public.storm_event_roster_revisions(id) ON DELETE CASCADE,
  contractor_id uuid,
  assignment_role text,
  team_name text,
  travel_zone text,
  member_status text NOT NULL DEFAULT 'PENDING' CHECK (member_status IN ('PENDING', 'CONFIRMED', 'NO_CONTACT', 'REMOVED', 'BACKUP')),
  contact_attempts integer NOT NULL DEFAULT 0 CHECK (contact_attempts >= 0),
  contact_last_attempt_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roster_members_revision ON public.storm_event_roster_members(roster_revision_id);
CREATE INDEX IF NOT EXISTS idx_roster_members_contractor ON public.storm_event_roster_members(contractor_id);
CREATE INDEX IF NOT EXISTS idx_roster_members_status ON public.storm_event_roster_members(member_status);

CREATE TABLE IF NOT EXISTS public.storm_event_authorization_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id uuid NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  authorization_type text NOT NULL CHECK (authorization_type IN ('VERBAL', 'EMAIL', 'TEXT', 'SIGNED_NTP', 'CONTRACT')),
  source_reference text,
  authorized_at timestamptz NOT NULL DEFAULT now(),
  contact_name text,
  contact_channel text,
  received_by uuid REFERENCES public.profiles(id),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_storm_event ON public.storm_event_authorization_logs(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_authorized_at ON public.storm_event_authorization_logs(authorized_at DESC);

CREATE TABLE IF NOT EXISTS public.storm_event_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id uuid NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('NTP_DRAFT', 'NTP_SIGNED', 'ROSTER_SUBMISSION', 'WORKBOOK', 'CHECKLIST_EXPORT', 'OTHER')),
  document_name text NOT NULL,
  storage_path text,
  external_url text,
  mime_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storm_event_documents_storage_or_url CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_storm_docs_storm_event ON public.storm_event_documents(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_storm_docs_type ON public.storm_event_documents(document_type);

CREATE TABLE IF NOT EXISTS public.storm_event_logistics_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storm_event_id uuid NOT NULL REFERENCES public.storm_events(id) ON DELETE CASCADE,
  phase smallint NOT NULL CHECK (phase IN (2, 3)),
  category text NOT NULL CHECK (category IN ('AIRFARE', 'RENTAL_VEHICLE', 'LODGING', 'LIFE360', 'TIMESHEET_SETUP', 'ONBOARDING', 'MEAL_POLICY', 'OTHER')),
  contractor_id uuid,
  vendor_name text,
  reference_code text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'BOOKED', 'CONFIRMED', 'COMPLETE', 'CANCELLED')),
  effective_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistics_storm_event ON public.storm_event_logistics_entries(storm_event_id);
CREATE INDEX IF NOT EXISTS idx_logistics_phase_category ON public.storm_event_logistics_entries(phase, category);
CREATE INDEX IF NOT EXISTS idx_logistics_status ON public.storm_event_logistics_entries(status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'contractors'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'storm_event_roster_members_contractor_fk'
        AND conrelid = 'public.storm_event_roster_members'::regclass
    ) THEN
      ALTER TABLE public.storm_event_roster_members
        ADD CONSTRAINT storm_event_roster_members_contractor_fk
        FOREIGN KEY (contractor_id)
        REFERENCES public.contractors(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'storm_event_logistics_entries_contractor_fk'
        AND conrelid = 'public.storm_event_logistics_entries'::regclass
    ) THEN
      ALTER TABLE public.storm_event_logistics_entries
        ADD CONSTRAINT storm_event_logistics_entries_contractor_fk
        FOREIGN KEY (contractor_id)
        REFERENCES public.contractors(id)
        ON DELETE SET NULL;
    END IF;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'subcontractors'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'storm_event_roster_members_subcontractor_fk'
        AND conrelid = 'public.storm_event_roster_members'::regclass
    ) THEN
      ALTER TABLE public.storm_event_roster_members
        ADD CONSTRAINT storm_event_roster_members_subcontractor_fk
        FOREIGN KEY (contractor_id)
        REFERENCES public.subcontractors(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'storm_event_logistics_entries_subcontractor_fk'
        AND conrelid = 'public.storm_event_logistics_entries'::regclass
    ) THEN
      ALTER TABLE public.storm_event_logistics_entries
        ADD CONSTRAINT storm_event_logistics_entries_subcontractor_fk
        FOREIGN KEY (contractor_id)
        REFERENCES public.subcontractors(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

ALTER TABLE public.storm_event_phase_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_roster_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_roster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_authorization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storm_event_logistics_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_phase_steps_updated_at') THEN
      CREATE TRIGGER tr_phase_steps_updated_at
      BEFORE UPDATE ON public.storm_event_phase_steps
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_roster_revisions_updated_at') THEN
      CREATE TRIGGER tr_roster_revisions_updated_at
      BEFORE UPDATE ON public.storm_event_roster_revisions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_roster_members_updated_at') THEN
      CREATE TRIGGER tr_roster_members_updated_at
      BEFORE UPDATE ON public.storm_event_roster_members
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_auth_logs_updated_at') THEN
      CREATE TRIGGER tr_auth_logs_updated_at
      BEFORE UPDATE ON public.storm_event_authorization_logs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_storm_docs_updated_at') THEN
      CREATE TRIGGER tr_storm_docs_updated_at
      BEFORE UPDATE ON public.storm_event_documents
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_logistics_updated_at') THEN
      CREATE TRIGGER tr_logistics_updated_at
      BEFORE UPDATE ON public.storm_event_logistics_entries
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;

COMMIT;
