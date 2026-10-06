BEGIN;

-- Admin Create User inserts before applying some app_metadata updates. Bind the
-- pending Auth INSERT to the server-issued, one-time setup claim instead of
-- relying on raw_app_meta_data being present in the BEFORE INSERT trigger.
CREATE TABLE private.contractor_account_setup_claims (
  contractor_id uuid PRIMARY KEY REFERENCES public.contractors(id) ON DELETE CASCADE,
  claim_token uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
REVOKE ALL ON private.contractor_account_setup_claims FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_contractor_account_setup(p_email text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 c public.contractors;
 u auth.users;
 normalized text:=lower(btrim(p_email));
 setup_token uuid:=pg_catalog.gen_random_uuid();
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(normalized,734918206));
 SELECT * INTO c FROM public.contractors WHERE lower(business_email)=normalized AND is_deleted IS NOT TRUE FOR UPDATE;
 IF c.id IS NULL OR c.onboarding_completed_at IS NOT NULL THEN RETURN NULL; END IF;
 SELECT * INTO u FROM auth.users WHERE lower(email)=normalized;
 IF u.id IS NOT NULL AND (
   (u.raw_app_meta_data->>'contractor_record_id' IS DISTINCT FROM c.id::text
    AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=u.id AND p.role::text='CONTRACTOR' AND p.is_active AND p.must_reset_password AND u.email_confirmed_at IS NULL))
   OR (c.profile_id IS NOT NULL AND c.profile_id<>u.id)
 ) THEN RETURN NULL; END IF;
 IF c.profile_id IS NOT NULL AND u.id IS NULL THEN RETURN NULL; END IF;
 IF c.account_setup_requested_at>clock_timestamp()-interval '2 minutes' THEN RETURN NULL; END IF;
 UPDATE public.contractors SET account_setup_requested_at=clock_timestamp() WHERE id=c.id;
 INSERT INTO private.contractor_account_setup_claims(contractor_id,claim_token,expires_at,consumed_at)
 VALUES(c.id,setup_token,clock_timestamp()+interval '10 minutes',NULL)
 ON CONFLICT(contractor_id) DO UPDATE SET claim_token=excluded.claim_token,expires_at=excluded.expires_at,consumed_at=NULL;
 RETURN jsonb_build_object('id',c.id,'email',normalized,'first_name',c.first_name,'last_name',c.last_name,'auth_user_id',u.id,'claim_token',setup_token);
END $$;

CREATE OR REPLACE FUNCTION private.guard_internal_account_creation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.contractors; setup_claim private.contractor_account_setup_claims;
BEGIN
 IF NEW.raw_app_meta_data->>'role' IN ('CEO','SUPER_ADMIN','ADMIN') THEN RETURN NEW; END IF;
 IF NEW.email IS NULL THEN RAISE EXCEPTION 'Internally added contractor required' USING ERRCODE='42501'; END IF;
 -- Supabase Auth may insert a user before persisting server-only app_metadata.
 -- A high-entropy, one-use claim from the protected setup RPC authorizes only
 -- this exact pre-added email/contractor pair for a short window.
 IF NEW.raw_user_meta_data ? 'contractor_setup_claim_token' THEN
  SELECT sc.* INTO setup_claim FROM private.contractor_account_setup_claims sc
  JOIN public.contractors co ON co.id=sc.contractor_id
  WHERE sc.claim_token::text=NEW.raw_user_meta_data->>'contractor_setup_claim_token'
   AND sc.contractor_id::text=NEW.raw_user_meta_data->>'contractor_record_id'
   AND sc.consumed_at IS NULL AND sc.expires_at>clock_timestamp()
   AND co.profile_id IS NULL AND co.is_deleted IS NOT TRUE
   AND lower(co.business_email)=lower(NEW.email)
  FOR UPDATE OF sc,co;
  IF setup_claim.contractor_id IS NULL THEN RAISE EXCEPTION 'Valid contractor setup request required' USING ERRCODE='42501'; END IF;
  UPDATE private.contractor_account_setup_claims SET consumed_at=clock_timestamp() WHERE contractor_id=setup_claim.contractor_id;
  RETURN NEW;
 END IF;
 -- Preserve service-created contractor accounts whose trusted app metadata is
 -- already present during INSERT.
 IF NEW.raw_app_meta_data->>'role' IS DISTINCT FROM 'CONTRACTOR' THEN
  RAISE EXCEPTION 'Internally added contractor required' USING ERRCODE='42501';
 END IF;
 SELECT * INTO c FROM public.contractors WHERE id::text=NEW.raw_app_meta_data->>'contractor_record_id' FOR UPDATE;
 IF c.id IS NULL OR c.profile_id IS NOT NULL OR c.is_deleted OR lower(c.business_email) IS DISTINCT FROM lower(NEW.email)
  OR c.account_setup_requested_at IS NULL OR c.account_setup_requested_at<clock_timestamp()-interval '10 minutes' THEN
  RAISE EXCEPTION 'Valid contractor setup request required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE lower(email)=lower(NEW.email)) THEN
  RAISE EXCEPTION 'Account already exists' USING ERRCODE='23505'; END IF;
 RETURN NEW;
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
