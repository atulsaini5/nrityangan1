import fs from 'node:fs/promises';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const url=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const modelUrl=url(await fs.readFile('lib/enrollmentModel.ts','utf8'));
const studentUrl=url(await fs.readFile('lib/studentModel.ts','utf8'));
export const model=await import(modelUrl);
export const {createEnrollmentHandler}=await import(url((await fs.readFile('supabase/functions/enrollment/handler.ts','utf8')).replace('../../../lib/enrollmentModel.ts',modelUrl)));
const {createStudentHandler}=await import(url((await fs.readFile('supabase/functions/students/handler.ts','utf8')).replace('../../../lib/studentModel.ts',studentUrl)));
export async function createEnrollmentRuntime(options={}){
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
 for(const file of ['20260925021422_create_student_management.sql','20260925025212_add_student_enrollment_consent.sql','20260925032621_add_enrollment_notifications.sql'])await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
 const client={async rpc(name,args){if(!/^[a-z_]+$/.test(name))throw Error('Invalid RPC');try{const keys=Object.keys(args);const row=(await db.query(`select ${name}(${keys.map((k,i)=>`${k} => $${i+1}`).join(',')}) result`,Object.values(args).map(v=>typeof v==='object'&&v!==null?JSON.stringify(v):v))).rows[0];return {data:row.result,error:null};}catch(e){return {data:null,error:{code:e.code,message:e.message}};}},from(table){if(!['students','class_sessions','enrollment_requests'].includes(table))throw Error('Unexpected table');const filters=[];const q={fields:'*',start:0,count:500,single:false,select(fields){q.fields=fields;return q;},eq(field,value){filters.push([field,value]);return q;},order(){return q;},range(start,end){q.start=start;q.count=end-start+1;return q;},maybeSingle(){q.single=true;return q;},async then(resolve,reject){try{const params=filters.map(f=>f[1]);let rows=(await db.query(`select * from ${table}${filters.length?' where '+filters.map(([f],i)=>`${f}=$${i+1}`).join(' and '):''} limit ${q.count} offset ${q.start}`,params)).rows;
 if(q.fields!=='*'){const fields=q.fields.replace(',communication_consent_events(*)','').split(',');rows=await Promise.all(rows.map(async r=>({...Object.fromEntries(fields.map(f=>[f,r[f]])),...(q.fields.includes('communication_consent_events')?{communication_consent_events:(await db.query('select * from communication_consent_events where enrollment_id=$1',[r.id])).rows}:{})})));}
 resolve({data:q.single?rows[0]||null:rows,error:null});}catch(e){reject(e);}}};return q;}};
 const enrollment=createEnrollmentHandler({client:()=>client,allowedOrigins:['http://127.0.0.1:4173'],...options});
 const admin=createStudentHandler({client:()=>client,adminKey:()=> 'local-enrollment-preview',allowedOrigins:['http://127.0.0.1:4173']});
 const call=(body)=>enrollment(new Request('http://127.0.0.1:4190/functions/v1/enrollment',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:4173'},body:JSON.stringify(body)}));
 const adminCall=(body,key='local-enrollment-preview')=>admin(new Request('http://127.0.0.1:4190/functions/v1/students',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':key},body:JSON.stringify(body)}));
 return {db,client,enrollment,admin,call,adminCall};
}
export function fixture(overrides={}){return {request_key:crypto.randomUUID(),preference_token:'a'.repeat(64),student_name:'Example Student',contact_name:'Example Parent',relationship:'parent_guardian',email:'parent@example.test',phone:'4255550123',class_id:'',academic_year:'2026-27',notes:'',email_opt_in:false,sms_opt_in:false,adult_attestation:true,consent_version:model.CONSENT_VERSION,website:'',...overrides};}
