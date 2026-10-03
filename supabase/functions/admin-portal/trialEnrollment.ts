type Dependencies={client:()=>any;credentials:()=>{accountSid:string;authToken:string}|undefined;send?:typeof fetch};
export function createTrialEnrollmentSender({client,credentials,send=fetch}:Dependencies){
 return async(id:unknown)=>{
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {status:400,body:{error:'Invalid trial request'}};
  const auth=credentials();if(!auth)return {status:503,body:{error:'Email service is not configured.'}};
  const db=client();
  // Claim before contacting the provider. Never automatically retry an ambiguous delivery.
  const claim=await db.from('trial_class_requests').update({enrollment_invitation_status:'sending'}).eq('id',id).in('enrollment_invitation_status',['not_sent','failed']).select('id,email,student_name,contact_name').maybeSingle();
  if(claim.error)throw Error('Unable to claim invitation');
  if(!claim.data)return {status:409,body:{error:'This invitation has already been sent or needs delivery review. Refresh the requests.'}};
  const trial=claim.data;
  let outcome='unknown';
  try{
   const message=`Hello ${trial.contact_name},\n\nThank you for your interest in Nrityangan Kathak Studio. Please complete our enrollment form for ${trial.student_name}:\n\nhttps://www.kathakseattle.com/enroll\n\nAn adult student or parent/legal guardian should complete one form per student. You can select your preferred class and communication choices on the form. We will confirm the class placement after reviewing it.\n\nQuestions? Call (425) 785-5217.\n\nNrityangan Kathak Studio`;
   const response=await send('https://comms.twilio.com/v1/Emails',{method:'POST',headers:{Authorization:`Basic ${btoa(`${auth.accountSid}:${auth.authToken}`)}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(12000),body:JSON.stringify({from:{address:'support@teamevents.ai',name:'Nrityangan Kathak Studio'},to:[{address:trial.email,variables:{invitation:message}}],content:{subject:'Nrityangan — your student enrollment form',html:'<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">{{ invitation | escape }}</pre>',text:'{{ invitation }}'}})});
   outcome=response.status===202?'accepted':response.status>=400&&response.status<500?'failed':'unknown';
  }catch{/* Keep uncertain sends blocked to prevent duplicate delivery. */}
  const saved=await db.from('trial_class_requests').update({enrollment_invitation_status:outcome,enrollment_invitation_sent_at:outcome==='accepted'?new Date().toISOString():null}).eq('id',id).eq('enrollment_invitation_status','sending');
  if(saved.error) return {status:503,body:{error:'Delivery status could not be saved. Check the email provider before retrying.'}};
  return outcome==='accepted'?{status:200,body:{success:true,message:'Enrollment email accepted for delivery.'}}:{status:502,body:{error:outcome==='failed'?'The email provider rejected the invitation. You may retry after correcting the issue.':'Delivery is uncertain. Check the email provider before retrying.'}};
 };
}
