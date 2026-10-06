-- Required table privileges for the service-only invitation finalizer and failure audit.
BEGIN;
GRANT SELECT, INSERT ON public.contractors TO service_role;
GRANT INSERT ON public.audit_logs TO service_role;
COMMIT;
