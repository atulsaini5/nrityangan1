import {useEffect,useState} from 'react';
import {ClassSession,Location} from '../types';
import {ManagedClass,StudioLocation} from './classModel';
export function useSchedule(){
 const [classes,setClasses]=useState<ClassSession[]>([]),[locations,setLocations]=useState<Location[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{const controller=new AbortController();fetch(`${(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')}/functions/v1/students?catalogue=1`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
  setClasses(data.classes.map((c:ManagedClass)=>({id:c.id,title:c.name,instructor:c.instructor,locationId:c.location_id,dayOfWeek:c.day_of_week,startTime:c.start_time,durationMinutes:c.duration_minutes,ageGroup:c.age_group,level:c.level,curriculum:c.curriculum})));
  setLocations(data.locations.map((l:StudioLocation)=>({...l,image:''})));setLoading(false);
 }).catch(()=>{if(!controller.signal.aborted){setError('The current schedule could not be loaded. Please try again or contact the studio.');setLoading(false);}});return()=>controller.abort();},[]);
 return {classes,locations,error,loading};
}
