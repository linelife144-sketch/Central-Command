-- Remove vehicle registration requirement from contractor onboarding gate.
CREATE OR REPLACE FUNCTION public.complete_contractor_onboarding(p_profile_id uuid, p_details jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 c public.contractors;
 photo text := nullif(p_details->>'vehicle_registration_photo_path', '');
BEGIN
 IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Server only' USING ERRCODE='42501';
 END IF;

 SELECT c1.* INTO c FROM public.contractors c1
 JOIN public.profiles p ON p.id = c1.profile_id
 JOIN auth.users u ON u.id = p.id
 WHERE c1.profile_id = p_profile_id
   AND c1.is_deleted IS NOT TRUE
   AND p.role::text = 'CONTRACTOR'
   AND p.is_active
   AND NOT p.must_reset_password
   AND u.email_confirmed_at IS NOT NULL
   AND coalesce(u.encrypted_password, '') <> ''
   AND lower(c1.business_email) = lower(u.email)
 FOR UPDATE OF c1, p;

 IF c.id IS NULL THEN
  RAISE EXCEPTION 'Verified active contractor required' USING ERRCODE='42501';
 END IF;

 IF c.onboarding_completed_at IS NOT NULL THEN
  RAISE EXCEPTION 'Onboarding already completed' USING ERRCODE='23514';
 END IF;

 IF jsonb_typeof(p_details) IS DISTINCT FROM 'object'
  OR length(btrim(coalesce(p_details->>'first_name', ''))) NOT BETWEEN 1 AND 80
  OR length(btrim(coalesce(p_details->>'last_name', ''))) NOT BETWEEN 1 AND 80
  OR length(btrim(coalesce(p_details->>'address_line1', ''))) NOT BETWEEN 1 AND 255
  OR length(coalesce(p_details->>'address_line2', '')) > 255
  OR length(btrim(coalesce(p_details->>'city', ''))) NOT BETWEEN 1 AND 100
  OR coalesce(p_details->>'state', '') !~ '^[A-Z]{2}$'
  OR coalesce(p_details->>'zip_code', '') !~ '^[0-9]{5}(-[0-9]{4})?$' THEN
  RAISE EXCEPTION 'Names and full starting address required' USING ERRCODE='23514';
 END IF;

 IF photo IS NOT NULL AND (
   split_part(photo, '/', 1) <> c.id::text
   OR photo !~ '^[0-9a-f-]+/[0-9a-f-]+[.](jpg|png|webp)$'
   OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'contractor-registration-tags' AND name = photo)
 ) THEN
  RAISE EXCEPTION 'Upload your own vehicle registration tag photo' USING ERRCODE='23514';
 END IF;

 UPDATE public.profiles
 SET first_name = btrim(p_details->>'first_name'),
     last_name = btrim(p_details->>'last_name')
 WHERE id = p_profile_id;

 UPDATE public.contractors
 SET first_name = btrim(p_details->>'first_name'),
     last_name = btrim(p_details->>'last_name'),
     address_line1 = btrim(p_details->>'address_line1'),
     address_line2 = nullif(btrim(p_details->>'address_line2'), ''),
     city = btrim(p_details->>'city'),
     state = p_details->>'state',
     zip_code = p_details->>'zip_code',
     vehicle_registration_photo_path = coalesce(photo, c.vehicle_registration_photo_path),
     onboarding_completed_at = clock_timestamp()
 WHERE id = c.id;

 INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, user_role, new_values, change_summary)
 VALUES (
   'CONTRACTOR_ONBOARDING_COMPLETED',
   'contractor',
   c.id,
   p_profile_id,
   'CONTRACTOR',
   jsonb_build_object('onboarding_complete', true),
   'Contractor completed account onboarding'
 );
END $$;

REVOKE ALL ON FUNCTION public.complete_contractor_onboarding(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_contractor_onboarding(uuid, jsonb) TO service_role;
