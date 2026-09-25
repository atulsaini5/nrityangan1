import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const url=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const modelUrl=url(await fs.readFile('lib/studentModel.ts','utf8'));
const {emptyStudent,validateStudent}=await import(modelUrl);
const {createStudentHandler}=await import(url((await fs.readFile('supabase/functions/students/handler.ts','utf8')).replace('../../../lib/studentModel.ts',modelUrl)));
const migration=await fs.readFile('supabase/migrations/20260925021422_create_student_management.sql','utf8');
test('private registry: atomic saves, stale edit guard, public projection and privileges',async()=>{
 const db=new PGlite();
 try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;');
  await db.exec(migration);
  const rpc=async(name,arg)=>(await db.query(`select ${name}($1) as result`,[arg])).rows[0].result;
  const student=await rpc('save_student',JSON.stringify({...emptyStudent(),display_name:'Test Student',notes:'Private note',certifications:[{title:'Level One',academic_year:'2025-26',certificate_name:'TEST STUDENT'}]}));
  assert.equal(student.version,1);assert.equal(student.certifications.length,1);
  await db.exec(`insert into class_sessions values('class-1','Class','Studio','Monday','Teacher','Beginner','Kids'); insert into recitals values('2026','Recital','4–9',true);
   insert into recital_sections(recital_year,slug,title,time,position) values('2026','first','First Half','4–6',1);
   insert into recital_performances(section_id,slug,title,position) select id,'dance','Dance',1 from recital_sections;
  `);
  await db.query(`insert into recital_participants(performance_id,student_id,position) select id,$1,1 from recital_performances`,[student.id]);
  const changed=await rpc('save_student',JSON.stringify({...student,display_name:'Correct Name',enrollments:[{class_id:'class-1',academic_year:'2026-27'}]}));
  assert.equal(changed.version,2);assert.equal(changed.enrollments.length,1);assert.equal(changed.performances.length,1);
  await assert.rejects(rpc('save_student',JSON.stringify(student)),/Record changed/);
  await assert.rejects(rpc('save_student',JSON.stringify({...changed,display_name:'Should roll back',enrollments:[{class_id:'missing',academic_year:'2026-27'}]})));
  const after=await rpc('student_detail',student.id);assert.equal(after.display_name,'Correct Name');assert.equal(after.certifications.length,1);assert.equal(after.version,2);
  const agenda=await rpc('recital_agenda','2026');assert.deepEqual(agenda.sections[0].items[0].participants,['Correct Name']);
  assert(!JSON.stringify(agenda).includes('Private note'));assert(!JSON.stringify(agenda).includes(student.id));assert(!JSON.stringify(agenda).includes('Level One'));
  await db.exec("update recitals set published=false");assert.equal(await rpc('recital_agenda','2026'),null);
  const sameName=await rpc('save_student',JSON.stringify({...emptyStudent(),display_name:'Correct Name'}));assert.notEqual(sameName.id,student.id);
  for(const role of ['anon','authenticated']) {
   await db.exec(`set role ${role}`);
   await assert.rejects(db.query('select * from students'),/permission denied/);
   await assert.rejects(rpc('student_detail',student.id),/permission denied/);
   await assert.rejects(rpc('recital_agenda','2026'),/permission denied/);
   await db.exec('reset role');
  }
  await db.exec('set role service_role');assert.equal((await rpc('student_detail',student.id)).display_name,'Correct Name');await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int n from student_changes')).rows[0].n,1);
 }finally{await db.close();}
});
test('edge function authenticates all private actions before client access and validates saves',async()=>{
 let calls=0;
 const handler=createStudentHandler({client:()=>{calls++;return {rpc:async(name)=>({data:name==='recital_agenda'?{year:'2026'}:null,error:null})};},adminKey:()=> 'private-test-key',allowedOrigins:['https://www.kathakseattle.com']});
 const call=(body,key)=>handler(new Request('https://example.test/students',{method:'POST',headers:{'x-admin-key':key||'','Content-Type':'application/json'},body:JSON.stringify(body)}));
 for(const action of ['list','detail','save'])assert.equal((await call({action})).status,401);
 assert.equal(calls,0);
 assert.equal((await call({action:'save',student:{...emptyStudent(),display_name:'Test',certifications:[{title:'Level',academic_year:'2026-26',certificate_name:''}]}},'private-test-key')).status,400);
 const response=await handler(new Request('https://example.test/students?year=2026'));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal((await handler(new Request('https://example.test/students?year=2026%27'))).status,400);
 assert.throws(()=>validateStudent({...emptyStudent(),display_name:'Test',enrollments:[{class_id:'c',academic_year:'2026-27'},{class_id:'c',academic_year:'2026-27'}]}),/duplicate/);
});
