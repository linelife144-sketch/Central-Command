-- Live schema calculation checks. JWT role contexts are simulated; every fixture and review rolls back.
BEGIN;
SELECT set_config('request.jwt.claim.sub','4bd03b59-3a04-4c8a-aa09-d7fe1f0a6512',true);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('ae3402ef-8bc7-466d-a801-b460281bb890','2027-01-04T06:00Z','{"role":"STORM_MANAGER","base_hourly_rate":65,"work_type_rates":{},"policy":{"mode":"FLAT","multiplier":1},"driver_eligible":false,"vehicle_allowance_enabled":false,"vehicle_hourly_rate":0,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('ae3402ef-8bc7-466d-a801-b460281bb890','2027-01-05T06:00Z','{"role":"STORM_MANAGER","base_hourly_rate":65,"work_type_rates":{},"policy":{"mode":"FLAT","multiplier":1.5},"driver_eligible":false,"vehicle_allowance_enabled":false,"vehicle_hourly_rate":0,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('ae3402ef-8bc7-466d-a801-b460281bb890','2027-01-06T06:00Z','{"role":"STORM_MANAGER","base_hourly_rate":65,"work_type_rates":{},"policy":{"mode":"FLAT","multiplier":2},"driver_eligible":false,"vehicle_allowance_enabled":false,"vehicle_hourly_rate":0,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('e609aea3-af82-4a1d-8b4e-473b022eafc7','2027-01-04T06:00Z','{"role":"TEAM_LEAD","base_hourly_rate":65,"work_type_rates":{},"policy":{"mode":"WEEKLY_TIERS","tiers":[{"after_hours":0,"multiplier":1},{"after_hours":40,"multiplier":1.5}]},"driver_eligible":false,"vehicle_allowance_enabled":false,"vehicle_hourly_rate":0,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('27f9f6dc-8845-4642-be8a-c975ed24e1fc','2027-01-04T06:00Z','{"role":"SR_DAMAGE_ASSESSER","base_hourly_rate":65,"work_type_rates":{},"policy":{"mode":"FLAT","multiplier":1},"driver_eligible":false,"vehicle_allowance_enabled":false,"vehicle_hourly_rate":0,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('27f9f6dc-8845-4642-be8a-c975ed24e1fc','2027-01-04T20:00Z','{"role":"SR_DAMAGE_ASSESSER","base_hourly_rate":75,"work_type_rates":{},"policy":{"mode":"FLAT","multiplier":1},"driver_eligible":false,"vehicle_allowance_enabled":false,"vehicle_hourly_rate":0,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('27f9f6dc-8845-4642-be8a-c975ed24e1fc','2027-01-05T06:00Z','{"role":"SR_DAMAGE_ASSESSER","base_hourly_rate":65,"work_type_rates":{},"policy":{"mode":"FLAT","multiplier":1},"driver_eligible":false,"vehicle_allowance_enabled":false,"vehicle_hourly_rate":0,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('27f9f6dc-8845-4642-be8a-c975ed24e1fc','2027-01-05T20:00Z','{"role":"SR_DAMAGE_ASSESSER","base_hourly_rate":75,"work_type_rates":{},"policy":{"mode":"FLAT","multiplier":1},"driver_eligible":false,"vehicle_allowance_enabled":false,"vehicle_hourly_rate":0,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('8c58d306-ed3c-4d2a-aa5a-79881ff7abd3','2027-01-04T06:00Z','{"role":"DRIVER","base_hourly_rate":65,"work_type_rates":{},"policy":{"mode":"FLAT","multiplier":1},"driver_eligible":true,"vehicle_allowance_enabled":true,"vehicle_hourly_rate":5,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
INSERT INTO contractor_pay_agreements(contractor_id,effective_from,terms) VALUES('8c58d306-ed3c-4d2a-aa5a-79881ff7abd3','2027-01-04T13:00Z','{"role":"DRIVER","base_hourly_rate":65,"work_type_rates":{},"policy":{"mode":"FLAT","multiplier":1},"driver_eligible":true,"vehicle_allowance_enabled":true,"vehicle_hourly_rate":7,"week_start_day":1,"timezone":"America/Chicago"}'::jsonb);
SELECT set_config('request.jwt.claim.sub','1ca0d763-45d8-4975-be82-070b2610380c',true);
DO $$ DECLARE entry_id uuid:=gen_random_uuid(); wage numeric; paid numeric; vehicle numeric; BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos','ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-in.png'),('time-entry-photos','ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-out.png');
 SET LOCAL ROLE authenticated;
 INSERT INTO time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,activity_intervals) VALUES(entry_id,'ae3402ef-8bc7-466d-a801-b460281bb890','f7afbe2a-62f3-44b4-9385-243a1694511c','a01b1189-4544-43d7-a4f5-af30f51fb613','2027-01-04T12:00:00Z','2027-01-05T04:00:00Z','STANDARD_ASSESSMENT',999,32.5252,-93.7502,10,'ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-in.png',32.5252,-93.7502,10,'ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-out.png','[]'::jsonb) RETURNING payroll_amount,paid_minutes_exact,vehicle_allowance_amount INTO wage,paid,vehicle;
 IF wage<>1040 THEN RAISE EXCEPTION 'Live manager 4 calculation expected 1040, got %',wage; END IF;
 
 RESET ROLE;
 IF (SELECT utility_bill_amount FROM time_entries WHERE id=entry_id)<>round(paid/60*175,2) THEN RAISE EXCEPTION 'Utility billing mismatch'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','1ca0d763-45d8-4975-be82-070b2610380c',true);
DO $$ DECLARE entry_id uuid:=gen_random_uuid(); wage numeric; paid numeric; vehicle numeric; BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos','ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-in.png'),('time-entry-photos','ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-out.png');
 SET LOCAL ROLE authenticated;
 INSERT INTO time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,activity_intervals) VALUES(entry_id,'ae3402ef-8bc7-466d-a801-b460281bb890','f7afbe2a-62f3-44b4-9385-243a1694511c','a01b1189-4544-43d7-a4f5-af30f51fb613','2027-01-05T12:00:00Z','2027-01-06T04:00:00Z','STANDARD_ASSESSMENT',999,32.5252,-93.7502,10,'ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-in.png',32.5252,-93.7502,10,'ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-out.png','[]'::jsonb) RETURNING payroll_amount,paid_minutes_exact,vehicle_allowance_amount INTO wage,paid,vehicle;
 IF wage<>1560 THEN RAISE EXCEPTION 'Live manager 5 calculation expected 1560, got %',wage; END IF;
 
 RESET ROLE;
 IF (SELECT utility_bill_amount FROM time_entries WHERE id=entry_id)<>round(paid/60*175,2) THEN RAISE EXCEPTION 'Utility billing mismatch'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','1ca0d763-45d8-4975-be82-070b2610380c',true);
DO $$ DECLARE entry_id uuid:=gen_random_uuid(); wage numeric; paid numeric; vehicle numeric; BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos','ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-in.png'),('time-entry-photos','ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-out.png');
 SET LOCAL ROLE authenticated;
 INSERT INTO time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,activity_intervals) VALUES(entry_id,'ae3402ef-8bc7-466d-a801-b460281bb890','f7afbe2a-62f3-44b4-9385-243a1694511c','a01b1189-4544-43d7-a4f5-af30f51fb613','2027-01-06T12:00:00Z','2027-01-07T04:00:00Z','STANDARD_ASSESSMENT',999,32.5252,-93.7502,10,'ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-in.png',32.5252,-93.7502,10,'ae3402ef-8bc7-466d-a801-b460281bb890'||'/time-entries/'||entry_id||'/clock-out.png','[]'::jsonb) RETURNING payroll_amount,paid_minutes_exact,vehicle_allowance_amount INTO wage,paid,vehicle;
 IF wage<>2080 THEN RAISE EXCEPTION 'Live manager 6 calculation expected 2080, got %',wage; END IF;
 
 RESET ROLE;
 IF (SELECT utility_bill_amount FROM time_entries WHERE id=entry_id)<>round(paid/60*175,2) THEN RAISE EXCEPTION 'Utility billing mismatch'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','0d78f3b7-992f-4a82-bc84-79926b65987b',true);
DO $$ DECLARE entry_id uuid:=gen_random_uuid(); wage numeric; paid numeric; vehicle numeric; BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos','e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-in.png'),('time-entry-photos','e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-out.png');
 SET LOCAL ROLE authenticated;
 INSERT INTO time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,activity_intervals) VALUES(entry_id,'e609aea3-af82-4a1d-8b4e-473b022eafc7','167856f0-e3f0-4364-af0b-713b589da3c0','a01b1189-4544-43d7-a4f5-af30f51fb613','2027-01-04T12:00:00Z','2027-01-05T04:00:00Z','STANDARD_ASSESSMENT',999,32.5252,-93.7502,10,'e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-in.png',32.5252,-93.7502,10,'e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-out.png','[]'::jsonb) RETURNING payroll_amount,paid_minutes_exact,vehicle_allowance_amount INTO wage,paid,vehicle;
 IF wage<>1040 THEN RAISE EXCEPTION 'Live lead 4 calculation expected 1040, got %',wage; END IF;
 
 RESET ROLE;
 IF (SELECT utility_bill_amount FROM time_entries WHERE id=entry_id)<>round(paid/60*175,2) THEN RAISE EXCEPTION 'Utility billing mismatch'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','0d78f3b7-992f-4a82-bc84-79926b65987b',true);
DO $$ DECLARE entry_id uuid:=gen_random_uuid(); wage numeric; paid numeric; vehicle numeric; BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos','e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-in.png'),('time-entry-photos','e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-out.png');
 SET LOCAL ROLE authenticated;
 INSERT INTO time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,activity_intervals) VALUES(entry_id,'e609aea3-af82-4a1d-8b4e-473b022eafc7','167856f0-e3f0-4364-af0b-713b589da3c0','a01b1189-4544-43d7-a4f5-af30f51fb613','2027-01-05T12:00:00Z','2027-01-06T04:00:00Z','STANDARD_ASSESSMENT',999,32.5252,-93.7502,10,'e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-in.png',32.5252,-93.7502,10,'e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-out.png','[]'::jsonb) RETURNING payroll_amount,paid_minutes_exact,vehicle_allowance_amount INTO wage,paid,vehicle;
 IF wage<>1040 THEN RAISE EXCEPTION 'Live lead 5 calculation expected 1040, got %',wage; END IF;
 
 RESET ROLE;
 IF (SELECT utility_bill_amount FROM time_entries WHERE id=entry_id)<>round(paid/60*175,2) THEN RAISE EXCEPTION 'Utility billing mismatch'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','0d78f3b7-992f-4a82-bc84-79926b65987b',true);
DO $$ DECLARE entry_id uuid:=gen_random_uuid(); wage numeric; paid numeric; vehicle numeric; BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos','e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-in.png'),('time-entry-photos','e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-out.png');
 SET LOCAL ROLE authenticated;
 INSERT INTO time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,activity_intervals) VALUES(entry_id,'e609aea3-af82-4a1d-8b4e-473b022eafc7','167856f0-e3f0-4364-af0b-713b589da3c0','a01b1189-4544-43d7-a4f5-af30f51fb613','2027-01-06T12:00:00Z','2027-01-07T04:00:00Z','STANDARD_ASSESSMENT',999,32.5252,-93.7502,10,'e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-in.png',32.5252,-93.7502,10,'e609aea3-af82-4a1d-8b4e-473b022eafc7'||'/time-entries/'||entry_id||'/clock-out.png','[]'::jsonb) RETURNING payroll_amount,paid_minutes_exact,vehicle_allowance_amount INTO wage,paid,vehicle;
 IF wage<>1300 THEN RAISE EXCEPTION 'Live lead 6 calculation expected 1300, got %',wage; END IF;
 
 RESET ROLE;
 IF (SELECT utility_bill_amount FROM time_entries WHERE id=entry_id)<>round(paid/60*175,2) THEN RAISE EXCEPTION 'Utility billing mismatch'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','53415331-3365-467d-8be9-aaf54249db4c',true);
DO $$ DECLARE entry_id uuid:=gen_random_uuid(); wage numeric; paid numeric; vehicle numeric; BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos','27f9f6dc-8845-4642-be8a-c975ed24e1fc'||'/time-entries/'||entry_id||'/clock-in.png'),('time-entry-photos','27f9f6dc-8845-4642-be8a-c975ed24e1fc'||'/time-entries/'||entry_id||'/clock-out.png');
 SET LOCAL ROLE authenticated;
 INSERT INTO time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,activity_intervals) VALUES(entry_id,'27f9f6dc-8845-4642-be8a-c975ed24e1fc','429d0bcb-9c0c-4ee6-be86-b6701c370981','a01b1189-4544-43d7-a4f5-af30f51fb613','2027-01-04T12:00:00Z','2027-01-05T04:00:00Z','STANDARD_ASSESSMENT',999,32.5252,-93.7502,10,'27f9f6dc-8845-4642-be8a-c975ed24e1fc'||'/time-entries/'||entry_id||'/clock-in.png',32.5252,-93.7502,10,'27f9f6dc-8845-4642-be8a-c975ed24e1fc'||'/time-entries/'||entry_id||'/clock-out.png','[]'::jsonb) RETURNING payroll_amount,paid_minutes_exact,vehicle_allowance_amount INTO wage,paid,vehicle;
 IF wage<>1120 THEN RAISE EXCEPTION 'Live senior 4 calculation expected 1120, got %',wage; END IF;
 
 RESET ROLE;
 IF (SELECT utility_bill_amount FROM time_entries WHERE id=entry_id)<>round(paid/60*175,2) THEN RAISE EXCEPTION 'Utility billing mismatch'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','53415331-3365-467d-8be9-aaf54249db4c',true);
DO $$ DECLARE entry_id uuid:=gen_random_uuid(); wage numeric; paid numeric; vehicle numeric; BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos','27f9f6dc-8845-4642-be8a-c975ed24e1fc'||'/time-entries/'||entry_id||'/clock-in.png'),('time-entry-photos','27f9f6dc-8845-4642-be8a-c975ed24e1fc'||'/time-entries/'||entry_id||'/clock-out.png');
 SET LOCAL ROLE authenticated;
 INSERT INTO time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,activity_intervals) VALUES(entry_id,'27f9f6dc-8845-4642-be8a-c975ed24e1fc','429d0bcb-9c0c-4ee6-be86-b6701c370981','a01b1189-4544-43d7-a4f5-af30f51fb613','2027-01-05T12:00:00Z','2027-01-06T04:00:00Z','STANDARD_ASSESSMENT',999,32.5252,-93.7502,10,'27f9f6dc-8845-4642-be8a-c975ed24e1fc'||'/time-entries/'||entry_id||'/clock-in.png',32.5252,-93.7502,10,'27f9f6dc-8845-4642-be8a-c975ed24e1fc'||'/time-entries/'||entry_id||'/clock-out.png',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'kind','BREAK','start_at','2027-01-05T19:30:00Z','end_at','2027-01-05T20:30:00Z'))) RETURNING payroll_amount,paid_minutes_exact,vehicle_allowance_amount INTO wage,paid,vehicle;
 IF wage<>1050 THEN RAISE EXCEPTION 'Live senior 5 calculation expected 1050, got %',wage; END IF;
 
 RESET ROLE;
 IF (SELECT utility_bill_amount FROM time_entries WHERE id=entry_id)<>round(paid/60*175,2) THEN RAISE EXCEPTION 'Utility billing mismatch'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','4bb67281-647e-429a-b733-3e229c192043',true);
DO $$ DECLARE entry_id uuid:=gen_random_uuid(); wage numeric; paid numeric; vehicle numeric; BEGIN
 INSERT INTO storage.objects(bucket_id,name) VALUES('time-entry-photos','8c58d306-ed3c-4d2a-aa5a-79881ff7abd3'||'/time-entries/'||entry_id||'/clock-in.png'),('time-entry-photos','8c58d306-ed3c-4d2a-aa5a-79881ff7abd3'||'/time-entries/'||entry_id||'/clock-out.png');
 SET LOCAL ROLE authenticated;
 INSERT INTO time_entries(id,contractor_id,ticket_id,storm_event_id,clock_in_at,clock_out_at,work_type,work_type_rate,clock_in_latitude,clock_in_longitude,clock_in_accuracy,clock_in_photo_url,clock_out_latitude,clock_out_longitude,clock_out_accuracy,clock_out_photo_url,activity_intervals) VALUES(entry_id,'8c58d306-ed3c-4d2a-aa5a-79881ff7abd3','7df3d94f-0d69-47d3-8b8c-408be00b9285','a01b1189-4544-43d7-a4f5-af30f51fb613','2027-01-04T12:00:00Z','2027-01-04T14:00:00Z','STANDARD_ASSESSMENT',999,32.5252,-93.7502,10,'8c58d306-ed3c-4d2a-aa5a-79881ff7abd3'||'/time-entries/'||entry_id||'/clock-in.png',32.5252,-93.7502,10,'8c58d306-ed3c-4d2a-aa5a-79881ff7abd3'||'/time-entries/'||entry_id||'/clock-out.png',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'kind','VEHICLE_USE','start_at','2027-01-04T12:00:00Z','end_at','2027-01-04T14:00:00Z'))) RETURNING payroll_amount,paid_minutes_exact,vehicle_allowance_amount INTO wage,paid,vehicle;
 IF wage<>130 THEN RAISE EXCEPTION 'Live driver 4 calculation expected 130, got %',wage; END IF;
 IF vehicle<>12 THEN RAISE EXCEPTION 'Vehicle segmentation expected 12, got %',vehicle; END IF;
 RESET ROLE;
 IF (SELECT utility_bill_amount FROM time_entries WHERE id=entry_id)<>round(paid/60*175,2) THEN RAISE EXCEPTION 'Utility billing mismatch'; END IF;
END $$;
ROLLBACK;
SELECT 'Nine live shift cases passed: flat 1040/1560/2080, weekly total3380, midshift1120, break1050, allowance12 and independent billing. All fixtures rolled back.' result;
