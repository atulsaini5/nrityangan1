import fs from 'node:fs/promises';
import ts from 'typescript';
import {createEnrollmentRuntime} from './enrollment-runtime.mjs';
const url=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const model=url(await fs.readFile('lib/guestModel.ts','utf8'));
export const {createGuestHandler}=await import(url((await fs.readFile('supabase/functions/guest-artists/handler.ts','utf8')).replace('../../../lib/guestModel.ts',model)));
export async function createGuestRuntime(){
 const r=await createEnrollmentRuntime();
 await r.db.exec("create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit integer,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant all on storage.objects to anon,authenticated,service_role;create policy legacy_broad on storage.objects for all to authenticated using(true) with check(true);");
 const ids=(await r.db.query("insert into students(display_name,kind,status) values('Example Guest','guest','active'),('Example Instructor','instructor','active'),('Active Student','student','active'),('Inactive Student','student','inactive') returning id,display_name")).rows;
 const guest=ids[0].id,instructor=ids[1].id;
 await r.db.query("insert into recitals values('2026','Example Recital','Evening',true)");
 const sec=(await r.db.query("insert into recital_sections(recital_year,slug,title,time,position) values('2026','first','First','Evening',0) returning id")).rows[0].id;
 const performance=(await r.db.query("insert into recital_performances(section_id,slug,title,number,position) values($1,'example','Example Performance','1',0) returning id",[sec])).rows[0].id;
 await r.db.query('insert into recital_participants(performance_id,student_id,position) values($1,$2,0),($1,$3,1)',[performance,guest,instructor]);
 const before=(await r.db.query("select recital_agenda('2026') agenda")).rows[0].agenda;
 await r.db.exec(await fs.readFile('supabase/migrations/20260925035007_add_guest_artist_profiles.sql','utf8'));
 const photos=new Map();const removed=[];
 const client={...r.client,storage:{from(name){if(name!=='guest-artist-photos')throw Error('Unexpected bucket');return {
  async upload(path,bytes){photos.set(path,bytes);return {data:{path},error:null};},
  async remove(paths){paths.forEach(p=>{photos.delete(p);removed.push(p);});return {error:null};},
  async createSignedUrl(path){return {data:{signedUrl:'https://example.test/private/'+path},error:null};}
 };}}};
 const handler=createGuestHandler({client:()=>client,adminKey:()=> 'guest-test-admin',allowedOrigins:['http://127.0.0.1:4173']});
 const call=(body,key='guest-test-admin')=>handler(new Request('http://127.0.0.1:4190/functions/v1/guest-artists',{method:'POST',headers:{'content-type':'application/json','x-admin-key':key,origin:'http://127.0.0.1:4173'},body:JSON.stringify(body)}));
 return {...r,client,handler,call,guest,instructor,ids,before,photos,removed};
}
