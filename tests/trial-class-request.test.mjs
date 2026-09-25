import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile('supabase/functions/trial-class-request/handler.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {createTrialClassHandler}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const valid={contact_name:'Example Parent',student_name:'Example Student',email:'parent@example.test',phone:'4255550123',class_interest:'Beginner Kids',location_interest:'Example Studio',notes:'Example note'};
const req=(body=valid,origin='https://www.kathakseattle.com')=>new Request('https://example.test',{method:'POST',headers:{origin},body:JSON.stringify(body)});
function setup({send,credentials=()=>({accountSid:'account',authToken:'token'}),insertError=null,updateError=null}={}){
 const inserts=[],updates=[],messages=[];
 const client=()=>({from(table){assert.equal(table,'trial_class_requests');return {
  insert(row){inserts.push(row);return {select(){return {async single(){return {data:{id:'test-request'},error:insertError};}};}};},
  update(row){updates.push(row);return {async eq(field,id){assert.equal(field,'id');assert.equal(id,'test-request');return {error:updateError};}};}
 };}});
 const handler=createTrialClassHandler({client,credentials,allowedOrigins:['https://www.kathakseattle.com'],send:async(url,options)=>{
  assert.equal(inserts.length,1);assert.equal(url,'https://comms.twilio.com/v1/Emails');assert.equal(options.headers.Authorization,'Basic '+btoa('account:token'));
  messages.push(JSON.parse(options.body));return send?send(url,options):new Response(null,{status:202});
 }});
 return {handler,inserts,updates,messages};
}
test('trial request uses direct Twilio and exactly the two configured recipients with escaped template variables',async()=>{
 const r=setup();const body={...valid,notes:'<script>{{ dangerous }}</script>',to:'attacker@example.test'};
 assert.equal((await r.handler(req(body))).status,201);
 assert.deepEqual(r.messages.map(m=>m.to[0].address).sort(),['at@teamevents.ai','tumam_b@yahoo.com']);
 assert(r.messages.every(m=>m.from.address==='support@teamevents.ai'&&m.content.html.includes('| escape')));
 assert(r.messages.every(m=>m.to[0].variables.trial.includes(body.notes)&&m.to[0].variables.trial.includes(valid.email)));
 assert.deepEqual(r.updates,[{notification_sent:true,notification_error:null}]);
});
test('trial request stays saved on partial rejection, network failure or missing credentials',async()=>{
 const partial=setup({send:async(_url,options)=>new Response('private provider response',{status:JSON.parse(options.body).to[0].address==='at@teamevents.ai'?202:403})});
 assert.equal((await partial.handler(req())).status,201);assert.equal(partial.updates[0].notification_sent,false);
 assert.equal(partial.updates[0].notification_error,'tumam_b@yahoo.com: Twilio HTTP 403');
 const timeout=setup({send:async()=>{throw Error('private transport error');}});
 assert.equal((await timeout.handler(req())).status,201);assert.equal(timeout.updates[0].notification_sent,false);assert(!timeout.updates[0].notification_error.includes('private'));
 const missing=setup({credentials:()=>undefined});assert.equal((await missing.handler(req())).status,201);assert.equal(missing.messages.length,0);assert.equal(missing.updates[0].notification_sent,false);
 const tracking=setup({updateError:{message:'failed'}});assert.equal((await tracking.handler(req())).status,201);
});
test('invalid trial requests and failed persistence do not send notifications',async()=>{
 const r=setup();for(const body of [null,[],{}, {...valid,email:'bad email'}, {...valid,notes:'a'.repeat(13000)}])assert((await r.handler(req(body))).status>=400);
 assert.equal((await r.handler(req(valid,'https://bad.example'))).status,403);assert.equal(r.inserts.length,0);assert.equal(r.messages.length,0);
 const failed=setup({insertError:{message:'private database error'}});assert.equal((await failed.handler(req())).status,500);assert.equal(failed.messages.length,0);
});
