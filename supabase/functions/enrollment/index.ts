import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createEnrollmentHandler } from './handler.ts';
Deno.serve(createEnrollmentHandler({client:()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),allowedOrigins:(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean)}));
