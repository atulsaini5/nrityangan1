import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createEnrollmentRuntime,fixture} from './helpers/enrollment-runtime.mjs';
const source=await fs.readFile('supabase/functions/enrollment/notifications.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {createEnrollmentNotifier}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const credentials=()=>({accountSid:'test-account',authToken:'test-token'});
const seed=r=>r.db.exec("insert into enrollment_notification_recipients(email) values('first@example.test'),('second@example.test')");

test('committed enrollment notifies configured recipients once, with escaped text and private details omitted',async()=>{
 let notify;const messages=[];
 const r=await createEnrollmentRuntime({notify:()=>notify()});
 try{
  await seed(r);
  notify=createEnrollmentNotifier({client:()=>r.client,credentials,send:async(url,options)=>{
   assert.equal(url,'https://comms.twilio.com/v1/Emails');
   assert.equal(options.headers.Authorization,'Basic '+btoa('test-account:test-token'));
   assert.equal((await r.db.query('select count(*)::int n from enrollment_requests')).rows[0].n,1);
   messages.push(JSON.parse(options.body));return new Response(null,{status:202});
  }});
  await r.db.exec('set role service_role');
  const form=fixture({student_name:'Example <script>{{name}}</script>',to:'unexpected@example.test'});
  assert.equal((await r.call({action:'submit',enrollment:form})).status,201);
  await Promise.all([r.call({action:'submit',enrollment:form}),r.call({action:'submit',enrollment:form})]);
  assert.equal(messages.length,2);
  assert.deepEqual(messages.map(m=>m.to[0].address).sort(),['first@example.test','second@example.test']);
  assert(messages.every(m=>m.content.html.includes('| escape')));
  assert(messages.every(m=>m.to[0].variables.enrollment.includes(form.student_name)));
  assert(messages.every(m=>m.to[0].variables.enrollment.includes('https://www.kathakseattle.com/admin')));
  for(const secret of [form.preference_token,form.email,form.phone])assert(!JSON.stringify(messages).includes(secret));
  assert((await r.db.query('select status,attempts from enrollment_notifications')).rows.every(n=>n.status==='accepted'&&n.attempts===1));
  assert.equal((await r.call({action:'withdraw',token:form.preference_token,channel:'email'})).status,200);
  assert.equal(messages.length,2);
  await r.db.exec('reset role');
  for(const role of ['anon','authenticated']){
   await r.db.exec('set role '+role);
   for(const table of ['enrollment_notification_recipients','enrollment_notifications'])await assert.rejects(r.db.query('select * from '+table),/permission denied/);
   await assert.rejects(r.db.query('select claim_enrollment_notifications()'),/permission denied/);
   await r.db.exec('reset role');
  }
 }finally{await r.db.close();}
});

test('rejected recipients retry independently; ambiguous delivery is retained without blind resending',async()=>{
 let notify;let mode='reject';let calls=0;
 const r=await createEnrollmentRuntime({notify:()=>notify(),adminKey:()=> 'test-admin'});
 try{
  await seed(r);
  notify=createEnrollmentNotifier({client:()=>r.client,credentials,send:async(_url,options)=>{
   calls++;const recipient=JSON.parse(options.body).to[0].address;
   if(mode==='timeout')throw Error('Timeout');
   return new Response(null,{status:recipient==='second@example.test'&&mode==='reject'?429:202});
  }});
  const form=fixture();assert.equal((await r.call({action:'submit',enrollment:form})).status,201);
  assert.equal(calls,2);
  await r.call({action:'submit',enrollment:form});assert.equal(calls,2);
  await r.db.exec("update enrollment_notifications set attempted_at=now()-interval '6 minutes' where status='failed'");
  mode='accept';await notify();assert.equal(calls,3);
  assert((await r.db.query('select status from enrollment_notifications')).rows.every(n=>n.status==='accepted'));
  mode='timeout';assert.equal((await r.call({action:'submit',enrollment:fixture({preference_token:'b'.repeat(64)})})).status,201);
  assert.equal(calls,5);await notify();assert.equal(calls,5);
  assert.equal((await r.db.query("select count(*)::int n from enrollment_notifications where status='unknown'")).rows[0].n,2);
  assert.equal((await r.call({action:'retry_notifications'})).status,401);
  assert.equal((await r.call({action:'submit',enrollment:{}})).status,400);assert.equal(calls,5);
  await assert.rejects(createEnrollmentNotifier({client:()=>r.client,credentials:()=>undefined})(),/credentials unavailable/);
 }finally{await r.db.close();}
});

test('notification dispatch failure cannot erase a saved enrollment or create extra consent events',async()=>{
 const r=await createEnrollmentRuntime({notify:async()=>{throw Error('Worker unavailable');}});
 try{
  await seed(r);const form=fixture();assert.equal((await r.call({action:'submit',enrollment:form})).status,201);
  assert.equal((await r.db.query('select count(*)::int n from enrollment_requests')).rows[0].n,1);
  assert.equal((await r.db.query('select count(*)::int n from communication_consent_events')).rows[0].n,2);
  assert.equal((await r.db.query("select count(*)::int n from enrollment_notifications where status='pending'")).rows[0].n,2);
  assert.equal((await r.call({action:'submit',enrollment:fixture({class_id:'missing',preference_token:'b'.repeat(64)})})).status,400);
  assert.equal((await r.db.query('select count(*)::int n from enrollment_notifications')).rows[0].n,2);
 }finally{await r.db.close();}
});
