export const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export type StudioLocation = {id:string;name:string;address:string;version:number};
export type ManagedClass = {id:string;name:string;location_id:string;location:string;schedule:string;instructor:string;level:string;age_group:string;day_of_week:string;start_time:string;duration_minutes:number;curriculum:string;published:boolean;version:number};
export function validateClass(c: ManagedClass) {
 if(!c || ['name','location_id','instructor','level','age_group'].some(k=>typeof (c as any)[k]!=='string'||!(c as any)[k].trim()||(c as any)[k].length>200)||!DAYS.includes(c.day_of_week)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.start_time)||!Number.isInteger(c.duration_minutes)||c.duration_minutes<1||c.duration_minutes>480||typeof c.curriculum!=='string'||c.curriculum.length>3000||typeof c.published!=='boolean') throw Error('Complete the class details with a valid day, time and duration.');
}
export function academicYear(){const d=new Date(),y=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;return `${y}-${String((y+1)%100).padStart(2,'0')}`;}
