type Dependencies = {
 client: () => any;
 credentials: () => { accountSid: string; authToken: string } | undefined;
 send?: typeof fetch;
};

export function createEnrollmentNotifier({client,credentials,send=fetch}: Dependencies) {
 return async (reference: string | null = null) => {
  const auth=credentials();
  if(!auth) throw new Error('Notification credentials unavailable');
  const db=client();
  const {data:jobs,error}=await db.rpc('claim_enrollment_notifications',{target:reference});
  if(error) throw new Error('Unable to claim notifications');
  await Promise.all(jobs.map(async(job: {id:string;recipient:string;reference:string;student_name:string;academic_year:string;created_at:string})=>{
   let outcome='unknown',status:number|null=null;
   const message=`A new student enrollment has been submitted to Nrityangan Kathak Studio.\n\nStudent: ${job.student_name}\nAcademic year: ${job.academic_year}\nSubmitted: ${job.created_at}\nReference: ${job.reference}\n\nReview contact details, class preference and communication choices in Admin > Students > Enrollment requests:\nhttps://www.kathakseattle.com/admin\n\nThis is an internal enrollment notification, not a message to the enrolling family.`;
   try {
    const response=await send('https://comms.twilio.com/v1/Emails',{
     method:'POST',headers:{Authorization:`Basic ${btoa(`${auth.accountSid}:${auth.authToken}`)}`,'Content-Type':'application/json'},
     signal:AbortSignal.timeout(12000),
     body:JSON.stringify({from:{address:'support@teamevents.ai',name:'Nrityangan Kathak Studio'},
      to:[{address:job.recipient,variables:{enrollment:message}}],
      content:{subject:'Nrityangan — new student enrollment',
       html:'<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">{{ enrollment | default: \'Review the new enrollment in the admin panel.\' | escape }}</pre>',
       text:'{{ enrollment | default: \'Review the new enrollment in the admin panel.\' }}'}})
    });
    status=response.status;
    outcome=status===202?'accepted':status>=400&&status<500?'failed':'unknown';
   } catch { /* A timeout may follow provider acceptance; never blindly resend. */ }
   const completed=await db.rpc('finish_enrollment_notification',{job_id:job.id,outcome,http_status:status});
   if(completed.error || outcome!=='accepted') console.error('enrollment notification needs attention',job.id,outcome,status);
  }));
  return {processed:jobs.length};
 };
}
