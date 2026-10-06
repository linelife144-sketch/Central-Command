-- Official Entergy forms are supplemental ticket records; ticket approval remains unchanged.
CREATE TABLE public.ticket_entergy_forms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticket_id uuid NOT NULL REFERENCES public.tickets(id),
 form_kind text NOT NULL CHECK(form_kind IN ('cleanup','damage')),
 payload jsonb NOT NULL,
 photo_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED')),
 version integer NOT NULL DEFAULT 1 CHECK(version > 0),
 created_by uuid NOT NULL REFERENCES public.profiles(id),
 saved_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 saved_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz,
 CHECK ((status='SUBMITTED')=(submitted_at IS NOT NULL))
);
CREATE INDEX ticket_entergy_forms_ticket_idx ON public.ticket_entergy_forms(ticket_id,created_at);
CREATE INDEX ticket_entergy_forms_creator_idx ON public.ticket_entergy_forms(created_by);
CREATE INDEX ticket_entergy_forms_saver_idx ON public.ticket_entergy_forms(saved_by);
CREATE UNIQUE INDEX ticket_entergy_forms_one_draft ON public.ticket_entergy_forms(ticket_id,form_kind) WHERE status='DRAFT';
ALTER TABLE public.ticket_entergy_forms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ticket_entergy_forms FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ticket_entergy_forms TO authenticated;
CREATE POLICY entergy_ticket_read ON public.ticket_entergy_forms FOR SELECT TO authenticated
 USING(private.can_access_ticket(ticket_id) AND (private.active_profile_role()='CONTRACTOR' OR private.has_permission((SELECT auth.uid()),'admin.assessments.view')));

CREATE FUNCTION private.entergy_form_definition(p_kind text) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $fn$ SELECT $definition${"cleanup":{"title":"Clean-up form","source":"Entergy Clean-up Form.pdf","sourceUrl":"/forms/entergy/clean-up.pdf","revision":null,"sections":[{"id":"cleanup","title":"Cleanup scope","description":"Describe environmental work and every material type and amount.","fields":[{"key":"environmentalCleanup","label":"Environmental cleanup","kind":"notes","required":true},{"key":"trashCleanup","label":"Trash cleanup (material type & amount)","kind":"notes","required":true}]},{"id":"location","title":"Site & access","description":"Keep the site identifiable for the Entergy crew lead.","fields":[{"key":"address","label":"Address","kind":"text","required":true},{"key":"cityTown","label":"City/Town","kind":"text","required":true},{"key":"dloc","label":"DLOC","kind":"text","required":true},{"key":"truckAccess","label":"Truck access","kind":"boolean","required":true}]},{"id":"notes","title":"Field notes","description":"Record access restrictions, disposal details, or other observations.","fields":[{"key":"notes","label":"Notes","kind":"notes","required":true}]}]},"damage":{"title":"Damage assessment","source":"Entergy Distribution Change Order.pdf","sourceUrl":"/forms/entergy/distribution-change-order.pdf","revision":"02-25-2019","sections":[{"id":"scope","title":"Equipment & activity","description":"Select every equipment type and activity covered by this change order.","fields":[{"key":"date","label":"Date","kind":"date","required":true},{"key":"equipmentTypes","label":"Equipment type","kind":"multi","options":["Transformer","Recloser","Regulator","Switch","Switch Gear","Pole","AutoTransformer","Streetlight","Capacitor","Breaker","Sectionalizer","Fault Indicator","Communication Device","Private Area Light"],"required":true},{"key":"activities","label":"Activity","kind":"multi","options":["Install","Relocate","Remove","Install/Remove","Other","Misc."],"required":true}]},{"id":"location","title":"From / to location","description":"Preserve location numbers as written, including leading zeros.","fields":[{"key":"fromLocalOffice","label":"From \u00b7 Local office","kind":"text"},{"key":"fromStoreRoom","label":"From \u00b7 Store room","kind":"text"},{"key":"fromDloc","label":"From \u00b7 Distribution location number (DLOC)","kind":"text"},{"key":"toLocalOffice","label":"To \u00b7 Local office","kind":"text"},{"key":"toStoreRoom","label":"To \u00b7 Store room","kind":"text"},{"key":"toDloc","label":"To \u00b7 Distribution location number (DLOC)","kind":"text"},{"key":"latitude","label":"GPS \u00b7 LAT","kind":"latitude"},{"key":"longitude","label":"GPS \u00b7 LONG","kind":"longitude"}]},{"id":"equipment","title":"Equipment register","description":"Three install/remove pairs on the paper form. Add rows when the site needs more.","fields":[{"key":"operation","label":"Install / remove","kind":"select","options":["Install","Remove"]},{"key":"type","label":"Type","kind":"text"},{"key":"size","label":"Size","kind":"text"},{"key":"companyEquipmentNumber","label":"Company equipment number","kind":"text"},{"key":"manufacturerSerialNumber","label":"Manufacturer serial number","kind":"text"},{"key":"phases","label":"Phase","kind":"multi","options":["A","B","C"]},{"key":"fieldPhase","label":"Field phase","kind":"select","options":["F","M","R","T","C","B"]},{"key":"counterReading","label":"Rec/Reg/Cap counter reading","kind":"text"}],"repeat":{"key":"equipmentRows","minimumRows":6}},{"id":"transformer","title":"Transformer & feeder","description":"Installation purpose, voltage, inspection disposition and bank connection.","fields":[{"key":"phaseChange","label":"Phase \u00b7 Change","kind":"boolean"},{"key":"transformerPurpose","label":"Transformer installation purpose","kind":"multi","options":["Change","Metered Customer","UnMetered Customer","Lighting","Behind Primary Meter","Company Line","Company Substation"]},{"key":"primaryVoltage","label":"Voltage \u00b7 Pri.","kind":"text"},{"key":"secondaryVoltage","label":"Voltage \u00b7 Sec.","kind":"text"},{"key":"idleTransformerInspection","label":"Idle transformer inspection","kind":"multi","options":["Reuse","Rebuild","Scrap","Spare","Inactive"]},{"key":"bankConnection","label":"Transformer bank secondary connection","kind":"multi","options":["Wye","Delta"]},{"key":"feederNumber","label":"Feeder no.","kind":"text"},{"key":"feederChange","label":"Feeder \u00b7 Change","kind":"boolean"}]},{"id":"lighting","title":"Lighting","description":"The source asks for a map for all lighting new installs or changes.","fields":[{"key":"streetLightWattage","label":"Street light \u00b7 Wattage","kind":"text"},{"key":"streetLightType","label":"Street light \u00b7 Type","kind":"text"},{"key":"privateAreaLightWattage","label":"Private area light \u00b7 Wattage","kind":"text"},{"key":"privateAreaLightType","label":"Private area light \u00b7 Type","kind":"text"},{"key":"lightingMapNotes","label":"Lighting map description / legend","kind":"notes"}]},{"id":"customerSite","title":"Customer & field address","description":"Customer and location/comments lines from the source.","fields":[{"key":"customer","label":"Customer","kind":"text"},{"key":"fieldAddressComments","label":"Field address/comments","kind":"notes","required":true}]},{"id":"switch","title":"Disconnect / lateral / bypass switch / switch gear / status","description":"Keep equipment identifiers, switch status and bypass details together.","fields":[{"key":"switchTypes","label":"Switch type","kind":"multi","options":["Disconnect","GOAB","Fuse","Switch Gear"]},{"key":"installedNumber","label":"Installed #","kind":"text"},{"key":"removedNumber","label":"Removed #","kind":"text"},{"key":"switchQuantity","label":"Quantity","kind":"text"},{"key":"switchSize","label":"Switch size","kind":"text"},{"key":"switchType","label":"Switch type (specification)","kind":"text"},{"key":"changeStatus","label":"Change status","kind":"multi","options":["New","Replace","Change"]},{"key":"switchPosition","label":"Switch position","kind":"multi","options":["Open","Closed","Bypass"]},{"key":"switchManufacturerNumber","label":"Switch manufacturer #","kind":"text"},{"key":"catalogNumber","label":"Catalog #","kind":"text"},{"key":"manufacturerSerialNumber","label":"Manufacturer serial #","kind":"text"},{"key":"manufacturerDate","label":"Manufacturer date","kind":"date"},{"key":"bypassSwitchTypes","label":"Bypass switch type","kind":"multi","options":["Disconnect","Fuse","Solid Blade","GOAB","Fuse Around","Other"]},{"key":"bypassSize","label":"Bypass size","kind":"text"},{"key":"bypassType","label":"Bypass type (specification)","kind":"text"}]},{"id":"pole","title":"Pole change out","description":"Record installed and removed size/class and pole ownership.","fields":[{"key":"poleInstallSizeClass","label":"Install size/class","kind":"text"},{"key":"poleRemoveSizeClass","label":"Remove size/class","kind":"text"},{"key":"poleOwners","label":"Owner","kind":"multi","options":["Company","ATT","Other"]},{"key":"poleOtherOwner","label":"Other owner","kind":"text"}]},{"id":"communication","title":"Communication devices","description":"Communication equipment, battery, antenna location and reason for change.","fields":[{"key":"communicationDeviceTypes","label":"Type of comm device","kind":"multi","options":["Access Point (AP)","Relay (RY)"]},{"key":"commEquipmentNumber","label":"COMM equipment #","kind":"text"},{"key":"commSerialNumber","label":"COMM serial #","kind":"text"},{"key":"commBatteryEquipmentNumber","label":"Battery equipment #","kind":"text"},{"key":"commBatterySerialNumber","label":"Battery serial #","kind":"text"},{"key":"antennaLocations","label":"Antenna location","kind":"multi","options":["w/COMM","Other Location"]},{"key":"commReasons","label":"Reason for change","kind":"multi","options":["PID","Replacement","New Installation"]}]},{"id":"controls","title":"Controls","description":"Select the equipment type at the top of the form.","fields":[{"key":"controlEquipmentNumber","label":"Control equipment #","kind":"text"},{"key":"controlSerialNumber","label":"Control serial #","kind":"text"},{"key":"commBridgeEquipmentNumber","label":"COMM bridge equipment #","kind":"text"},{"key":"commBridgeSerialNumber","label":"COMM bridge serial #","kind":"text"},{"key":"battery1EquipmentNumber","label":"Battery 1 equipment #","kind":"text"},{"key":"battery1SerialNumber","label":"Battery 1 serial #","kind":"text"},{"key":"battery2EquipmentNumber","label":"Battery 2 equipment #","kind":"text"},{"key":"battery2SerialNumber","label":"Battery 2 serial #","kind":"text"},{"key":"controlReasons","label":"Reason for change","kind":"multi","options":["PID","Replacement","New Installation"]}]},{"id":"transfers","title":"Customer transfers","description":"Accounts moved to a new DLOC/transformer. The paper includes three rows.","fields":[{"key":"customerNameAddress","label":"Customer name or address","kind":"text"},{"key":"identifierTypes","label":"Identifier type","kind":"multi","options":["Account #","Meter #","Net Metering #"]},{"key":"identifier","label":"Account / meter / net metering number","kind":"text"},{"key":"oldDlocTransformer","label":"Old DLOC or trans. #","kind":"text"},{"key":"newDlocTransformer","label":"New DLOC or trans. #","kind":"text"}],"repeat":{"key":"customerRows","minimumRows":3}},{"id":"signoff","title":"Sign-off","description":"Keep the printed work order and employee identifiers. Typed signature records the entered name.","fields":[{"key":"signature","label":"Signature","kind":"text","required":true},{"key":"workOrderNumber","label":"Work order #","kind":"text","required":true},{"key":"employeeId","label":"Employee ID","kind":"text","required":true}]}]}}$definition$::jsonb->p_kind; $fn$;

CREATE FUNCTION private.assert_entergy_field(p_field jsonb,p_value jsonb,p_required boolean) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE k text:=p_field->>'kind'; v text:=p_value#>>'{}'; missing boolean;
BEGIN
 missing:=p_value IS NULL OR p_value='null'::jsonb OR p_value='""'::jsonb OR p_value='[]'::jsonb;
 IF missing THEN
  IF p_required AND p_field->>'required'='true' THEN RAISE EXCEPTION 'Complete: %',p_field->>'label' USING ERRCODE='23514'; END IF;
  RETURN;
 END IF;
 IF k='boolean' THEN
  IF jsonb_typeof(p_value)<>'boolean' THEN RAISE EXCEPTION 'Select Yes or No: %',p_field->>'label' USING ERRCODE='23514'; END IF;
 ELSIF k='multi' THEN
  IF jsonb_typeof(p_value)<>'array' THEN RAISE EXCEPTION 'Invalid checkbox choices: %',p_field->>'label' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_value) x WHERE jsonb_typeof(x)<>'string' OR NOT(p_field->'options' @> jsonb_build_array(x))) OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(p_value))<>jsonb_array_length(p_value) THEN RAISE EXCEPTION 'Invalid checkbox choices: %',p_field->>'label' USING ERRCODE='23514'; END IF;
 ELSE
  IF jsonb_typeof(p_value)<>'string' OR length(v)>(CASE WHEN k='notes' THEN 4000 ELSE 500 END) OR (p_required AND p_field->>'required'='true' AND btrim(v)='') THEN RAISE EXCEPTION 'Invalid text: %',p_field->>'label' USING ERRCODE='23514'; END IF;
  IF k='select' AND NOT(p_field->'options' @> jsonb_build_array(v)) THEN RAISE EXCEPTION 'Invalid option: %',p_field->>'label' USING ERRCODE='23514'; END IF;
  IF k='date' THEN
   BEGIN
    IF v !~ '^\d{4}-\d{2}-\d{2}$' OR to_char(v::date,'YYYY-MM-DD')<>v THEN RAISE EXCEPTION 'Invalid date'; END IF;
   EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Invalid date: %',p_field->>'label' USING ERRCODE='23514'; END;
  END IF;
  IF k IN ('latitude','longitude') THEN
   BEGIN
    IF btrim(v)='' OR v::numeric::text IN ('NaN','Infinity','-Infinity') OR abs(v::numeric)>(CASE WHEN k='latitude' THEN 90 ELSE 180 END) THEN RAISE EXCEPTION 'Invalid GPS'; END IF;
   EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Invalid GPS: %',p_field->>'label' USING ERRCODE='23514'; END;
  END IF;
 END IF;
END $$;
CREATE FUNCTION private.assert_entergy_payload(p_kind text,p_payload jsonb,p_submit boolean) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE definition jsonb:=private.entergy_form_definition(p_kind); section jsonb; field jsonb; row_value jsonb; stroke jsonb; point jsonb; fields jsonb; answers jsonb; row_key text; unknown_key text; required_key text; damage_detail jsonb;
BEGIN
 IF definition IS NULL OR jsonb_typeof(p_payload)<>'object' OR p_payload->'version' IS DISTINCT FROM '1'::jsonb OR jsonb_typeof(p_payload->'answers') IS DISTINCT FROM 'object' OR jsonb_typeof(p_payload->'equipmentRows') IS DISTINCT FROM 'array' OR jsonb_typeof(p_payload->'customerRows') IS DISTINCT FROM 'array' OR jsonb_typeof(p_payload->'lightingMap') IS DISTINCT FROM 'array' OR jsonb_typeof(p_payload->'damageReports') IS DISTINCT FROM 'object' OR octet_length(p_payload::text)>2000000 THEN RAISE EXCEPTION 'Invalid Entergy form structure' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_payload) k WHERE k NOT IN ('version','answers','equipmentRows','customerRows','lightingMap','damageReports')) THEN RAISE EXCEPTION 'Unknown form property' USING ERRCODE='23514'; END IF;
 SELECT jsonb_agg(f) INTO fields FROM jsonb_array_elements(definition->'sections') s,jsonb_array_elements(s->'fields') f WHERE NOT(s ? 'repeat');
 answers:=p_payload->'answers';
 FOR unknown_key IN SELECT jsonb_object_keys(answers) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(fields) f WHERE f->>'key'=unknown_key) THEN RAISE EXCEPTION 'Unknown form field: %',unknown_key USING ERRCODE='23514'; END IF;
 END LOOP;
 FOR field IN SELECT value FROM jsonb_array_elements(fields) LOOP PERFORM private.assert_entergy_field(field,answers->(field->>'key'),p_submit); END LOOP;
 FOR section IN SELECT value FROM jsonb_array_elements(definition->'sections') WHERE value ? 'repeat' LOOP
  row_key:=section->'repeat'->>'key';
  IF jsonb_array_length(p_payload->row_key)<(section->'repeat'->>'minimumRows')::integer OR jsonb_array_length(p_payload->row_key)>60 THEN RAISE EXCEPTION 'Invalid number of rows: %',row_key USING ERRCODE='23514'; END IF;
  FOR row_value IN SELECT value FROM jsonb_array_elements(p_payload->row_key) LOOP
   IF jsonb_typeof(row_value)<>'object' THEN RAISE EXCEPTION 'Invalid row' USING ERRCODE='23514'; END IF;
   FOR unknown_key IN SELECT jsonb_object_keys(row_value) LOOP
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(section->'fields') f WHERE f->>'key'=unknown_key) THEN RAISE EXCEPTION 'Unknown row field: %',unknown_key USING ERRCODE='23514'; END IF;
   END LOOP;
   FOR field IN SELECT value FROM jsonb_array_elements(section->'fields') LOOP PERFORM private.assert_entergy_field(field,row_value->(field->>'key'),false); END LOOP;
   IF p_submit AND EXISTS(SELECT 1 FROM jsonb_each(row_value) x WHERE NOT(row_key='equipmentRows' AND x.key='operation') AND x.value NOT IN ('null'::jsonb,'[]'::jsonb,'""'::jsonb) AND (jsonb_typeof(x.value)<>'string' OR btrim(x.value#>>'{}')<>'')) THEN
    IF row_key='equipmentRows' AND (coalesce(row_value->>'operation','')='' OR coalesce(btrim(row_value->>'type'),'')='' AND coalesce(btrim(row_value->>'companyEquipmentNumber'),'')='') THEN RAISE EXCEPTION 'Used equipment rows need an operation and a type or equipment number' USING ERRCODE='23514'; END IF;
    IF row_key='customerRows' THEN FOREACH required_key IN ARRAY ARRAY['customerNameAddress','identifierTypes','identifier','oldDlocTransformer','newDlocTransformer'] LOOP
     IF row_value->required_key IS NULL OR row_value->required_key IN ('null'::jsonb,'[]'::jsonb,'""'::jsonb) OR (jsonb_typeof(row_value->required_key)='string' AND btrim(row_value->>required_key)='') THEN RAISE EXCEPTION 'Complete each used customer transfer row' USING ERRCODE='23514'; END IF;
    END LOOP; END IF;
   END IF;
  END LOOP;
 END LOOP;
 IF p_kind='cleanup' AND (jsonb_array_length(p_payload->'equipmentRows')>0 OR jsonb_array_length(p_payload->'customerRows')>0 OR jsonb_array_length(p_payload->'lightingMap')>0) THEN RAISE EXCEPTION 'Damage fields do not belong in a clean-up form' USING ERRCODE='23514'; END IF;
 IF p_kind='damage' AND p_submit AND coalesce(btrim(answers->>'fromDloc'),'')='' AND coalesce(btrim(answers->>'toDloc'),'')='' THEN RAISE EXCEPTION 'Record a From or To DLOC' USING ERRCODE='23514'; END IF;
 IF p_kind='damage' AND (coalesce(answers->>'latitude','')<>'')<>(coalesce(answers->>'longitude','')<>'') THEN RAISE EXCEPTION 'Record both GPS coordinates together' USING ERRCODE='23514'; END IF;
 IF jsonb_array_length(p_payload->'lightingMap')>100 THEN RAISE EXCEPTION 'Map is too large' USING ERRCODE='23514'; END IF;
 FOR stroke IN SELECT value FROM jsonb_array_elements(p_payload->'lightingMap') LOOP
  IF jsonb_typeof(stroke->'points') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid map stroke' USING ERRCODE='23514'; END IF;
  IF jsonb_array_length(stroke->'points') NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Invalid map stroke length' USING ERRCODE='23514'; END IF;
  FOR point IN SELECT value FROM jsonb_array_elements(stroke->'points') LOOP
   IF jsonb_typeof(point)<>'array' THEN RAISE EXCEPTION 'Invalid map point' USING ERRCODE='23514'; END IF;
   IF jsonb_array_length(point)<>2 OR jsonb_typeof(point->0)<>'number' OR jsonb_typeof(point->1)<>'number' THEN RAISE EXCEPTION 'Invalid map coordinate' USING ERRCODE='23514'; END IF;
   IF (point->>0)::numeric NOT BETWEEN 0 AND 1000 OR (point->>1)::numeric NOT BETWEEN 0 AND 1000 THEN RAISE EXCEPTION 'Map coordinate out of bounds' USING ERRCODE='23514'; END IF;
  END LOOP;
 END LOOP;
 IF p_kind='damage' AND p_submit AND (answers->'equipmentTypes' ?| ARRAY['Streetlight','Private Area Light']) AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(answers->'activities') a WHERE a<>'Remove') AND jsonb_array_length(p_payload->'lightingMap')=0 THEN RAISE EXCEPTION 'A lighting map is required for lighting installs or changes' USING ERRCODE='23514'; END IF;
 FOR unknown_key,damage_detail IN SELECT * FROM jsonb_each(p_payload->'damageReports') LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(definition->'sections') s WHERE s->>'id'=unknown_key) OR jsonb_typeof(damage_detail)<>'string' OR length(damage_detail#>>'{}')>2000 OR (p_submit AND btrim(damage_detail#>>'{}')='') THEN RAISE EXCEPTION 'Describe the reported section damage' USING ERRCODE='23514'; END IF;
 END LOOP;
END $$;
CREATE FUNCTION private.assert_entergy_evidence(p_ticket uuid,p_payload jsonb,p_photos jsonb,p_submit boolean) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE evidence jsonb; k text;
BEGIN
 IF jsonb_typeof(p_photos) IS DISTINCT FROM 'array' OR jsonb_array_length(p_photos)>100 THEN RAISE EXCEPTION 'Invalid photo evidence' USING ERRCODE='23514'; END IF;
 IF p_submit THEN
  IF jsonb_array_length(p_photos)<4 THEN RAISE EXCEPTION 'Four GPS-verified views are required' USING ERRCODE='23514'; END IF;
  FOREACH k IN ARRAY ARRAY['OVERVIEW','EQUIPMENT','DAMAGE','SAFETY'] LOOP
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_photos) p WHERE p->>'type'=k) THEN RAISE EXCEPTION 'Missing photo view: %',k USING ERRCODE='23514'; END IF;
  END LOOP;
  FOR k IN SELECT jsonb_object_keys(p_payload->'damageReports') LOOP
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_photos) p WHERE p->>'type'='DAMAGE' AND p->>'sectionKey'='entergy:'||k) THEN RAISE EXCEPTION 'Capture damage evidence inside section: %',k USING ERRCODE='23514'; END IF;
  END LOOP;
 END IF;
 IF (SELECT count(DISTINCT p->>'id') FROM jsonb_array_elements(p_photos) p)<>jsonb_array_length(p_photos) THEN RAISE EXCEPTION 'Duplicate photo ID' USING ERRCODE='23514'; END IF;
 FOR evidence IN SELECT value FROM jsonb_array_elements(p_photos) LOOP
  IF coalesce(evidence->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR coalesce(evidence->>'type','') NOT IN ('OVERVIEW','EQUIPMENT','DAMAGE','SAFETY','CONTEXT') OR jsonb_typeof(evidence->'gpsLatitude') IS DISTINCT FROM 'number' OR jsonb_typeof(evidence->'gpsLongitude') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Valid photo ID, type and GPS required' USING ERRCODE='23514'; END IF;
  IF abs((evidence->>'gpsLatitude')::numeric)>90 OR abs((evidence->>'gpsLongitude')::numeric)>180 THEN RAISE EXCEPTION 'Invalid photo GPS' USING ERRCODE='23514'; END IF;
  IF evidence ? 'sectionKey' AND evidence->'sectionKey'<>'null'::jsonb AND (evidence->>'type'<>'DAMAGE' OR left(evidence->>'sectionKey',8)<>'entergy:' OR NOT(p_payload->'damageReports' ? substring(evidence->>'sectionKey' FROM 9))) THEN RAISE EXCEPTION 'Photo section does not match reported damage' USING ERRCODE='23514'; END IF;
  IF p_submit AND NOT EXISTS(SELECT 1 FROM public.media_assets m WHERE m.id=(evidence->>'id')::uuid AND m.entity_type='ticket' AND m.entity_id=p_ticket AND m.upload_status='COMPLETED' AND m.storage_bucket='assessment-photos' AND m.gps_latitude=(evidence->>'gpsLatitude')::numeric AND m.gps_longitude=(evidence->>'gpsLongitude')::numeric AND m.checksum_sha256=evidence->>'checksumSha256' AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=m.storage_bucket AND o.name=m.storage_path)) THEN RAISE EXCEPTION 'Photo upload is incomplete or not linked to this ticket. Sync before submitting.' USING ERRCODE='23514'; END IF;
 END LOOP;
END $$;
CREATE FUNCTION private.save_entergy_ticket_form(p_id uuid,p_ticket_id uuid,p_kind text,p_payload jsonb,p_photos jsonb,p_expected_version integer DEFAULT NULL,p_submit boolean DEFAULT false) RETURNS public.ticket_entergy_forms
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.tickets; previous public.ticket_entergy_forms; result public.ticket_entergy_forms; BEGIN
 IF auth.uid() IS NULL OR NOT private.can_assess_ticket(p_ticket_id) THEN RAISE EXCEPTION 'Assigned assessor or authorized storm manager required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_kind IS NULL OR p_kind NOT IN ('cleanup','damage') OR p_submit IS NULL THEN RAISE EXCEPTION 'Invalid form identity' USING ERRCODE='23514'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
 SELECT * INTO previous FROM public.ticket_entergy_forms WHERE id=p_id FOR UPDATE;
 IF previous.id IS NOT NULL AND (previous.ticket_id<>p_ticket_id OR previous.form_kind<>p_kind) THEN RAISE EXCEPTION 'Form identity does not match ticket' USING ERRCODE='42501'; END IF;
 IF previous.status='SUBMITTED' THEN
  IF p_submit AND previous.payload=p_payload AND previous.photo_evidence=p_photos THEN RETURN previous; END IF;
  RAISE EXCEPTION 'Submitted Entergy records are immutable. Start a new form revision.' USING ERRCODE='23514';
 END IF;
 IF t.utility_client::text<>'ENTERGY' THEN RAISE EXCEPTION 'Entergy ticket required' USING ERRCODE='23514'; END IF;
 IF t.assigned_to IS NULL OR t.status::text NOT IN ('ON_SITE','IN_PROGRESS','NEEDS_REWORK') THEN RAISE EXCEPTION 'The assigned crew must be on site before filling out an Entergy form' USING ERRCODE='23514'; END IF;
 IF previous.id IS NULL AND p_expected_version IS NOT NULL OR previous.id IS NOT NULL AND previous.version IS DISTINCT FROM p_expected_version THEN
  -- Exact draft retries can recover after a lost response; stale edits cannot overwrite another device.
  IF previous.id IS NOT NULL AND NOT p_submit AND previous.payload=p_payload AND previous.photo_evidence=p_photos THEN RETURN previous; END IF;
  RAISE EXCEPTION 'This form changed on another device. Reload before saving.' USING ERRCODE='40001';
 END IF;
 IF previous.id IS NULL AND EXISTS(SELECT 1 FROM public.ticket_entergy_forms WHERE ticket_id=p_ticket_id AND form_kind=p_kind AND status='DRAFT') THEN RAISE EXCEPTION 'A draft already exists for this ticket. Reload it before editing.' USING ERRCODE='40001'; END IF;
 PERFORM private.assert_entergy_payload(p_kind,p_payload,p_submit);
 PERFORM private.assert_entergy_evidence(p_ticket_id,p_payload,p_photos,p_submit);
 INSERT INTO public.ticket_entergy_forms(id,ticket_id,form_kind,payload,photo_evidence,status,version,created_by,saved_by,submitted_at)
 VALUES(p_id,p_ticket_id,p_kind,p_payload,p_photos,CASE WHEN p_submit THEN 'SUBMITTED' ELSE 'DRAFT' END,1,auth.uid(),auth.uid(),CASE WHEN p_submit THEN now() END)
 ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,photo_evidence=EXCLUDED.photo_evidence,status=EXCLUDED.status,version=ticket_entergy_forms.version+1,saved_by=auth.uid(),saved_at=now(),submitted_at=EXCLUDED.submitted_at RETURNING * INTO result;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,user_role,old_values,new_values,change_summary)
 VALUES(CASE WHEN p_submit THEN 'ENTERGY_FORM_SUBMITTED' ELSE 'ENTERGY_FORM_SAVED' END,'ticket_entergy_form',result.id,auth.uid(),private.active_profile_role()::public.user_role,to_jsonb(previous),to_jsonb(result),'Official Entergy '||p_kind||' form attached to ticket '||t.ticket_number);
 RETURN result;
END $$;
CREATE FUNCTION public.save_entergy_ticket_form(p_id uuid,p_ticket_id uuid,p_kind text,p_payload jsonb,p_photos jsonb,p_expected_version integer DEFAULT NULL,p_submit boolean DEFAULT false) RETURNS public.ticket_entergy_forms
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.save_entergy_ticket_form(p_id,p_ticket_id,p_kind,p_payload,p_photos,p_expected_version,p_submit); $$;
REVOKE ALL ON FUNCTION private.entergy_form_definition(text),private.assert_entergy_field(jsonb,jsonb,boolean),private.assert_entergy_payload(text,jsonb,boolean),private.assert_entergy_evidence(uuid,jsonb,jsonb,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.save_entergy_ticket_form(uuid,uuid,text,jsonb,jsonb,integer,boolean),public.save_entergy_ticket_form(uuid,uuid,text,jsonb,jsonb,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.save_entergy_ticket_form(uuid,uuid,text,jsonb,jsonb,integer,boolean),public.save_entergy_ticket_form(uuid,uuid,text,jsonb,jsonb,integer,boolean) TO authenticated;
-- Retain the existing ticket and assessment boundaries while freezing submitted Entergy photos too.
CREATE OR REPLACE FUNCTION private.ticket_photo_access(p_name text,p_write boolean DEFAULT false) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ DECLARE v_ticket uuid; v_photo uuid; BEGIN
 IF p_name !~ '^[0-9a-f-]{36}/tickets/[0-9a-f-]{36}/[0-9a-f-]{36}-(original|thumbnail)\.(jpg|jpeg|png|webp)$' THEN RETURN false; END IF;
 BEGIN v_ticket:=split_part(p_name,'/',3)::uuid;v_photo:=left(split_part(p_name,'/',4),36)::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN false; END;
 IF NOT private.can_access_ticket(v_ticket) THEN RETURN false; END IF;
 IF NOT p_write THEN RETURN true; END IF;
 RETURN split_part(p_name,'/',1)=auth.uid()::text AND private.can_assess_ticket(v_ticket) AND EXISTS(SELECT 1 FROM public.tickets WHERE id=v_ticket AND status::text IN ('ON_SITE','IN_PROGRESS','NEEDS_REWORK'))
 AND NOT EXISTS(SELECT 1 FROM public.damage_assessments a,jsonb_array_elements(a.photo_evidence) p WHERE a.ticket_id=v_ticket AND p->>'id'=v_photo::text)
 AND NOT EXISTS(SELECT 1 FROM public.ticket_entergy_forms f,jsonb_array_elements(f.photo_evidence) p WHERE f.ticket_id=v_ticket AND f.status='SUBMITTED' AND p->>'id'=v_photo::text);
END $$;
CREATE OR REPLACE FUNCTION private.guard_submitted_ticket_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NEW.entity_type='ticket' AND NEW.storage_bucket='assessment-photos' AND (NEW.uploaded_by IS DISTINCT FROM auth.uid() OR NOT private.can_assess_ticket(NEW.entity_id)) THEN RAISE EXCEPTION 'Only the assigned assessor can persist ticket evidence' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND (EXISTS(SELECT 1 FROM public.damage_assessments a,jsonb_array_elements(a.photo_evidence) p WHERE p->>'id'=OLD.id::text) OR EXISTS(SELECT 1 FROM public.ticket_entergy_forms f,jsonb_array_elements(f.photo_evidence) p WHERE f.status='SUBMITTED' AND p->>'id'=OLD.id::text)) AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN RAISE EXCEPTION 'Submitted photo evidence is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION private.guard_entergy_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF OLD.status='SUBMITTED' THEN RAISE EXCEPTION 'Submitted Entergy records are immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_entergy_immutable() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER entergy_immutable BEFORE UPDATE OR DELETE ON public.ticket_entergy_forms FOR EACH ROW EXECUTE FUNCTION private.guard_entergy_immutable();
