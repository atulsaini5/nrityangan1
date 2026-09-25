import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEnrollmentRuntime,fixture,model} from './helpers/enrollment-runtime.mjs';
test('enrollment review, consent evidence, idempotency, withdrawal and contact edits',async()=>{
 const r=await createEnrollmentRuntime();try{
  await r.db.exec("insert into class_sessions values('class-a','Beginner','Studio','Monday','Teacher','Beginner','Kids')");
  const form=fixture({email_opt_in:true,sms_opt_in:true,class_id:'class-a'});
  const submitted=await r.call({action:'submit',enrollment:form});assert.equal(submitted.status,201);const {reference}=await submitted.json();
  assert.equal((await r.db.query('select count(*)::int n from students')).rows[0].n,0);
  assert.equal((await r.call({action:'submit',enrollment:form})).status,201);
  const events=(await r.db.query('select * from communication_consent_events')).rows;assert.equal(events.length,2);assert(events.every(e=>e.decision==='opted_in'));assert.equal(events[1].disclosure_text,model.SMS_CONSENT);assert.equal(events[0].evidence.contact_verified,false);
  assert.equal((await r.call({action:'submit',enrollment:{...form,student_name:'Changed'}})).status,409);
  const listed=await (await r.adminCall({action:'enrollments'})).json();assert.equal(listed.requests.length,1);assert(!JSON.stringify(listed).includes('token_hash'));assert(!JSON.stringify(listed).includes(form.preference_token));
  const reviewed=await r.adminCall({action:'review_enrollment',id:reference,outcome:'approved',student_id:null});assert.equal(reviewed.status,200);const {student_id}=await reviewed.json();
  assert.equal((await r.adminCall({action:'review_enrollment',id:reference,outcome:'approved',student_id:null})).status,409);
  let student=(await (await r.adminCall({action:'detail',id:student_id})).json()).student;assert.equal(student.contact_email,form.email);assert.equal(student.contact_phone,'+14255550123');assert.equal(student.enrollments.length,1);assert.equal(student.consent_events.length,2);
  const directory=(await (await r.adminCall({action:'list'})).json()).students;assert.deepEqual(directory[0].class_ids,['class-a']);assert.deepEqual(directory[0].academic_years,['2026-27']);
  const updated=await r.adminCall({action:'save',student:{...student,contact_email:'new@example.test'}});assert.equal(updated.status,200);assert.equal((await r.db.query('select count(*)::int n from communication_consent_events')).rows[0].n,2);
  assert.equal((await r.call({action:'withdraw',token:'b'.repeat(64),channel:'sms'})).status,404);
  assert.equal((await r.call({action:'withdraw',token:form.preference_token,channel:'sms'})).status,200);
  assert.equal((await r.call({action:'withdraw',token:form.preference_token,channel:'sms'})).status,200);
  const after=(await r.db.query('select * from communication_consent_events order by recorded_at')).rows;assert.equal(after.length,3);assert.equal(after[2].decision,'withdrawn');assert.equal(after[2].destination,'+14255550123');assert.equal(after[0].decision,'opted_in');
  await assert.rejects(r.db.exec("update communication_consent_events set decision='opted_in'"),/append-only/);
  await assert.rejects(r.db.exec('delete from communication_consent_events'),/append-only/);
  for(const role of ['anon','authenticated']){await r.db.exec('set role '+role);await assert.rejects(r.db.query('select * from enrollment_requests'),/permission denied/);await assert.rejects(r.db.query("select submit_enrollment('{}')"),/permission denied/);await r.db.exec('reset role');}
  for(const action of ['enrollments','review_enrollment','withdraw_consent'])assert.equal((await r.adminCall({action},'wrong')).status,401);
 }finally{await r.db.close();}
});
test('optional choices, untrusted fields, rate limit, stale review and atomic invalid class rejection',async()=>{
 const r=await createEnrollmentRuntime();try{
  const form=fixture({phone:''});assert.equal((await r.call({action:'submit',enrollment:form})).status,201);
  const choices=(await r.db.query('select decision from communication_consent_events')).rows;assert(choices.every(c=>c.decision==='not_opted_in'));
  assert.equal((await r.call({action:'submit',enrollment:{...fixture(),phone:'',sms_opt_in:true}})).status,400);
  assert.equal((await r.call({action:'submit',enrollment:{...fixture(),adult_attestation:false}})).status,400);
  assert.equal((await r.call({action:'submit',enrollment:{...fixture(),consent_version:'old'}})).status,400);
  assert.equal((await r.call({action:'submit',enrollment:{...fixture(),website:'bot'}})).status,400);
  const foreign=await r.enrollment(new Request('http://example.test',{method:'POST',headers:{Origin:'https://bad.example'},body:'{}'}));assert.equal(foreign.status,403);
  const invalid=await r.call({action:'submit',enrollment:fixture({request_key:crypto.randomUUID(),preference_token:'c'.repeat(64),class_id:'missing'})});assert.equal(invalid.status,400);assert.equal((await r.db.query('select count(*)::int n from enrollment_requests')).rows[0].n,1);
  const existing=(await r.db.query("insert into students(display_name,certificate_name,current_level) values('Canonical Name','CANONICAL NAME','Level Two') returning id,version")).rows[0];
  const request=(await r.db.query('select id from enrollment_requests')).rows[0];
  assert.equal((await r.adminCall({action:'review_enrollment',id:request.id,outcome:'approved',student_id:existing.id,version:0})).status,409);
  assert.equal((await r.adminCall({action:'review_enrollment',id:request.id,outcome:'approved',student_id:existing.id,version:existing.version})).status,200);
  const linked=(await r.db.query('select * from students where id=$1',[existing.id])).rows[0];assert.equal(linked.display_name,'Canonical Name');assert.equal(linked.current_level,'Level Two');assert.equal(linked.contact_email,form.email);
  for(let i=0;i<5;i++)assert.equal((await r.call({action:'submit',enrollment:fixture({preference_token:String(i+1).repeat(64)})})).status,201);
  assert.equal((await r.call({action:'submit',enrollment:fixture({preference_token:'d'.repeat(64)})})).status,429);
 }finally{await r.db.close();}
});
