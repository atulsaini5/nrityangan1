export type GuestProfile={id?:string;version?:number;display_name:string;role:'guest'|'instructor';status:'active'|'inactive';contact_name:string;email:string;phone:string;bio:string;photo_path?:string;photo_url?:string;updated_at?:string};
export const emptyGuest=():GuestProfile=>({display_name:'',role:'guest',status:'active',contact_name:'',email:'',phone:'',bio:''});
export function validateGuest(value:unknown,invited=false):GuestProfile{
 const p=value as GuestProfile;
 if(!p||typeof p!=='object')throw Error('Enter the guest profile details.');
 for(const [key,max] of Object.entries({display_name:160,contact_name:160,email:254,phone:50,bio:2000}))if(typeof p[key as keyof GuestProfile]!=='string'||String(p[key as keyof GuestProfile]).length>max)throw Error('Check the name, contact details and short bio.');
 if(!p.display_name.trim())throw Error('Enter your name.');
 if((invited||p.email)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))throw Error('Enter a valid contact email.');
 if(p.phone&&!/^\+?[0-9 ()-]{7,30}$/.test(p.phone))throw Error('Enter a phone number with country code.');
 if(invited&&(!p.phone.trim()||!p.bio.trim()))throw Error('Add your phone number and short bio.');
 if(!['guest','instructor'].includes(p.role)||!['active','inactive'].includes(p.status))throw Error('Invalid profile type or status.');
 if(p.id&&(!/^[0-9a-f-]{36}$/i.test(p.id)||!Number.isInteger(p.version)))throw Error('Reload the profile before saving.');
 return {id:p.id,version:p.version,display_name:p.display_name.trim(),role:p.role,status:p.status,contact_name:p.contact_name.trim(),email:p.email.trim().toLowerCase(),phone:p.phone.trim(),bio:p.bio.trim()};
}
