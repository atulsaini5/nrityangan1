import { useState } from 'react';
import { CLASSES, LOCATIONS } from '../constants';
import { ADULT_ATTESTATION, CONSENT_VERSION, EMAIL_CONSENT, SMS_CONSENT, EnrollmentInput, validateEnrollment } from '../lib/enrollmentModel';
const endpoint=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1/enrollment';
const input='mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3';
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const academicYear=()=>{const now=new Date(),year=now.getMonth()>=7?now.getFullYear():now.getFullYear()-1;return `${year}-${String((year+1)%100).padStart(2,'0')}`;};
export default function Enrollment(){
 const [form,setForm]=useState<EnrollmentInput>(()=>({request_key:crypto.randomUUID(),preference_token:token(),student_name:'',contact_name:'',relationship:'parent_guardian',email:'',phone:'',class_id:'',academic_year:academicYear(),notes:'',email_opt_in:false,sms_opt_in:false,adult_attestation:false,consent_version:CONSENT_VERSION,website:''}));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[complete,setComplete]=useState(false);
 const patch=(p:Partial<EnrollmentInput>)=>setForm(f=>({...f,...p}));
 const submit=async(event:React.FormEvent)=>{event.preventDefault();setError('');try{const data=validateEnrollment(form);setBusy(true);const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'submit',enrollment:data})});const result=await res.json();if(!res.ok)throw new Error(result.error||'Unable to submit.');setComplete(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const preferences=`${window.location.origin}/communication-preferences#${form.preference_token}`;
 return <main className="bg-[#faf7f2] px-4 py-10 sm:py-16"><div className="mx-auto max-w-2xl">
  <p className="text-sm font-semibold uppercase tracking-widest text-rose-800">Nrityangan Kathak Studio</p><h1 className="mt-3 font-serif text-4xl text-stone-900">Student enrollment</h1>
  {complete?<section role="status" className="mt-8 rounded-2xl border bg-white p-6"><h2 className="font-serif text-2xl">Thank you — your enrollment was received.</h2><p className="mt-3">The studio will review your details and confirm your class placement. Submission does not reserve a place.</p><p className="mt-4">Save this private link to withdraw your messaging consent at any time. Anyone with the link can use it, so keep it private.</p><a href={preferences} className="mt-4 block break-all font-semibold text-rose-800 underline">{preferences}</a><p className="mt-4 text-sm text-stone-600">You can also call (425) 785-5217 for changes or help.</p><a href="/enroll" className="mt-5 inline-block text-rose-800 underline">Enroll another student</a></section>:
  <form onSubmit={submit} className="mt-7 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8"><p className="mb-6 text-stone-600">An adult student or parent/legal guardian should complete one form per student. Contact details are private and are used to manage enrollment and your selected communications.</p>
   <fieldset disabled={busy} className="space-y-5">
    <label className="block font-medium">Student’s full name<input required maxLength={160} autoComplete="off" className={input} value={form.student_name} onChange={e=>patch({student_name:e.target.value})}/></label>
    <label className="block font-medium">I am enrolling<select className={input} value={form.relationship} onChange={e=>patch({relationship:e.target.value as EnrollmentInput['relationship']})}><option value="parent_guardian">My child — I am the parent/legal guardian</option><option value="self">Myself — I am 18 or older</option></select></label>
    <label className="block font-medium">Adult contact’s full name<input required autoComplete="name" maxLength={160} className={input} value={form.contact_name} onChange={e=>patch({contact_name:e.target.value})}/></label>
    <label className="block font-medium">Contact email<input required type="email" autoComplete="email" maxLength={254} className={input} value={form.email} onChange={e=>patch({email:e.target.value})}/><span className="mt-1 block text-sm font-normal text-stone-500">We may respond to this enrollment request even if you do not opt in to ongoing emails.</span></label>
    <label className="block font-medium">Contact phone (optional)<input type="tel" autoComplete="tel" maxLength={40} placeholder="(425) 555-0123" className={input} value={form.phone} onChange={e=>patch({phone:e.target.value})}/><span className="mt-1 block text-sm font-normal text-stone-500">A mobile number is required only if you choose SMS messages.</span></label>
    <label className="block font-medium">Preferred class<select className={input} value={form.class_id} onChange={e=>patch({class_id:e.target.value})}><option value="">Help me choose a class</option>{CLASSES.map(c=><option key={c.id} value={c.id}>{c.title} · {c.dayOfWeek} {c.startTime} · {LOCATIONS.find(l=>l.id===c.locationId)?.name}</option>)}</select></label>
    <label className="block font-medium">Academic year<input required className={input} value={form.academic_year} onChange={e=>patch({academic_year:e.target.value})} placeholder="2026-27"/></label>
    <label className="block font-medium">Anything else we should know? (optional)<textarea maxLength={2000} rows={3} className={input} value={form.notes} onChange={e=>patch({notes:e.target.value})}/></label>
    <div className="space-y-4 rounded-xl bg-rose-50 p-5"><h2 className="font-serif text-2xl">Communication choices</h2><p className="text-sm">Choose either, both, or neither. Your choices do not affect enrollment.</p>
     <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={form.email_opt_in} onChange={e=>patch({email_opt_in:e.target.checked})}/><span><strong className="mb-1 block">Email messages (optional)</strong>{EMAIL_CONSENT}</span></label>
     <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={form.sms_opt_in} onChange={e=>patch({sms_opt_in:e.target.checked})}/><span><strong className="mb-1 block">SMS messages (optional)</strong>{SMS_CONSENT}</span></label>
     <p className="text-sm"><a href="/enrollment-privacy" target="_blank" rel="noreferrer" className="underline">Privacy notice</a> · <a href="/communication-terms" target="_blank" rel="noreferrer" className="underline">Communication terms</a></p>
    </div>
    <label className="flex items-start gap-3 text-sm leading-relaxed"><input required type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={form.adult_attestation} onChange={e=>patch({adult_attestation:e.target.checked})}/><span>{ADULT_ATTESTATION}</span></label>
    <div aria-hidden="true" className="hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>patch({website:e.target.value})}/></label></div>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    <button disabled={busy} className="w-full rounded-full bg-[#702b3c] px-6 py-3 font-semibold text-white disabled:opacity-50">{busy?'Submitting…':'Submit enrollment'}</button>
   </fieldset>
  </form>}
 </div></main>;
}

export function CommunicationPreferences(){
 const [value]=useState(()=>window.location.hash.slice(1));const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const withdraw=async(channel:'email'|'sms')=>{setBusy(true);setError('');setMessage('');try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'withdraw',token:value,channel})});const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage(`${channel==='email'?'Email':'SMS'} consent has been withdrawn. Your enrollment is unchanged.`);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <main className="mx-auto max-w-2xl px-5 py-16"><h1 className="font-serif text-3xl">Communication preferences</h1><p className="mt-4">Withdraw permission for ongoing Nrityangan Kathak Studio messages. This does not cancel enrollment. To change your contact details or opt in again, contact the studio at (425) 785-5217.</p>{/^[0-9a-f]{64}$/.test(value)?<div className="mt-6 flex flex-wrap gap-3">{(['email','sms'] as const).map(channel=><button key={channel} disabled={busy} onClick={()=>withdraw(channel)} className="rounded-xl border border-rose-700 px-5 py-3 font-semibold text-rose-800 disabled:opacity-50">Stop {channel==='email'?'email':'SMS'} messages</button>)}</div>:<p className="mt-6">Open the private link saved after enrollment, or call the studio for help.</p>}{message&&<p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4">{message}</p>}{error&&<p role="alert" className="mt-5 text-red-700">{error}</p>}</main>;
}

export function EnrollmentNotice({terms=false}:{terms?:boolean}){
 return <main className="mx-auto max-w-3xl space-y-5 px-5 py-16 text-stone-700"><h1 className="font-serif text-4xl text-stone-900">{terms?'Communication terms':'Enrollment privacy notice'}</h1><p>Nrityangan Kathak Studio · Effective September 25, 2026</p>{terms?<>
  <p>Optional email and SMS communications cover class reminders, schedule changes, enrollment and studio activities. Message frequency varies. Message and data rates may apply to SMS. Consent is not a condition of enrollment or purchase.</p>
  <p>Use the private preferences link shown after enrollment or call (425) 785-5217 to withdraw consent or get help. When SMS messaging begins, you may also reply STOP to opt out or HELP for help. Email messages must include an unsubscribe option. Carriers are not liable for delayed or undelivered messages.</p>
  <p>Submitting the form records your choices; it does not confirm class placement or start an automated messaging service. The studio reviews enrollment requests. Only an adult student or a parent/legal guardian may submit the form, using contact details they are authorized to provide.</p>
  <a href="/enrollment-privacy" className="inline-block underline">Read the enrollment privacy notice</a>
 </>:<>
  <p>This form collects the student’s name, adult contact’s name and relationship, email, optional phone number, preferred class, academic year, notes and communication choices. The studio uses these details to review enrollment, maintain student records, respond to your request and manage communications you choose.</p>
  <p>We retain a history of messaging choices and withdrawals, including the disclosure text and version, submission time, source page, submitter information, browser information and a hashed network identifier. These records document consent and help prevent abuse. Contact ownership is not automatically verified by this form.</p>
  <p>Enrollment contact details and consent records are restricted to authorized studio administrators and service providers that support storage and communications. Mobile numbers and SMS consent are not sold or shared with third parties or affiliates for marketing or promotional purposes. These details are not added to the public recital agenda.</p>
  <p>Consent history is retained for audit and recordkeeping after withdrawal; withdrawal stops permission for future messages rather than deleting the original record. To request access, a correction, deletion, or help with communication choices, call (425) 785-5217. Recordkeeping obligations may affect deletion requests.</p>
  <p>Parents/legal guardians should provide their own contact information for children. Do not submit medical, financial or other sensitive information in the notes field.</p>
 </>}<a href="/enroll" className="block font-semibold text-rose-800 underline">Back to enrollment</a></main>;
}
