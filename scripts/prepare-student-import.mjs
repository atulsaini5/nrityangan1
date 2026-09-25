// Input is a private, untracked JSON file. Never include certifications in public assets.
import fs from 'node:fs';
import ts from 'typescript';
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node scripts/prepare-student-import.mjs private-input.json output.sql');
const source=JSON.parse(fs.readFileSync(input,'utf8'));
const key=s=>s.trim().replace(/\s+/g,' ').toLowerCase();
const title=s=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const aliases=new Map(Object.entries(source.aliases).map(([a,b])=>[key(a),b]));
const people=new Map();
function person(name,cert) {
 const canonical=aliases.get(key(name)) || title(name), k=key(canonical);
 if(!people.has(k)) people.set(k,{import_key:`initial-2026:${k}`,display_name:canonical,certificate_name:'',aliases:[],current_level:'',status:'active',kind:'student',needs_review:false,notes:'',certifications:[],enrollments:[]});
 const p=people.get(k);
 if(name!==canonical&&!p.aliases.includes(name))p.aliases.push(name);
 if(cert){p.certificate_name=name;p.current_level=cert;p.certifications=[{academic_year:'2025-26',title:cert,certificate_name:name}];}
 return p;
}
for(const [name,cert] of source.certificates)person(name,cert);
for(const name of source.parents)person(name);
const agenda=JSON.parse(fs.readFileSync('content/agendas/2026.json','utf8'));
const participants=[];
agenda.sections.forEach(sec=>sec.items.forEach(item=>{item.participants=item.participants.map((label,position)=>{
 const m=label.match(/^(Singer|Tabla|Sarangi):\s*(.+)$/);const role=m?.[1]||'',name=m?.[2]||label;const p=person(name);
 if(role)p.kind='guest';
 participants.push({section:sec.id,performance:item.id,import_key:p.import_key,role,position});
 return role?`${role}: ${p.display_name}`:p.display_name;
});}));
for(const [alias,canonical] of Object.entries(source.aliases)) { const p=people.get(key(canonical)); if(p && !p.aliases.includes(alias)) p.aliases.push(alias); }
for(const [name,note] of Object.entries(source.review)){const p=person(name);p.needs_review=true;p.notes=note;}
for(const [name,kind] of Object.entries(source.record_kinds || {})){const p=people.get(key(name));if(p)p.kind=kind;}
const constants=fs.readFileSync('constants.ts','utf8');
const literal=constants.slice(constants.indexOf('export const LOCATIONS'),constants.indexOf('// --- Class Display Categories ---'));
const module=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(literal,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
const classes=module.CLASSES.map(c=>({id:c.id,name:c.title,location:module.LOCATIONS.find(l=>l.id===c.locationId).name,schedule:`${c.dayOfWeek} ${c.startTime} (${c.durationMinutes} min)`,instructor:c.instructor,level:c.level,age_group:c.ageGroup}));
const payload={students:[...people.values()],classes,agenda,participants};
const quote=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
const sql=`do $student_import$
declare import_payload jsonb := ${quote(payload)};
begin
-- One-time additive import. Existing IDs and edited records survive a rerun.
insert into public.students(import_key,display_name,certificate_name,aliases,current_level,status,kind,needs_review,notes)
select s->>'import_key',s->>'display_name',s->>'certificate_name',array(select jsonb_array_elements_text(s->'aliases')),s->>'current_level',s->>'status',s->>'kind',(s->>'needs_review')::boolean,s->>'notes'
from (select import_payload payload) registry_import,jsonb_array_elements(import_payload->'students') s on conflict(import_key) do nothing;
insert into public.student_certifications(student_id,academic_year,title,certificate_name)
select st.id,c->>'academic_year',c->>'title',c->>'certificate_name' from (select import_payload payload) registry_import,jsonb_array_elements(import_payload->'students') s cross join lateral jsonb_array_elements(s->'certifications') c join public.students st on st.import_key=s->>'import_key'
on conflict(student_id,academic_year,title) do nothing;
insert into public.class_sessions select c.* from (select import_payload payload) registry_import,jsonb_to_recordset(import_payload->'classes') as c(id text,name text,location text,schedule text,instructor text,level text,age_group text) on conflict(id) do nothing;
insert into public.recitals(year,title,time,published) select import_payload->'agenda'->>'year','Kathak Yatra',import_payload->'agenda'->>'time',true from (select import_payload payload) registry_import on conflict(year) do nothing;
insert into public.recital_sections(recital_year,slug,title,time,description,position)
select import_payload->'agenda'->>'year',s->>'id',s->>'title',s->>'time',coalesce(s->>'description',''),ord from (select import_payload payload) registry_import,jsonb_array_elements(import_payload->'agenda'->'sections') with ordinality sec(s,ord) on conflict(recital_year,slug) do nothing;
insert into public.recital_performances(section_id,slug,number,title,position)
select sec.id,p->>'id',p->>'number',p->>'title',ord from (select import_payload payload) registry_import,jsonb_array_elements(import_payload->'agenda'->'sections') s cross join lateral jsonb_array_elements(s->'items') with ordinality perf(p,ord) join public.recital_sections sec on sec.recital_year=import_payload->'agenda'->>'year' and sec.slug=s->>'id' on conflict(section_id,slug) do nothing;
insert into public.recital_participants(performance_id,student_id,role,position)
select perf.id,st.id,p->>'role',(p->>'position')::integer from (select import_payload payload) registry_import,jsonb_array_elements(import_payload->'participants') p join public.students st on st.import_key=p->>'import_key' join public.recital_sections sec on sec.recital_year=import_payload->'agenda'->>'year' and sec.slug=p->>'section' join public.recital_performances perf on perf.section_id=sec.id and perf.slug=p->>'performance' on conflict(performance_id,student_id,role) do nothing;
end $student_import$;`;
fs.writeFileSync(output,sql);
fs.writeFileSync(output+'.json',JSON.stringify(payload,null,2));
fs.writeFileSync(output+'.agenda.json',JSON.stringify(agenda,null,2)+'\n');
console.log(JSON.stringify({records:people.size,certifications:source.certificates.length,classes:classes.length,participants:participants.length,needs_review:payload.students.filter(p=>p.needs_review).map(p=>p.display_name)},null,2));
