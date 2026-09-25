import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createTrialClassHandler } from './handler.ts';
Deno.serve(createTrialClassHandler({
 client:()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),
 allowedOrigins:(Deno.env.get('ALLOWED_ORIGINS')||'https://www.kathakseattle.com,https://kathakseattle.com').split(',').map(s=>s.trim()).filter(Boolean),
 credentials:()=>{
  const accountSid=Deno.env.get('TWILIO_ACCOUNT_SID'),authToken=Deno.env.get('TWILIO_AUTH_TOKEN');
  return accountSid&&authToken?{accountSid,authToken}:undefined;
 }
}));
