-- Evaluate the authenticated identity once for the staff policies added by the permissions migration.
-- Only the new private.has_permission(auth.uid(), ...) predicates are rewritten.
BEGIN;
DO $policy$
DECLARE item record; stmt text;
BEGIN
 FOR item IN SELECT * FROM pg_policies WHERE schemaname IN('public','storage')
 AND (qual LIKE '%private.has_permission(auth.uid(),%' OR with_check LIKE '%private.has_permission(auth.uid(),%') LOOP
  stmt:=format('ALTER POLICY %I ON %I.%I',item.policyname,item.schemaname,item.tablename);
  IF item.qual IS NOT NULL THEN stmt:=stmt||' USING('||replace(item.qual,'private.has_permission(auth.uid(),','private.has_permission((SELECT auth.uid()),')||')'; END IF;
  IF item.with_check IS NOT NULL THEN stmt:=stmt||' WITH CHECK('||replace(item.with_check,'private.has_permission(auth.uid(),','private.has_permission((SELECT auth.uid()),')||')'; END IF;
  EXECUTE stmt;
 END LOOP;
END $policy$;
COMMIT;
