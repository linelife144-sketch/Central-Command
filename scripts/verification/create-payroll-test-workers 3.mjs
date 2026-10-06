// Creates only the four named fictional QA users; never sends invitations.
import {config} from 'dotenv';import {createClient} from '@supabase/supabase-js';import {randomBytes} from 'node:crypto';import {readFile,writeFile} from 'node:fs/promises';
config({path:'.env',quiet:true});config({path:'.env.local',override:true,quiet:true});
if(!process.argv.includes('--apply'))throw Error('Use --apply to create the authorized QA fixtures.');
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function ok(query){const {data,error}=await query;if(error)throw Error(error.message);return data;}
const staff=await ok(admin.from('profiles').select('id').eq('email','dmccarty@gridelectriccorp.com').single());
const credentialsPath='.env.qa-payroll-credentials.json';let saved;try{saved=JSON.parse(await readFile(credentialsPath,'utf8'));}catch{saved={accounts:[]};}
const definitions=[['manager','QA Casey','Storm Manager','STORM_MANAGER'],['lead','QA Jordan','Team Lead','TEAM_LEAD'],['senior','QA Taylor','Senior Assessor','SR_DAMAGE_ASSESSER'],['driver','QA Riley','Driver','DRIVER']];
for(const [key,first,last,role] of definitions){
 const email=`qa.payroll.${key}.20261003@example.com`;
 let record=saved.accounts.find(a=>a.email===email);
 const existing=await ok(admin.from('profiles').select('id').eq('email',email).maybeSingle());
 if(existing&&!record)throw Error(`Existing QA account ${email} has no local credentials; refusing to reset its password.`);
 if(!record){const password=`QA!${randomBytes(15).toString('base64url')}7a`;const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{role:'CONTRACTOR',qa_fixture:'payroll-20261003'},user_metadata:{first_name:first,last_name:last}});if(error)throw Error(error.message);record={key,email,password,profileId:data.user.id,payClass:role};saved.accounts.push(record);await writeFile(credentialsPath,JSON.stringify(saved,null,2),{mode:0o600});}
 await ok(admin.from('profiles').upsert({id:record.profileId,email,first_name:first,last_name:last,role:'CONTRACTOR',is_active:true,is_email_verified:true,must_reset_password:false}));
 const business=await ok(admin.from('contractors').select('id').eq('profile_id',record.profileId).maybeSingle());
 const payload={profile_id:record.profileId,business_name:`QA Payroll Test — ${last}`,business_email:email,role,onboarding_status:'APPROVED',is_eligible_for_assignment:true,approved_by:staff.id,approved_at:new Date().toISOString()};
 const contractor=await ok(business?admin.from('contractors').update(payload).eq('id',business.id).select('id').single():admin.from('contractors').insert(payload).select('id').single());record.contractorId=contractor.id;
 await writeFile(credentialsPath,JSON.stringify(saved,null,2),{mode:0o600});
}
// Auth admin provisioning is separate from staff-only storm/roster permissions.
// Fixture assignments for this run are recorded in payroll-test-workers.json.
const evidence={accounts:saved.accounts.map(({password,...a})=>a)};
console.log(JSON.stringify(evidence,null,2));
