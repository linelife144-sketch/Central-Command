-- Rename legacy storm_project terminology to storm_event in existing Supabase schemas.
-- This migration is defensive and no-ops when legacy objects do not exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'storm_projects'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'storm_events'
  ) THEN
    EXECUTE 'ALTER TABLE public.storm_projects RENAME TO storm_events';
  END IF;
END $$;

DO $$
DECLARE
  column_record RECORD;
BEGIN
  FOR column_record IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'storm_project_id'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = column_record.table_schema
        AND table_name = column_record.table_name
        AND column_name = 'storm_event_id'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.%I RENAME COLUMN storm_project_id TO storm_event_id',
        column_record.table_schema,
        column_record.table_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  index_record RECORD;
  next_index_name TEXT;
BEGIN
  FOR index_record IN
    SELECT schemaname, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname ILIKE '%storm_project%'
  LOOP
    next_index_name := regexp_replace(index_record.indexname, 'storm_project', 'storm_event', 'gi');

    IF to_regclass(format('%I.%I', index_record.schemaname, next_index_name)) IS NULL THEN
      EXECUTE format(
        'ALTER INDEX %I.%I RENAME TO %I',
        index_record.schemaname,
        index_record.indexname,
        next_index_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  constraint_record RECORD;
  next_constraint_name TEXT;
BEGIN
  FOR constraint_record IN
    SELECT n.nspname AS schemaname, c.relname AS tablename, con.conname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND con.conname ILIKE '%storm_project%'
  LOOP
    next_constraint_name := regexp_replace(constraint_record.conname, 'storm_project', 'storm_event', 'gi');

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint existing
      JOIN pg_class existing_table ON existing_table.oid = existing.conrelid
      JOIN pg_namespace existing_schema ON existing_schema.oid = existing_table.relnamespace
      WHERE existing_schema.nspname = constraint_record.schemaname
        AND existing_table.relname = constraint_record.tablename
        AND existing.conname = next_constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I',
        constraint_record.schemaname,
        constraint_record.tablename,
        constraint_record.conname,
        next_constraint_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  policy_record RECORD;
  next_policy_name TEXT;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname ILIKE '%storm_project%'
  LOOP
    next_policy_name := regexp_replace(policy_record.policyname, 'storm_project', 'storm_event', 'gi');

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies existing
      WHERE existing.schemaname = policy_record.schemaname
        AND existing.tablename = policy_record.tablename
        AND existing.policyname = next_policy_name
    ) THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I RENAME TO %I',
        policy_record.policyname,
        policy_record.schemaname,
        policy_record.tablename,
        next_policy_name
      );
    END IF;
  END LOOP;
END $$;
