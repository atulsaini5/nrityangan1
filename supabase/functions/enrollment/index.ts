import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createEnrollmentHandler } from './handler.ts';
import { createEnrollmentNotifier } from './notifications.ts';
const client=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const notify=createEnrollmentNotifier({client,credentials:()=>{
 const accountSid=Deno.env.get('TWILIO_ACCOUNT_SID'),authToken=Deno.env.get('TWILIO_AUTH_TOKEN');
 return accountSid&&authToken?{accountSid,authToken}:undefined;
}});
Deno.serve(createEnrollmentHandler({client,notify,adminKey:()=>Deno.env.get('TUMAM_ADMIN_KEY'),allowedOrigins:(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean)}));
