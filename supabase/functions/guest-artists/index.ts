import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {createGuestHandler} from './handler.ts';
Deno.serve(createGuestHandler({client:()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),adminKey:()=>Deno.env.get('TUMAM_ADMIN_KEY')||'',allowedOrigins:(Deno.env.get('ALLOWED_ORIGINS')||'https://www.kathakseattle.com,https://kathakseattle.com').split(',').map(s=>s.trim()).filter(Boolean)}));
