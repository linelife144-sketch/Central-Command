BEGIN;

-- The time-entry-photos bucket is private (vehicle/license-plate photos are
-- PII under admin review). Contractors may upload/read only objects under
-- their own contractor_id prefix (storagePath = "{contractorId}/..."); admins
-- may read everything for claim review.
CREATE POLICY time_entry_photos_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'time-entry-photos'
    AND EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.profile_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

CREATE POLICY time_entry_photos_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'time-entry-photos'
    AND EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.profile_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

CREATE POLICY time_entry_photos_admin ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'time-entry-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'time-entry-photos' AND public.is_admin());

NOTIFY pgrst,'reload schema';
COMMIT;
