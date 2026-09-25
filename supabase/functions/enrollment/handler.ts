import { ADULT_ATTESTATION, EMAIL_CONSENT, SMS_CONSENT, validateEnrollment } from '../../../lib/enrollmentModel.ts';
type Dependencies = { client: () => any; allowedOrigins: string[]; notify?: () => Promise<unknown>; adminKey?: () => string | undefined };
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export function createEnrollmentHandler(deps: Dependencies) {
 return async(request:Request)=>{
  const origin=request.headers.get('origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin&&deps.allowedOrigins.includes(origin)?origin:deps.allowedOrigins[0]||'https://www.kathakseattle.com','Access-Control-Allow-Headers':'content-type, x-admin-key','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
  const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
  if(origin&&!deps.allowedOrigins.includes(origin))return reply({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  try{
   const reader=request.body?.getReader();if(!reader)return reply({error:'Empty request'},400);
   let raw='',bytes=0;const decoder=new TextDecoder();
   while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>14000){await reader.cancel();return reply({error:'Request too large'},413);}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();
   let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request'},400);}
   if(!body||typeof body!=='object')return reply({error:'Invalid request'},400);
   if(body.action==='retry_notifications'){
    const key=deps.adminKey?.();
    if(!key||request.headers.get('x-admin-key')!==key)return reply({error:'Unauthorized'},401);
    if(!deps.notify)return reply({error:'Notifications unavailable'},503);
    return reply(await deps.notify());
   }
   if(body.action==='submit'){
    let form;try{form=validateEnrollment(body.enrollment);}catch(e){return reply({error:(e as Error).message},400);}
    if(form.website)return reply({error:'Unable to submit this form'},400);
    const {preference_token,website,...data}=form;
    const payload={...data,token_hash:await hash(preference_token),fingerprint:await hash(JSON.stringify(data)),email_hash:await hash(form.email),network_hash:await hash(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'),
     adult_attestation_text:ADULT_ATTESTATION,email_disclosure:EMAIL_CONSENT,sms_disclosure:SMS_CONSENT,source_url:'https://www.kathakseattle.com/enroll',user_agent:(request.headers.get('user-agent')||'').slice(0,500)};
    const {data:id,error}=await deps.client().rpc('submit_enrollment',{payload});
    if(error?.code==='P0429')return reply({error:'Too many submissions. Please try again in an hour or call the studio.'},429);
    if(error?.code==='40001')return reply({error:'This submission has changed. Start a new form before submitting again.'},409);
    if(error?.code==='23503')return reply({error:'The selected class is no longer available. Reload the form.'},400);
    if(error)throw error;
    // The enrollment and its outbox are committed before email is attempted.
    // Preserve successful intake even during a provider or worker outage.
    try{await deps.notify?.();}catch{console.error('enrollment notification dispatch failed');}
    return reply({success:true,reference:id},201);
   }
   if(body.action==='withdraw'){
    if(typeof body.token!=='string'||!/^[0-9a-f]{64}$/.test(body.token)||!['email','sms'].includes(body.channel))return reply({error:'Invalid preferences link or channel'},400);
    const db=deps.client();const lookup=await db.from('enrollment_requests').select('id').eq('token_hash',await hash(body.token)).maybeSingle();
    if(lookup.error)throw lookup.error;if(!lookup.data)return reply({error:'Preferences link not found. Call the studio for help.'},404);
    const {error}=await db.rpc('withdraw_enrollment_consent',{request_id:lookup.data.id,requested_channel:body.channel,event_source:'private_preferences'});if(error)throw error;
    return reply({success:true});
   }
   return reply({error:'Unknown action'},400);
  }catch{return reply({error:'Unable to save your request. Please try again.'},500);}
 };
}
