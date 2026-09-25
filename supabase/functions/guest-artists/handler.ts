import {validateGuest} from '../../../lib/guestModel.ts';
type Dependencies={client:()=>any;adminKey:()=>string;allowedOrigins:string[]};
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v);
const bucketName='guest-artist-photos';
export function decodeGuestPhoto(value:unknown){
 if(typeof value!=='string'||value.length>1400000||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('Choose a valid photo.');
 let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));}catch{throw Error('Invalid photo.');}
 if(bytes.length<16||bytes.length>1048576||new TextDecoder().decode(bytes.slice(0,4))!=='RIFF'||new TextDecoder().decode(bytes.slice(8,12))!=='WEBP')throw Error('Only optimized WebP photos are accepted.');
 return bytes;
}
export function createGuestHandler(deps:Dependencies){return async(request:Request)=>{
 const origin=request.headers.get('origin');const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin&&deps.allowedOrigins.includes(origin)?origin:deps.allowedOrigins[0]||'https://www.kathakseattle.com','Access-Control-Allow-Headers':'content-type, x-admin-key','Access-Control-Allow-Methods':'POST, OPTIONS',Vary:'Origin'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!deps.allowedOrigins.includes(origin))return reply({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 let uploaded='';let db:any;
 try{
  const reader=request.body?.getReader();if(!reader)return reply({error:'Request required'},400);
  let raw='',size=0;const decoder=new TextDecoder();while(true){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>1500000){await reader.cancel();return reply({error:'Photo or request too large'},413);}raw+=decoder.decode(p.value,{stream:true});}raw+=decoder.decode();
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request'},400);}if(!body||typeof body!=='object')return reply({error:'Invalid request'},400);
  const invited=['invitation','submit_invitation'].includes(body.action);
  let tokenHash='';let existing:any;
  if(invited){
   if(typeof body.token!=='string'||!/^[0-9a-f]{64}$/.test(body.token))return reply({error:'This invitation is invalid, expired or already used. Ask the studio for a new link.'},404);
   tokenHash=await hash(body.token);db=deps.client();const r=await db.rpc('read_guest_invitation',{secret_hash:tokenHash});if(r.error)throw r.error;if(!r.data)return reply({error:'This invitation is invalid, expired or already used. Ask the studio for a new link.'},404);existing=r.data;
  }else{
   const configured=deps.adminKey(),supplied=request.headers.get('x-admin-key')||'';let difference=configured.length^supplied.length;for(let i=0;i<configured.length;i++)difference|=configured.charCodeAt(i)^(supplied.charCodeAt(i)||0);
   if(!configured||difference)return reply({error:'Invalid access code'},401);db=deps.client();
  }
  const photo=async(profile:any)=>{
   if(!profile?.photo_path)return profile;const r=await db.storage.from(bucketName).createSignedUrl(profile.photo_path,600);
   return {...profile,photo_url:r.error?'':r.data.signedUrl};
  };
  if(body.action==='invitation')return reply({...existing,profile:await photo(existing.profile)});
  if(body.action==='list'){
   const r=await db.rpc('guest_directory',{page_offset:Number.isInteger(body.offset)&&body.offset>=0?body.offset:0});if(r.error)throw r.error;return reply({guests:r.data});
  }
  if(['detail','invite','revoke'].includes(body.action)){
   if(!uuid(body.id))return reply({error:'Invalid guest'},400);
   if(body.action==='detail'){const r=await db.rpc('guest_profile',{target:body.id});if(r.error)throw r.error;return r.data?reply({profile:await photo(r.data)}):reply({error:'Guest not found'},404);}
   if(body.action==='revoke'){const r=await db.rpc('revoke_guest_invitations',{target:body.id});if(r.error)throw r.error;return reply({success:true});}
   const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');const r=await db.rpc('issue_guest_invitation',{target:body.id,secret_hash:await hash(token)});if(r.error)throw r.error;
   return reply({url:`https://www.kathakseattle.com/guest-invitation#${token}`,expires_at:r.data.expires_at});
  }
  if(body.action==='save'||body.action==='submit_invitation'){
   let profile;try{profile=validateGuest(body.profile,invited);if(invited&&body.authorized!==true)throw Error('Confirm you are authorized to provide this profile.');}catch(e){return reply({error:(e as Error).message},400);}
   // The caller cannot choose a stored path or another guest's identity.
   const payload:any={...profile};if(invited){payload.id=existing.profile.id;payload.role=existing.profile.role;payload.status=existing.profile.status;}
   if(body.remove_photo===true)payload.photo_path='';
   if(body.photo){let bytes;try{bytes=decodeGuestPhoto(body.photo);}catch(e){return reply({error:(e as Error).message},400);}
    uploaded=`${crypto.randomUUID()}/profile.webp`;const r=await db.storage.from(bucketName).upload(uploaded,bytes,{contentType:'image/webp',upsert:false});if(r.error)throw r.error;payload.photo_path=uploaded;
   }
   const r=invited?await db.rpc('submit_guest_invitation',{secret_hash:tokenHash,payload}):await db.rpc('save_guest_profile',{payload,change_source:'admin'});
   if(r.error)throw r.error;uploaded='';return invited?reply({success:true}):reply({profile:await photo(r.data)});
  }
  return reply({error:'Unknown action'},400);
 }catch(e){
  if(uploaded&&db)try{await db.storage.from(bucketName).remove([uploaded]);}catch{/* Retain private orphan for later cleanup. */}
  const code=(e as {code?:string}).code;
  if(code==='40001')return reply({error:'This profile changed. Reload before saving.'},409);
  if(code==='P0002')return reply({error:'Profile or invitation unavailable. Ask the studio for a new link.'},404);
  return reply({error:'Unable to save the guest profile. Please try again.'},500);
 }
};}
