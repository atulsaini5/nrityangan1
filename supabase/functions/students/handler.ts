import { validateStudent } from '../../../lib/studentModel.ts';
type Dependencies = { client: () => any; adminKey: () => string; allowedOrigins: string[] };
export function createStudentHandler(deps: Dependencies) {
 return async (request: Request) => {
  const origin = request.headers.get('origin');
  const headers = { 'Access-Control-Allow-Origin': origin && deps.allowedOrigins.includes(origin) ? origin : deps.allowedOrigins[0] || 'https://www.kathakseattle.com', 'Access-Control-Allow-Headers': 'content-type, x-admin-key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
  const reply = (body: unknown,status=200) => new Response(JSON.stringify(body),{status,headers});
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
  if (request.method==='GET') {
   const year = new URL(request.url).searchParams.get('year');
   if (!year || !/^20\d{2}$/.test(year)) return reply({error:'Invalid recital year'},400);
   try {
    const {data,error} = await deps.client().rpc('recital_agenda',{target_year:year});
    return error ? reply({error:'Agenda unavailable'},500) : data ? reply({agenda:data}) : reply({error:'Agenda not published'},404);
   } catch {return reply({error:'Agenda unavailable'},500);}
  }
  if (request.method!=='POST') return reply({error:'Method not allowed'},405);
  const configured=deps.adminKey(), supplied=request.headers.get('x-admin-key') || '';
  let difference=configured.length ^ supplied.length;
  for(let i=0;i<configured.length;i++) difference |= configured.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0);
  if (!configured || difference) return reply({error:'Invalid access code'},401);
  try {
   const raw=await request.text();
   if(raw.length>65000) return reply({error:'Request too large'},413);
   let body;
   try {body=JSON.parse(raw);} catch {return reply({error:'Invalid request'},400);}
   if (!body || typeof body!=='object') return reply({error:'Invalid request'},400);
   const db=deps.client();
   if(body.action==='list') {
    const offset=Number.isInteger(body.offset) && body.offset>=0 ? body.offset : 0;
    const [students,classes]=await Promise.all([db.rpc('student_directory',{page_offset:offset}),db.from('class_sessions').select('*').order('name').order('schedule')]);
    if(students.error || classes.error) throw new Error('Database read failed');
    return reply({students:students.data,classes:classes.data});
   }
   if(body.action==='detail') {
    if(typeof body.id!=='string' || !/^[0-9a-f-]{36}$/i.test(body.id)) return reply({error:'Invalid student'},400);
    const {data,error}=await db.rpc('student_detail',{target:body.id});
    if(error) throw error;
    return data?.kind==='student' ? reply({student:data}) : reply({error:'Student not found'},404);
   }
   if(body.action==='enrollments') {
    const offset=Number.isInteger(body.offset)&&body.offset>=0?body.offset:0;
    const {data,error}=await db.from('enrollment_requests').select('id,created_at,student_name,contact_name,relationship,email,phone,class_id,academic_year,notes,status,student_id,reviewed_at,consent_version,adult_attestation_text,source_url,communication_consent_events(*)').eq('status','pending').order('created_at',{ascending:false}).order('id').range(offset,offset+499);
    if(error)throw error;return reply({requests:data});
   }
   if(body.action==='review_enrollment'||body.action==='withdraw_consent') {
    if(typeof body.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))return reply({error:'Invalid enrollment request'},400);
    let result;
    if(body.action==='review_enrollment') {
     if(!['approved','declined'].includes(body.outcome)||(body.student_id!=null&&(typeof body.student_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.student_id)||!Number.isInteger(body.version))))return reply({error:'Select a student and review action'},400);
     result=await db.rpc('review_enrollment',{request_id:body.id,target_student:body.student_id||null,outcome:body.outcome,expected_version:body.version||null});
    } else {
     if(!['email','sms'].includes(body.channel))return reply({error:'Invalid channel'},400);
     result=await db.rpc('withdraw_enrollment_consent',{request_id:body.id,requested_channel:body.channel,event_source:'admin_withdrawal'});
    }
    if(result.error?.code==='40001')return reply({error:'The request or student changed. Refresh before reviewing.'},409);
    if(result.error)throw result.error;return reply({success:true,student_id:result.data});
   }
   if(body.action==='save') {
    if(body.student?.kind!=='student')return reply({error:'Manage guest artists and instructors in Guest Artists.'},400);
    try {validateStudent(body.student);} catch(e) {return reply({error:(e as Error).message},400);}
    const {data,error}=await db.rpc('save_student',{payload:body.student});
    if(error?.code==='40001') return reply({error:'Another edit was saved. Reload this student before saving your changes.'},409);
    if(error?.code==='P0002') return reply({error:'Student not found'},404);
    if(error?.code==='23503') return reply({error:'A selected class no longer exists. Reload and try again.'},400);
    if(error) throw error;
    return reply({student:data});
   }
   return reply({error:'Unknown action'},400);
  } catch {return reply({error:'Unable to complete the student request. Please try again.'},500);}
 };
}
