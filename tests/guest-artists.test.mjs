import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {createGuestRuntime} from './helpers/guest-runtime.mjs';
const profile=async(r,id=r.guest)=>(await (await r.call({action:'detail',id})).json()).profile;
const invite=async(r,id=r.guest)=>{const response=await r.call({action:'invite',id});assert.equal(response.status,200);return (await response.json()).url.split('#')[1];};
const complete=p=>({...p,email:'guest@example.test',phone:'+14255550123',bio:'Example artist biography.'});
const photo=Buffer.from('RIFF0000WEBPVP8 example').toString('base64');
test('guest separation preserves roster links and keeps student APIs scoped to students',async()=>{
 const r=await createGuestRuntime();try{
  assert.deepEqual((await r.db.query("select recital_agenda('2026') agenda")).rows[0].agenda,r.before);
  const guests=(await (await r.call({action:'list'})).json()).guests;assert.equal(guests.length,2);assert.deepEqual(guests.map(g=>g.role).sort(),['guest','instructor']);
  const students=(await (await r.adminCall({action:'list'})).json()).students;assert.equal(students.length,2);assert(students.every(s=>s.kind==='student'));
  assert.equal((await r.adminCall({action:'detail',id:r.guest})).status,404);
  assert.equal((await r.adminCall({action:'save',student:{kind:'guest'}})).status,400);
  await assert.rejects(r.db.query("select save_student($1)",[JSON.stringify({id:r.guest,kind:'student'})]),/Student not found/);
  const p=await profile(r);assert.equal((await r.call({action:'save',profile:{...p,display_name:'Updated Guest'}})).status,200);
  const agenda=(await r.db.query("select recital_agenda('2026') agenda")).rows[0].agenda;assert(JSON.stringify(agenda).includes('Updated Guest'));
  assert.equal((await r.db.query('select count(*)::int n from recital_participants')).rows[0].n,2);
  assert.equal((await r.call({action:'save',profile:{...p,display_name:'Stale Guest'}})).status,409);
  for(const role of ['anon','authenticated']){await r.db.exec('set role '+role);for(const table of ['guest_artists','guest_profile_changes','guest_invitations'])await assert.rejects(r.db.query('select * from '+table),/permission denied/);await assert.rejects(r.db.query('select guest_directory()'),/permission denied/);await r.db.exec('reset role');}
  await r.db.exec("set role authenticated");await assert.rejects(r.db.query("insert into storage.objects(bucket_id,name) values('guest-artist-photos','bad.webp')"),/row-level security/);await r.db.exec('reset role');
 }finally{await r.db.close();}
});
test('private single-use invitation enforces expiry, revocation, version checks and guest ownership',async()=>{
 const r=await createGuestRuntime();try{
  for(const action of ['list','detail','invite','save','revoke'])assert.equal((await r.call({action,id:r.guest},'bad')).status,401);
  const first=await invite(r);const token=await invite(r);assert.equal((await r.call({action:'invitation',token:first},'')).status,404);
  const view=await (await r.call({action:'invitation',token},'')).json();assert.equal(view.profile.id,r.guest);assert(!JSON.stringify(view).includes('token_hash'));
  const input=complete(view.profile);
  assert.equal((await r.call({action:'submit_invitation',token,profile:input},'')).status,400);
  assert.equal((await r.call({action:'save',profile:{...input,bio:'Admin edit'}})).status,200);
  assert.equal((await r.call({action:'submit_invitation',token,profile:input,authorized:true},'')).status,409);
  const fresh=complete(await profile(r));
  assert.equal((await r.call({action:'submit_invitation',token,profile:{...fresh,id:r.instructor,role:'instructor',status:'inactive',photo_path:'stolen.webp'},authorized:true,photo},'')).status,200);
  const saved=await profile(r);assert.equal(saved.role,'guest');assert.equal(saved.status,'active');assert.equal(saved.bio,fresh.bio);assert.notEqual(saved.photo_path,'stolen.webp');assert.equal(r.photos.size,1);
  assert.equal((await profile(r,r.instructor)).display_name,'Example Instructor');
  assert.equal((await r.call({action:'invitation',token},'')).status,404);assert.equal((await r.call({action:'submit_invitation',token,profile:fresh,authorized:true},'')).status,404);
  assert.equal((await r.db.query("select count(*)::int n from guest_profile_changes where source='invitation'")).rows[0].n,1);
  const revoked=await invite(r);await r.call({action:'revoke',id:r.guest});assert.equal((await r.call({action:'invitation',token:revoked},'')).status,404);
  const expired=await invite(r);await r.db.exec("update guest_invitations set expires_at=now()-interval '1 day'");assert.equal((await r.call({action:'invitation',token:expired},'')).status,404);
 }finally{await r.db.close();}
});
test('photo validation and rollback clean only failed uploads; private invitation pages skip analytics',async()=>{
 const r=await createGuestRuntime();try{
  const p=await profile(r);assert.equal((await r.call({action:'save',profile:p,photo:btoa('<svg>bad</svg>')})).status,400);
  assert.equal((await r.call({action:'save',profile:p,photo})).status,200);const old=(await profile(r)).photo_path;
  assert.equal((await r.call({action:'save',profile:p,photo})).status,409);assert.equal(r.photos.size,1);assert(r.photos.has(old));assert.equal(r.removed.length,1);
  await r.db.exec('set role service_role');assert.equal((await r.call({action:'save',profile:{...await profile(r),bio:'Service-role edit'}})).status,200);await r.db.exec('reset role');
  const html=await fs.readFile('index.html','utf8');assert(html.includes("!['/guest-invitation', '/communication-preferences'].includes(window.location.pathname)"));assert(!html.includes('<script async src="https://www.googletagmanager.com'));
 }finally{await r.db.close();}
});
