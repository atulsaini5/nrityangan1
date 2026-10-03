create table public.class_locations (
 id text primary key default gen_random_uuid()::text,
 name text not null check(length(trim(name)) between 1 and 200),
 address text not null check(length(trim(address)) between 1 and 500), version integer not null default 1
);
alter table public.class_locations enable row level security;
revoke all on public.class_locations from anon,authenticated;
grant all on public.class_locations to service_role;
insert into public.class_locations(id,name,address) values
 ('loc1','Samena Club','15231 Lake Hills Blvd, Bellevue, WA 98007'),
 ('loc2','SaiBaba Temple','16126 NE 87th St, Redmond, WA 98052'),
 ('loc3','Sri Balaji Temple','12501 Bel-Red Rd, Bellevue, WA 98005');
alter table public.class_sessions
 add column location_id text references public.class_locations(id),
 add column day_of_week text check(day_of_week in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
 add column start_time text check(start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 add column duration_minutes integer check(duration_minutes between 1 and 480),
 add column curriculum text not null default '',
 add column published boolean not null default false,
 add column version integer not null default 1;
create index class_sessions_location_idx on public.class_sessions(location_id);
-- Preserve existing IDs and schedule text. Only recognized complete schedules are published.
update public.class_sessions c set location_id=l.id,
 day_of_week=split_part(c.schedule,' ',1),start_time=split_part(c.schedule,' ',2),
 duration_minutes=substring(c.schedule from '\(([0-9]+) min\)')::integer,published=true
 from public.class_locations l where c.location=l.name
 and c.schedule ~ '^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) ([01][0-9]|2[0-3]):[0-5][0-9] \([0-9]+ min\)$';
alter table public.class_sessions add constraint published_class_complete check(not published or (location_id is not null and day_of_week is not null and start_time is not null and duration_minutes is not null));

create function public.save_class_location(payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare target text:=nullif(payload->>'id',''); result class_locations;
begin
 if target is null then
  insert into class_locations(name,address) values(trim(payload->>'name'),trim(payload->>'address')) returning * into result;
 else
  update class_locations set name=trim(payload->>'name'),address=trim(payload->>'address'),version=version+1
  where id=target and version=(payload->>'version')::integer returning * into result;
  if not found then raise exception 'Location changed; reload' using errcode='40001'; end if;
  update class_sessions set location=result.name,version=version+1 where location_id=target;
 end if;
 return to_jsonb(result);
end; $$;
create function public.save_class_session(payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare target text:=nullif(payload->>'id',''); result class_sessions; location_name text; timing text;
begin
 select name into location_name from class_locations where id=payload->>'location_id' for share;
 if not found then raise exception 'Location not found' using errcode='23503'; end if;
 timing:=(payload->>'day_of_week')||' '||(payload->>'start_time')||' ('||(payload->>'duration_minutes')||' min)';
 if target is null then
  target:=gen_random_uuid()::text;
  insert into class_sessions(id,name,location,schedule,instructor,level,age_group) values(target,trim(payload->>'name'),location_name,timing,trim(payload->>'instructor'),trim(payload->>'level'),trim(payload->>'age_group'));
 else
  perform 1 from class_sessions where id=target and version=(payload->>'version')::integer for update;
  if not found then raise exception 'Class changed; reload' using errcode='40001'; end if;
 end if;
 update class_sessions set name=trim(payload->>'name'),location=location_name,location_id=payload->>'location_id',schedule=timing,
 instructor=trim(payload->>'instructor'),level=trim(payload->>'level'),age_group=trim(payload->>'age_group'),
 day_of_week=payload->>'day_of_week',start_time=payload->>'start_time',duration_minutes=(payload->>'duration_minutes')::integer,
 curriculum=coalesce(payload->>'curriculum',''),published=(payload->>'published')::boolean,version=version+1 where id=target returning * into result;
 return to_jsonb(result);
end; $$;

create function public.assign_student_class(target_student uuid, target_class text, target_year text, expected_version integer, source_class text default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare current_student students;
begin
 if target_year !~ '^20[0-9]{2}-[0-9]{2}$' or right(target_year,2)::integer<>(left(target_year,4)::integer+1)%100 then raise exception 'Invalid academic year' using errcode='22023'; end if;
 select * into current_student from students where id=target_student and kind='student' for update;
 if not found then raise exception 'Student not found' using errcode='P0002'; end if;
 if current_student.version is distinct from expected_version then raise exception 'Student changed; reload' using errcode='40001'; end if;
 perform 1 from class_sessions where id=target_class and published for share;
 if not found then raise exception 'Choose a published class' using errcode='22023'; end if;
 insert into student_changes(student_id,previous_record) values(target_student,student_detail(target_student));
 if source_class is not null then
  delete from student_enrollments where student_id=target_student and class_id=source_class and academic_year=target_year;
  if not found then raise exception 'Assignment changed; reload' using errcode='40001'; end if;
 end if;
 insert into student_enrollments(student_id,class_id,academic_year) values(target_student,target_class,target_year) on conflict do nothing;
 update students set version=version+1,updated_at=now() where id=target_student;
 return student_detail(target_student);
end; $$;

-- Keep existing clients compatible. The new RPC chooses the final placement atomically.
create function public.review_enrollment_class(request_id uuid,target_student uuid,outcome text,expected_version integer,selected_class text) returns uuid language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from enrollment_requests where id=request_id and status='pending' for update;
 if not found then raise exception 'Request changed; reload' using errcode='40001'; end if;
 if outcome='approved' then
  perform 1 from class_sessions where id=selected_class and published for share;
  if not found then raise exception 'Choose a published class' using errcode='22023'; end if;
  update enrollment_requests set class_id=selected_class where id=request_id;
 end if;
 return review_enrollment(request_id,target_student,outcome,expected_version);
end; $$;

-- Reject withdrawn/draft class choices even when submitted from an old browser tab.
alter function public.submit_enrollment(jsonb) rename to submit_enrollment_before_classes;
create function public.submit_enrollment(payload jsonb) returns uuid language plpgsql security invoker set search_path=public as $$
begin
 if nullif(payload->>'class_id','') is not null and not exists(select 1 from enrollment_requests where request_key=(payload->>'request_key')::uuid) then
  perform 1 from class_sessions where id=payload->>'class_id' and published for share;
  if not found then raise exception 'Class unavailable' using errcode='23503'; end if;
 end if;
 return submit_enrollment_before_classes(payload);
end; $$;
revoke all on function public.save_class_location(jsonb),public.save_class_session(jsonb),public.assign_student_class(uuid,text,text,integer,text),public.review_enrollment_class(uuid,uuid,text,integer,text),public.submit_enrollment(jsonb) from public,anon,authenticated;
grant execute on function public.save_class_location(jsonb),public.save_class_session(jsonb),public.assign_student_class(uuid,text,text,integer,text),public.review_enrollment_class(uuid,uuid,text,integer,text),public.submit_enrollment(jsonb) to service_role;

alter table public.trial_class_requests add column enrollment_invitation_status text not null default 'not_sent' check(enrollment_invitation_status in ('not_sent','sending','accepted','failed','unknown')),add column enrollment_invitation_sent_at timestamptz;
