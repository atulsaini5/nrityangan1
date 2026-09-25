type Dependencies = {
 client:()=>any;
 allowedOrigins:string[];
 credentials:()=>{accountSid:string;authToken:string}|undefined;
 send?:typeof fetch;
};
const recipients=['at@teamevents.ai','tumam_b@yahoo.com'];

export function createTrialClassHandler({client,allowedOrigins,credentials,send=fetch}:Dependencies) {
 return async(request:Request)=>{
  const origin=request.headers.get('origin');
  const headers={'Access-Control-Allow-Origin':origin&&allowedOrigins.includes(origin)?origin:allowedOrigins[0]||'https://www.kathakseattle.com',
   'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS',Vary:'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
  const reply=(body:unknown,status:number)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowedOrigins.includes(origin))return reply({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  try{
   const reader=request.body?.getReader();if(!reader)return reply({error:'Request required'},400);
   let raw='',size=0;const decoder=new TextDecoder();
   while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>12000){await reader.cancel();return reply({error:'Request too large'},413);}raw+=decoder.decode(part.value,{stream:true});}
   raw+=decoder.decode();let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request'},400);}
   if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Invalid request'},400);
   const required=['contact_name','student_name','email','phone','class_interest','location_interest'];
   const missing=required.find(field=>typeof body[field]!=='string'||!body[field].trim());
   if(missing)return reply({error:`Missing required field: ${missing}`},400);
   const email=body.email.trim().toLowerCase();
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'Please provide a valid email address.'},400);
   const submission={contact_name:body.contact_name.trim().slice(0,150),student_name:body.student_name.trim().slice(0,150),email,
    phone:body.phone.trim().slice(0,50),student_age:Number.isFinite(body.student_age)?body.student_age:null,
    class_interest:body.class_interest.trim().slice(0,200),location_interest:body.location_interest.trim().slice(0,200),
    notes:typeof body.notes==='string'?body.notes.trim().slice(0,1000)||null:null};
   const db=client();
   const {data,error}=await db.from('trial_class_requests').insert(submission).select('id').single();
   if(error)throw Error('Request save failed');
   const auth=credentials();
   const message=`New trial class request\n\nContact: ${submission.contact_name}\nStudent: ${submission.student_name}\nEmail: ${submission.email}\nPhone: ${submission.phone}\nAge: ${submission.student_age??'Not provided'}\nClass: ${submission.class_interest}\nLocation: ${submission.location_interest}\nNotes: ${submission.notes??'None'}\n\nRequest ID: ${data.id}\nReview: https://www.kathakseattle.com/admin`;
   const results=await Promise.all(recipients.map(async address=>{
    if(!auth)return `${address}: Twilio credentials unavailable`;
    try{
     const response=await send('https://comms.twilio.com/v1/Emails',{
      method:'POST',headers:{Authorization:`Basic ${btoa(`${auth.accountSid}:${auth.authToken}`)}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(12000),
      body:JSON.stringify({from:{address:'support@teamevents.ai',name:'Nrityangan Kathak Studio'},to:[{address,variables:{trial:message}}],
       content:{subject:'Nrityangan — new trial class request',
        html:'<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">{{ trial | default: \'Review the trial request in admin.\' | escape }}</pre>',
        text:'{{ trial | default: \'Review the trial request in admin.\' }}'}})
     });
     return response.status===202?null:`${address}: Twilio HTTP ${response.status}`;
    }catch{return `${address}: Twilio delivery unconfirmed`;}
   }));
   const failures=results.filter(Boolean);
   // Preserve the successful request even when a recipient or provider fails.
   try{
    const tracked=await db.from('trial_class_requests').update({notification_sent:failures.length===0,notification_error:failures.length?failures.join('; '):null}).eq('id',data.id);
    if(tracked.error)console.error('trial-class notification status save failed',data.id);
   }catch{console.error('trial-class notification status save failed',data.id);}
   return reply({success:true,id:data.id},201);
  }catch{
   console.error('trial-class request save failed');
   return reply({error:'Unable to submit the trial class request.'},500);
  }
 };
}
