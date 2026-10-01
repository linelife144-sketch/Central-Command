-- Complete contractor naming without recreating tables or changing permissions.
-- Old identifiers below are inputs to the rename, not supported application names.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE item record; target text; definition text; routine_kind text;
BEGIN
  -- Changing an existing parameter name requires dropping its function in PostgreSQL.
  -- Stop rather than dropping dependent objects or changing caller permissions.
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND EXISTS (SELECT 1 FROM unnest(p.proargnames) arg WHERE arg ILIKE '%subcontractor%')) THEN
    RAISE EXCEPTION 'A legacy routine parameter requires a separately reviewed signature migration.';
  END IF;

  FOR item IN SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f') AND c.relname LIKE '%subcontractor%' LOOP
    target := replace(item.relname,'subcontractor','contractor');
    IF to_regclass(format('public.%I',target)) IS NOT NULL THEN
      RAISE EXCEPTION 'Both % and % exist. Reconcile them before renaming.',item.relname,target;
    END IF;
    EXECUTE format('ALTER %s public.%I RENAME TO %I',CASE item.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'S' THEN 'SEQUENCE' WHEN 'f' THEN 'FOREIGN TABLE' ELSE 'TABLE' END,item.relname,target);
  END LOOP;

  FOR item IN SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='public' AND column_name LIKE '%subcontractor%' LOOP
    target := replace(item.column_name,'subcontractor','contractor');
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=item.table_name AND column_name=target) THEN
      RAISE EXCEPTION 'Both legacy and canonical columns exist on %. Reconcile them before renaming.',item.table_name;
    END IF;
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I',item.table_name,item.column_name,target);
  END LOOP;

  FOR item IN SELECT c.relname,con.conname FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND con.conname LIKE '%subcontractor%' LOOP
    EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',item.relname,item.conname,replace(item.conname,'subcontractor','contractor'));
  END LOOP;
  FOR item IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('i','I') AND c.relname LIKE '%subcontractor%' LOOP
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I',item.relname,replace(item.relname,'subcontractor','contractor'));
  END LOOP;
  FOR item IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND policyname LIKE '%subcontractor%' LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I',item.policyname,item.tablename,replace(item.policyname,'subcontractor','contractor'));
  END LOOP;
  FOR item IN SELECT c.relname,t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgname LIKE '%subcontractor%' LOOP
    EXECUTE format('ALTER TRIGGER %I ON public.%I RENAME TO %I',item.tgname,item.relname,replace(item.tgname,'subcontractor','contractor'));
  END LOOP;

  FOR item IN SELECT t.typname,e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
      JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND e.enumlabel ILIKE '%subcontractor%' LOOP
    target := replace(replace(replace(item.enumlabel,'SUBCONTRACTOR','CONTRACTOR'),'Subcontractor','Contractor'),'subcontractor','contractor');
    IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname=item.typname AND e.enumlabel=target) THEN
      RAISE EXCEPTION 'Both legacy and canonical enum labels exist in %. Reconcile them first.',item.typname;
    END IF;
    EXECUTE format('ALTER TYPE public.%I RENAME VALUE %L TO %L',item.typname,item.enumlabel,target);
  END LOOP;

  FOR item IN SELECT p.oid,p.proname,p.prokind,pg_get_function_identity_arguments(p.oid) args
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.prokind IN ('f','p') AND (p.proname ILIKE '%subcontractor%' OR p.prosrc ILIKE '%subcontractor%') LOOP
    routine_kind := CASE item.prokind WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END;
    IF item.proname LIKE '%subcontractor%' THEN
      EXECUTE format('ALTER %s public.%I(%s) RENAME TO %I',routine_kind,item.proname,item.args,replace(item.proname,'subcontractor','contractor'));
    END IF;
    definition := pg_get_functiondef(item.oid);
    definition := replace(replace(replace(definition,'SUBCONTRACTOR','CONTRACTOR'),'Subcontractor','Contractor'),'subcontractor','contractor');
    -- CREATE OR REPLACE keeps the routine OID, grants, ownership and execution context.
    EXECUTE definition;
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
