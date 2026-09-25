import { useEffect, useState } from 'react';
import { Plus, Search, Users, X } from 'lucide-react';
import { ClassSession, emptyStudent, Student, validateStudent } from '../lib/studentModel';

const endpoint = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1/students`;
const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
type Summary = Pick<Student, 'id' | 'display_name' | 'current_level' | 'status' | 'kind' | 'needs_review' | 'aliases'>;
export default function StudentAdmin({ accessCode, active }: { accessCode: string; active: boolean }) {
 const [students,setStudents]=useState<Summary[]>([]), [classes,setClasses]=useState<ClassSession[]>([]);
 const [student,setStudent]=useState<Student|null>(null), [original,setOriginal]=useState('');
 const [search,setSearch]=useState(''), [filter,setFilter]=useState('all'), [busy,setBusy]=useState(false), [loaded,setLoaded]=useState(false);
 const [message,setMessage]=useState(''), [error,setError]=useState('');
 const dirty=!!student && JSON.stringify(student)!==original;
 const api=async(body: unknown) => {
  const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':accessCode},body:JSON.stringify(body)});
  const data=await res.json(); if(!res.ok) throw new Error(data.error || 'Unable to load students.'); return data;
 };
 const load=async() => {
  setBusy(true);setError('');
  try {
   let result: Summary[]=[]; let offset=0;
   while(true) { const data=await api({action:'list',offset}); result=result.concat(data.students);setClasses(data.classes); if(data.students.length<500) break;offset+=500; }
   setStudents(result);setLoaded(true);
  } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
 };
 useEffect(()=>{if(active&&!loaded) void load();},[active]);
 useEffect(()=>{const guard=(event: BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 const open=async(id?: string) => {
  if(dirty&&!window.confirm('Discard unsaved student changes?')) return;
  setBusy(true);setError('');setMessage('');
  try {const next=id?(await api({action:'detail',id})).student:emptyStudent();setStudent(next);setOriginal(JSON.stringify(next));}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 const save=async(event: React.FormEvent)=>{
  event.preventDefault();if(!student)return;setError('');setMessage('');
  try {validateStudent(student);}catch(e){setError((e as Error).message);return;}
  setBusy(true);
  try {const next=(await api({action:'save',student})).student;setStudent(next);setOriginal(JSON.stringify(next));setStudents(list=>[...list.filter(s=>s.id!==next.id),next].sort((a,b)=>a.display_name.localeCompare(b.display_name)));setMessage('Student saved. Linked agenda names are updated.');}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 const patch=(changes: Partial<Student>)=>setStudent(s=>s?{...s,...changes}:s);
 const visible=students.filter(s=>(filter==='all'||(filter==='review'?s.needs_review:filter==='inactive'?s.status==='inactive':s.kind===filter))&&[s.display_name,...s.aliases].join(' ').toLowerCase().includes(search.toLowerCase()));
 return <div>
  {error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
  {message&&<p role="status" className="mb-4 rounded-xl bg-emerald-50 p-4 text-emerald-800">{message}</p>}
  <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
   <section aria-label="Student directory" className="rounded-2xl bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Users size={19}/>Directory ({students.length})</h2><button type="button" disabled={busy} onClick={()=>open()} className="flex items-center gap-1 rounded-lg bg-rose-700 px-3 py-2 text-sm text-white"><Plus size={16}/>Add</button></div>
    <label className="mt-4 block text-sm"><span className="flex items-center gap-1"><Search size={14}/>Search names or aliases</span><input className={input} value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <label className="mt-3 block text-sm">Show<select className={input} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Everyone</option><option value="student">Students</option><option value="guest">Guest artists</option><option value="instructor">Instructors</option><option value="review">Needs identity review</option><option value="inactive">Inactive</option></select></label>
    <button type="button" disabled={busy} onClick={load} className="my-3 text-sm text-rose-700 underline">Refresh directory</button>
    {busy&&<p role="status" className="py-2 text-sm">Loading…</p>}
    <ul className="max-h-[65vh] space-y-1 overflow-y-auto">{visible.map(s=><li key={s.id}><button disabled={busy} onClick={()=>open(s.id)} className={`w-full rounded-lg p-3 text-left ${student?.id===s.id?'bg-rose-50 ring-1 ring-rose-200':'hover:bg-slate-50'}`}><span className="block font-medium">{s.display_name}</span><span className="block text-xs text-slate-500">{s.needs_review?'Identity needs review':s.current_level|| (s.kind==='student'?'Level not recorded':s.kind)}{s.status==='inactive'?' · Inactive':''}</span></button></li>)}</ul>
    {loaded&&!visible.length&&<p className="py-6 text-sm text-slate-500">No matching records.</p>}
   </section>
   {student?<form onSubmit={save} className="min-w-0 rounded-2xl bg-white p-5 shadow-sm sm:p-7">
    <fieldset disabled={busy} className="min-w-0 space-y-6">
     <div><h2 className="font-serif text-2xl">{student.id?student.display_name:'New student'}</h2><p className="mt-1 text-sm text-slate-500">Names appear on linked agendas. Class assignments, certificates and notes are private.</p></div>
     <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Display name<input required maxLength={160} className={input} value={student.display_name} onChange={e=>patch({display_name:e.target.value})}/></label>
      <label className="text-sm">Name on certificate<input maxLength={160} className={input} value={student.certificate_name} onChange={e=>patch({certificate_name:e.target.value})}/></label>
      <label className="text-sm sm:col-span-2">Current level<input maxLength={200} className={input} value={student.current_level} onChange={e=>patch({current_level:e.target.value})}/><span className="mt-1 block text-xs text-slate-500">Imported levels reflect the 2025–26 certificate list; update as students advance.</span></label>
      <label className="text-sm">Record type<select className={input} value={student.kind} onChange={e=>patch({kind:e.target.value as Student['kind']})}><option value="student">Student</option><option value="guest">Guest artist</option><option value="instructor">Instructor</option></select></label>
      <label className="text-sm">Status<select className={input} value={student.status} onChange={e=>patch({status:e.target.value as Student['status']})}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label className="text-sm sm:col-span-2">Alternate names (one per line)<textarea className={input} value={student.aliases.join('\n')} onChange={e=>patch({aliases:e.target.value.split('\n')})} onBlur={()=>patch({aliases:student.aliases.map(s=>s.trim()).filter(Boolean)})}/></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={student.needs_review} onChange={e=>patch({needs_review:e.target.checked})}/>Identity needs review</label>
     </div>
     <section><h3 className="text-lg font-semibold">Class assignments</h3><p className="mt-1 text-sm text-slate-500">Keep past years to preserve enrollment history.</p>
      {!student.enrollments.length&&<p className="my-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Unassigned — select a class when confirmed.</p>}
      {student.enrollments.map((enrollment,i)=><div key={i} className="mt-3 rounded-xl border p-3"><label className="block text-sm">Class and schedule<select required className={input} value={enrollment.class_id} onChange={e=>patch({enrollments:student.enrollments.map((v,j)=>j===i?{...v,class_id:e.target.value}:v)})}><option value="">Select a class</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} · {c.schedule} · {c.location}</option>)}</select></label><div className="mt-2 flex items-end gap-3"><label className="flex-1 text-sm">Academic year<input required placeholder="2026-27" className={input} value={enrollment.academic_year} onChange={e=>patch({enrollments:student.enrollments.map((v,j)=>j===i?{...v,academic_year:e.target.value}:v)})}/></label><button type="button" aria-label={`Remove class assignment ${i+1}`} onClick={()=>patch({enrollments:student.enrollments.filter((_,j)=>j!==i)})} className="p-2 text-rose-700"><X size={20}/></button></div></div>)}
      <button type="button" className="mt-3 text-sm font-semibold text-rose-700" onClick={()=>patch({enrollments:[...student.enrollments,{class_id:'',academic_year:''}]})}>+ Assign class</button>
     </section>
     <section><h3 className="text-lg font-semibold">Certification history</h3>
      {!student.certifications.length&&<p className="mt-2 text-sm text-slate-500">No certifications recorded.</p>}
      {student.certifications.map((cert,i)=><div key={i} className="mt-3 grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
       {(['title','academic_year','certificate_name'] as const).map(key=><label key={key} className={`text-sm ${key==='certificate_name'?'sm:col-span-2':''}`}>{key==='title'?'Certification':key==='academic_year'?'Academic year':'Name printed on certificate'}<input required={key!=='certificate_name'} className={input} placeholder={key==='academic_year'?'2025-26':undefined} value={cert[key]} onChange={e=>patch({certifications:student.certifications.map((v,j)=>j===i?{...v,[key]:e.target.value}:v)})}/></label>)}
       <button type="button" className="text-left text-sm text-rose-700" onClick={()=>patch({certifications:student.certifications.filter((_,j)=>j!==i)})}>Remove certification</button>
      </div>)}
      <button type="button" className="mt-3 text-sm font-semibold text-rose-700" onClick={()=>patch({certifications:[...student.certifications,{title:'',academic_year:'',certificate_name:student.certificate_name}]})}>+ Add certification</button>
     </section>
     <label className="block text-sm">Private notes<textarea rows={3} maxLength={5000} className={input} value={student.notes} onChange={e=>patch({notes:e.target.value})}/></label>
     <section><h3 className="text-lg font-semibold">Recital participation</h3><ul className="mt-2 divide-y">{student.performances?.map((p,i)=><li key={i} className="py-2 text-sm"><a href={`/recitals/${p.year}/agenda`} target="_blank" rel="noreferrer" className="font-medium text-rose-700">{p.year} · {p.recital}</a><p>{p.number?`${p.number}. `:''}{p.title}{p.role?` · ${p.role}`:''}</p></li>)}</ul>{!student.performances?.length&&<p className="mt-2 text-sm text-slate-500">No linked performances yet.</p>}</section>
     <div className="flex flex-wrap items-center gap-4 border-t pt-5"><button className="rounded-xl bg-rose-700 px-6 py-3 font-semibold text-white disabled:opacity-50" disabled={busy||!dirty}>{busy?'Saving…':'Save student'}</button>{student.id&&<button type="button" onClick={()=>open(student.id)} className="text-sm text-slate-600 underline">Reload student</button>}{dirty&&<span className="text-sm text-amber-700">Unsaved changes</span>}</div>
    </fieldset>
   </form>:<div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Select a student to edit their details, classes and certificates.</div>}
  </div>
 </div>;
}
