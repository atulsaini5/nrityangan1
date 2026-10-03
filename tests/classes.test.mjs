import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createEnrollmentRuntime,fixture} from './helpers/enrollment-runtime.mjs';
const url=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const {createTrialEnrollmentSender}=await import(url(await fs.readFile('supabase/functions/admin-portal/trialEnrollment.ts','utf8')));
const migration=await fs.readFile('supabase/migrations/20261003181315_class_schedule_management.sql','utf8');
export async function setup(){const r=await createEnrollmentRuntime();await r.db.exec((await fs.readFile('supabase/migrations/20260717232000_create_trial_class_requests.sql','utf8')).replace('create extension if not exists pgcrypto;',''));await r.db.exec("insert into class_sessions values('existing','Existing','Samena Club','Monday 17:00 (60 min)','Teacher','Beginner','Kids')");await r.db.exec(migration);return r;}
const classData={name:'New Class',instructor:'Teacher',level:'Beginner',age_group:'Kids',location_id:'loc1',day_of_week:'Tuesday',start_time:'16:00',duration_minutes:45,curriculum:'Learn rhythm',published:true};
test('class management preserves IDs, enforces versions and moves only selected year',async()=>{
 const r=await setup();try{
  const old=(await r.db.query("select * from class_sessions where id='existing'")).rows[0];assert.equal(old.published,true);assert.equal(old.location_id,'loc1');assert.equal(old.duration_minutes,60);
  const save=await r.adminCall({action:'save_class',class:classData});assert.equal(save.status,200);const c=(await save.json()).record;
  const location=await r.adminCall({action:'save_location',location:{name:'New Studio',address:'123 Test Street'}});assert.equal(location.status,200);const l=(await location.json()).record;
  assert.equal((await r.adminCall({action:'save_location',location:{...l,name:'Renamed'}})).status,200);assert.equal((await r.adminCall({action:'save_location',location:l})).status,409);
  assert.equal((await r.adminCall({action:'save_class',class:{...c,name:'Updated'}})).status,200);assert.equal((await r.adminCall({action:'save_class',class:c})).status,409);
  const id=(await r.db.query("insert into students(display_name) values('Test Student') returning id")).rows[0].id;
  await r.db.query("insert into student_enrollments(student_id,class_id,academic_year) values($1,'existing','2025-26'),($1,'existing','2026-27')",[id]);
  assert.equal((await r.adminCall({action:'assign_class',student_id:id,version:1,class_id:c.id,academic_year:'2026-27',source_class:'existing'})).status,200);
  assert.deepEqual((await r.db.query('select class_id,academic_year from student_enrollments where student_id=$1 order by academic_year',[id])).rows,[{class_id:'existing',academic_year:'2025-26'},{class_id:c.id,academic_year:'2026-27'}]);
  assert.equal((await r.adminCall({action:'assign_class',student_id:id,version:1,class_id:'existing',academic_year:'2026-27'})).status,409);
  assert.equal((await r.adminCall({action:'assign_class',student_id:id,version:2,class_id:'existing',academic_year:'2026-99'})).status,400);
  assert.equal((await r.db.query('select count(*)::int n from student_changes')).rows[0].n,1);
  for(const role of ['anon','authenticated']){await r.db.exec(`set role ${role}`);await assert.rejects(r.db.query('select * from class_locations'),/permission denied/);await assert.rejects(r.db.query('select save_class_session($1)',[JSON.stringify(classData)]),/permission denied/);await assert.rejects(r.db.query('select assign_student_class($1,$2,$3,$4,null)',[id,c.id,'2026-27',2]),/permission denied/);await r.db.exec('reset role');}
 }finally{await r.db.close();}
});
test('enrollment review creates or links student and overrides requested placement atomically',async()=>{
 const r=await setup();try{
  const cls=(await (await r.adminCall({action:'save_class',class:classData})).json()).record;
  const submitted=await r.call({action:'submit',enrollment:fixture({class_id:'existing'})});assert.equal(submitted.status,201);const {reference}=await submitted.json();
  assert.equal((await r.adminCall({action:'review_enrollment',id:reference,outcome:'approved',class_id:'missing'})).status,400);
  assert.equal((await r.db.query('select count(*)::int n from students')).rows[0].n,0);
  const approval=await r.adminCall({action:'review_enrollment',id:reference,outcome:'approved',class_id:cls.id});assert.equal(approval.status,200);const {student_id}=await approval.json();
  assert.equal((await r.db.query('select class_id from student_enrollments')).rows[0].class_id,cls.id);
  const second=await (await r.call({action:'submit',enrollment:fixture({preference_token:'b'.repeat(64)})})).json();
  const version=(await r.db.query('select version from students where id=$1',[student_id])).rows[0].version;
  assert.equal((await r.adminCall({action:'review_enrollment',id:second.reference,outcome:'approved',class_id:'existing',student_id,version})).status,200);
  assert.equal((await r.db.query('select count(*)::int n from students')).rows[0].n,1);
  await r.db.query('update class_sessions set published=false where id=$1',[cls.id]);
  assert.equal((await r.call({action:'submit',enrollment:fixture({class_id:cls.id})})).status,400);
 }finally{await r.db.close();}
});
function fakeTrial(){const row={id:'11111111-1111-4111-8111-111111111111',email:'family@example.test',student_name:'Test Student',contact_name:'Parent',enrollment_invitation_status:'not_sent'};return {row,client:()=>({from(){let patch,allowed,expected;const q={update(v){patch=v;return q},eq(k,v){if(k==='enrollment_invitation_status')expected=v;return q},in(k,v){allowed=v;return q},select(){return q},async maybeSingle(){if(!allowed.includes(row.enrollment_invitation_status))return {data:null};Object.assign(row,patch);return {data:{...row}}},then(resolve){if(!expected||row.enrollment_invitation_status===expected)Object.assign(row,patch);resolve({error:null});}};return q;}})};}
test('trial enrollment email uses saved recipient, prevents duplicates and tracks uncertain delivery',async()=>{
 const f=fakeTrial();let sent=0,payload;
 const sender=createTrialEnrollmentSender({...f,credentials:()=>({accountSid:'test',authToken:'test'}),send:async(u,opts)=>{sent++;payload=JSON.parse(opts.body);return new Response('',{status:202});}});
 assert.equal((await sender('invalid')).status,400);assert.equal((await sender(f.row.id)).status,200);assert.equal((await sender(f.row.id)).status,409);assert.equal(sent,1);assert.equal(payload.to[0].address,'family@example.test');assert.match(payload.to[0].variables.invitation,/https:\/\/www.kathakseattle.com\/enroll/);assert.equal(f.row.enrollment_invitation_status,'accepted');
 const g=fakeTrial();const uncertain=createTrialEnrollmentSender({...g,credentials:()=>({accountSid:'test',authToken:'test'}),send:async()=>{throw Error('timeout')}});assert.equal((await uncertain(g.row.id)).status,502);assert.equal(g.row.enrollment_invitation_status,'unknown');assert.equal((await uncertain(g.row.id)).status,409);
});

test('public catalogue contains published schedules only and all management actions require admin access',async()=>{
 const r=await setup();try{
  const c=(await (await r.adminCall({action:'save_class',class:{...classData,published:false}})).json()).record;
  const catalogue=await r.admin(new Request('http://local/students?catalogue=1'));assert.equal(catalogue.status,200);const data=await catalogue.json();assert.equal(data.classes.length,1);assert.equal(data.classes[0].id,'existing');assert(!data.classes.some(row=>row.id===c.id));assert.deepEqual(Object.keys(data.locations[0]).sort(),['address','id','name']);assert(!JSON.stringify(data).includes('version'));
  for(const action of ['classes','save_class','save_location','assign_class','review_enrollment'])assert.equal((await r.adminCall({action},'incorrect')).status,401);
 }finally{await r.db.close();}
});
