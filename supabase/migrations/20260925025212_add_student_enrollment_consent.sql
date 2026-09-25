alter table public.students add column contact_name text not null default '', add column contact_email text not null default '', add column contact_phone text not null default '', add column contact_relationship text not null default '';

create table public.enrollment_requests (
 id uuid primary key default gen_random_uuid(), request_key uuid not null unique,
 created_at timestamptz not null default now(), student_name text not null, contact_name text not null,
 relationship text not null check(relationship in ('self','parent_guardian')), email text not null, phone text not null default '',
 class_id text references public.class_sessions(id), academic_year text not null, notes text not null default '',
 status text not null default 'pending' check(status in ('pending','approved','declined')),
 student_id uuid references public.students(id), reviewed_at timestamptz,
 token_hash text not null unique, fingerprint text not null, consent_version text not null,
 adult_attestation_text text not null, source_url text not null, user_agent text not null default '', network_hash text not null
);
create index enrollment_requests_student_idx on public.enrollment_requests(student_id);
create index enrollment_requests_class_idx on public.enrollment_requests(class_id);
create index enrollment_requests_status_idx on public.enrollment_requests(status,created_at desc);
create table public.communication_consent_events (
 id uuid primary key default gen_random_uuid(), enrollment_id uuid not null references public.enrollment_requests(id),
 channel text not null check(channel in ('email','sms')), decision text not null check(decision in ('opted_in','not_opted_in','withdrawn')),
 destination text not null, recorded_at timestamptz not null default clock_timestamp(),
 consent_version text not null, disclosure_text text not null,
 source text not null check(source in ('enrollment_form','private_preferences','admin_withdrawal')),
 evidence jsonb not null default '{}'
);
create index communication_consent_history_idx on public.communication_consent_events(enrollment_id,channel,recorded_at desc);
create index communication_consent_destination_idx on public.communication_consent_events(channel,destination,recorded_at desc);
create table public.enrollment_rate_limits (key text primary key, window_start timestamptz not null, attempts integer not null);

create function public.preserve_consent_history() returns trigger language plpgsql set search_path=public as $$
begin raise exception 'Consent history is append-only'; end; $$;
create trigger consent_append_only before update or delete on public.communication_consent_events for each row execute function public.preserve_consent_history();

create function public.submit_enrollment(payload jsonb) returns uuid language plpgsql security invoker set search_path=public as $$
declare existing enrollment_requests; target uuid; rate_key text; attempts_used integer; channel_name text;
begin
 perform pg_advisory_xact_lock(hashtextextended(payload->>'request_key',0));
 select * into existing from enrollment_requests where request_key=(payload->>'request_key')::uuid;
 if found then
  if existing.token_hash<>payload->>'token_hash' or existing.fingerprint<>payload->>'fingerprint' then raise exception 'Submission conflict' using errcode='40001'; end if;
  return existing.id;
 end if;
 foreach rate_key in array array['network:'||(payload->>'network_hash'),'email:'||(payload->>'email_hash')] loop
  insert into enrollment_rate_limits(key,window_start,attempts) values(rate_key,now(),1)
  on conflict(key) do update set attempts=case when enrollment_rate_limits.window_start<now()-interval '1 hour' then 1 else enrollment_rate_limits.attempts+1 end,
   window_start=case when enrollment_rate_limits.window_start<now()-interval '1 hour' then now() else enrollment_rate_limits.window_start end
  returning attempts into attempts_used;
  if attempts_used>(case when rate_key like 'network:%' then 20 else 6 end) then raise exception 'Please try again later' using errcode='P0429'; end if;
 end loop;
 insert into enrollment_requests(request_key,student_name,contact_name,relationship,email,phone,class_id,academic_year,notes,token_hash,fingerprint,consent_version,adult_attestation_text,source_url,user_agent,network_hash)
 values((payload->>'request_key')::uuid,payload->>'student_name',payload->>'contact_name',payload->>'relationship',payload->>'email',payload->>'phone',nullif(payload->>'class_id',''),payload->>'academic_year',payload->>'notes',payload->>'token_hash',payload->>'fingerprint',payload->>'consent_version',payload->>'adult_attestation_text',payload->>'source_url',payload->>'user_agent',payload->>'network_hash') returning id into target;
 foreach channel_name in array array['email','sms'] loop
  insert into communication_consent_events(enrollment_id,channel,decision,destination,consent_version,disclosure_text,source,evidence)
  values(target,channel_name,case when (payload->>(channel_name||'_opt_in'))::boolean then 'opted_in' else 'not_opted_in' end,
   payload->>case when channel_name='email' then 'email' else 'phone' end,payload->>'consent_version',payload->>(channel_name||'_disclosure'),'enrollment_form',
   jsonb_build_object('submitter',payload->>'contact_name','relationship',payload->>'relationship','adult_attestation',payload->>'adult_attestation_text','source_url',payload->>'source_url','user_agent',payload->>'user_agent','network_hash',payload->>'network_hash','contact_verified',false));
 end loop;
 return target;
end; $$;

create function public.withdraw_enrollment_consent(request_id uuid, requested_channel text, event_source text) returns void language plpgsql security invoker set search_path=public as $$
declare request enrollment_requests; latest communication_consent_events;
begin
 if requested_channel not in ('email','sms') or event_source not in ('private_preferences','admin_withdrawal') then raise exception 'Invalid withdrawal'; end if;
 select * into request from enrollment_requests where id=request_id for update;
 if not found then raise exception 'Request not found' using errcode='P0002'; end if;
 select * into latest from communication_consent_events where enrollment_id=request_id and channel=requested_channel order by recorded_at desc limit 1;
 if latest.decision='withdrawn' then return; end if;
 insert into communication_consent_events(enrollment_id,channel,decision,destination,consent_version,disclosure_text,source,evidence)
 values(request_id,requested_channel,'withdrawn',latest.destination,latest.consent_version,latest.disclosure_text,event_source,jsonb_build_object('requested_action','Withdraw permission for this channel'));
end; $$;

create function public.review_enrollment(request_id uuid, target_student uuid, outcome text, expected_version integer default null) returns uuid language plpgsql security invoker set search_path=public as $$
declare request enrollment_requests; target uuid:=target_student; version_now integer;
begin
 if outcome not in ('approved','declined') then raise exception 'Invalid review'; end if;
 select * into request from enrollment_requests where id=request_id for update;
 if not found then raise exception 'Request not found' using errcode='P0002'; end if;
 if request.status<>'pending' then raise exception 'This request was already reviewed' using errcode='40001'; end if;
 if outcome='approved' then
  if target is null then
   insert into students(display_name) values(request.student_name) returning id into target;
  else
   select version into version_now from students where id=target and kind='student' for update;
   if not found then raise exception 'Student not found' using errcode='P0002'; end if;
   if version_now is distinct from expected_version then raise exception 'Student changed; reload' using errcode='40001'; end if;
   insert into student_changes(student_id,previous_record) values(target,student_detail(target));
  end if;
  update students set contact_name=request.contact_name,contact_email=request.email,contact_phone=request.phone,contact_relationship=request.relationship,version=version+1,updated_at=now() where id=target;
  if request.class_id is not null then insert into student_enrollments(student_id,class_id,academic_year) values(target,request.class_id,request.academic_year) on conflict(student_id,class_id,academic_year) do nothing; end if;
 end if;
 update enrollment_requests set status=outcome,student_id=case when outcome='approved' then target else null end,reviewed_at=now() where id=request_id;
 return target;
end; $$;

-- Preserve the proven core save logic; contact edits never create messaging consent.
alter function public.student_detail(uuid) rename to student_detail_core;
create function public.student_detail(target uuid) returns jsonb language sql stable security invoker set search_path=public as $$
 select student_detail_core(target) || jsonb_build_object('consent_events',coalesce((
  select jsonb_agg(to_jsonb(c) order by c.recorded_at desc) from communication_consent_events c join enrollment_requests e on e.id=c.enrollment_id where e.student_id=target),'[]'));
$$;
alter function public.save_student(jsonb) rename to save_student_core;
create function public.save_student(payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb; target uuid;
begin
 result:=save_student_core(payload); target:=(result->>'id')::uuid;
 update students set contact_name=coalesce(payload->>'contact_name',contact_name),contact_email=coalesce(payload->>'contact_email',contact_email),contact_phone=coalesce(payload->>'contact_phone',contact_phone),contact_relationship=coalesce(payload->>'contact_relationship',contact_relationship) where id=target;
 return student_detail(target);
end; $$;

create function public.student_directory(page_offset integer default 0) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(row) order by row.display_name,row.id),'[]') from (
  select s.id,s.version,s.display_name,s.current_level,s.status,s.kind,s.needs_review,s.aliases,
   array(select distinct e.class_id from student_enrollments e where e.student_id=s.id) class_ids,
   array(select distinct e.academic_year from student_enrollments e where e.student_id=s.id) academic_years,
   coalesce((select jsonb_agg(jsonb_build_object('class_id',e.class_id,'academic_year',e.academic_year)) from student_enrollments e where e.student_id=s.id),'[]') assignments,
   array(select distinct sec.recital_year from recital_participants rp join recital_performances p on p.id=rp.performance_id join recital_sections sec on sec.id=p.section_id where rp.student_id=s.id) recital_years
  from students s order by s.display_name,s.id limit 500 offset greatest(page_offset,0)
 ) row;
$$;

do $$ declare t text; begin
 foreach t in array array['enrollment_requests','communication_consent_events','enrollment_rate_limits'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke update,delete,truncate on public.communication_consent_events from service_role;
revoke all on function public.preserve_consent_history(),public.submit_enrollment(jsonb),public.withdraw_enrollment_consent(uuid,text,text),public.review_enrollment(uuid,uuid,text,integer),public.student_detail(uuid),public.save_student(jsonb),public.student_directory(integer) from public,anon,authenticated;
grant execute on function public.submit_enrollment(jsonb),public.withdraw_enrollment_consent(uuid,text,text),public.review_enrollment(uuid,uuid,text,integer),public.student_detail(uuid),public.save_student(jsonb),public.student_directory(integer) to service_role;
