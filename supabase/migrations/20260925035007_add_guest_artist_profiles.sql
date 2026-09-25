-- Guest profiles share the existing performer identity UUID so historical
-- recital links remain intact. Student APIs expose only kind='student'.
create table public.guest_artists (
 id uuid primary key references public.students(id),
 role text not null default 'guest' check(role in ('guest','instructor')),
 contact_name text not null default '',email text not null default '',phone text not null default '',
 bio text not null default '' check(length(bio)<=2000),photo_path text not null default '',
 version integer not null default 1,updated_at timestamptz not null default now()
);
insert into public.guest_artists(id,role,contact_name,email,phone)
 select id,kind,contact_name,contact_email,contact_phone from public.students where kind in ('guest','instructor');
create table public.guest_profile_changes (
 id uuid primary key default gen_random_uuid(),guest_id uuid not null references public.guest_artists(id),
 changed_at timestamptz not null default now(),source text not null,previous_record jsonb not null
);
create index guest_profile_changes_guest_idx on public.guest_profile_changes(guest_id);
create table public.guest_invitations (
 id uuid primary key default gen_random_uuid(),guest_id uuid not null references public.guest_artists(id),
 token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days',used_at timestamptz,revoked_at timestamptz
);
create index guest_invitations_guest_idx on public.guest_invitations(guest_id);
do $$ declare t text; begin
 foreach t in array array['guest_artists','guest_profile_changes','guest_invitations'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;
end $$;

create function public.guest_profile(target uuid) returns jsonb language sql stable security invoker set search_path=public as $$
 select to_jsonb(g)||jsonb_build_object('display_name',s.display_name,'status',s.status)
 from guest_artists g join students s on s.id=g.id where g.id=target;
$$;
create function public.guest_directory(page_offset integer default 0) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(row) order by row.display_name,row.id),'[]') from (
  select g.id,g.role,g.version,s.display_name,s.status,g.updated_at from guest_artists g join students s on s.id=g.id
  order by s.display_name,g.id limit 500 offset greatest(page_offset,0)
 ) row;
$$;
create function public.save_guest_profile(payload jsonb,change_source text default 'admin') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare target uuid; old guest_artists; begin
 if length(trim(coalesce(payload->>'display_name',''))) not between 1 and 160
  or coalesce(payload->>'role','') not in ('guest','instructor') or coalesce(payload->>'status','') not in ('active','inactive')
  or length(coalesce(payload->>'bio',''))>2000 then raise exception 'Invalid guest profile'; end if;
 if nullif(payload->>'id','') is null then
  insert into students(display_name,kind,status) values(trim(payload->>'display_name'),payload->>'role',payload->>'status') returning id into target;
  insert into guest_artists(id,role) values(target,payload->>'role');
 else
  target:=(payload->>'id')::uuid;
  select * into old from guest_artists where id=target for update;
  if not found then raise exception 'Guest not found' using errcode='P0002'; end if;
  if old.version is distinct from (payload->>'version')::integer then raise exception 'Guest changed; reload' using errcode='40001'; end if;
  insert into guest_profile_changes(guest_id,source,previous_record) values(target,change_source,guest_profile(target));
 end if;
 update guest_artists set role=payload->>'role',contact_name=coalesce(payload->>'contact_name',''),email=coalesce(payload->>'email',''),
 phone=coalesce(payload->>'phone',''),bio=coalesce(payload->>'bio',''),photo_path=coalesce(payload->>'photo_path',photo_path),version=version+1,updated_at=now() where id=target;
 update students set display_name=trim(payload->>'display_name'),kind=payload->>'role',status=payload->>'status',version=version+1,updated_at=now() where id=target;
 return guest_profile(target);
end; $$;
create function public.issue_guest_invitation(target uuid,secret_hash text) returns jsonb language plpgsql security invoker set search_path=public as $$
declare invite guest_invitations; begin
 perform 1 from guest_artists where id=target for update;
 if not found then raise exception 'Guest not found' using errcode='P0002'; end if;
 update guest_invitations set revoked_at=now() where guest_id=target and used_at is null and revoked_at is null;
 insert into guest_invitations(guest_id,token_hash) values(target,secret_hash) returning * into invite;
 return jsonb_build_object('id',invite.id,'expires_at',invite.expires_at);
end; $$;
create function public.read_guest_invitation(secret_hash text) returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object('profile',guest_profile(i.guest_id),'expires_at',i.expires_at) from guest_invitations i
 where i.token_hash=secret_hash and i.used_at is null and i.revoked_at is null and i.expires_at>now();
$$;
create function public.submit_guest_invitation(secret_hash text,payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare invite guest_invitations; current_profile jsonb; result jsonb; begin
 select * into invite from guest_invitations where token_hash=secret_hash for update;
 if not found or invite.used_at is not null or invite.revoked_at is not null or invite.expires_at<=now() then raise exception 'Invitation expired or used' using errcode='P0002'; end if;
 current_profile:=guest_profile(invite.guest_id);
 result:=save_guest_profile(payload||jsonb_build_object('id',invite.guest_id,'role',current_profile->>'role','status',current_profile->>'status'),'invitation');
 update guest_invitations set used_at=now() where id=invite.id;
 return jsonb_build_object('success',true);
end; $$;
create function public.revoke_guest_invitations(target uuid) returns void language sql security invoker set search_path=public as $$
 update guest_invitations set revoked_at=now() where guest_id=target and used_at is null and revoked_at is null;
$$;

-- Exclude guest/instructor identities before pagination, not only in the UI.
create or replace function public.student_directory(page_offset integer default 0) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(row) order by row.display_name,row.id),'[]') from (
  select s.id,s.version,s.display_name,s.current_level,s.status,s.kind,s.needs_review,s.aliases,
   array(select distinct e.class_id from student_enrollments e where e.student_id=s.id) class_ids,
   array(select distinct e.academic_year from student_enrollments e where e.student_id=s.id) academic_years,
   coalesce((select jsonb_agg(jsonb_build_object('class_id',e.class_id,'academic_year',e.academic_year)) from student_enrollments e where e.student_id=s.id),'[]') assignments,
   array(select distinct sec.recital_year from recital_participants rp join recital_performances p on p.id=rp.performance_id join recital_sections sec on sec.id=p.section_id where rp.student_id=s.id) recital_years
  from students s where s.kind='student' order by s.display_name,s.id limit 500 offset greatest(page_offset,0)
 ) row;
$$;
create or replace function public.save_student(payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb; target uuid; begin
 if payload->>'kind' is distinct from 'student' then raise exception 'Use Guest Artists to edit this profile'; end if;
 if nullif(payload->>'id','') is not null then
  perform 1 from students where id=(payload->>'id')::uuid and kind='student' for update;
  if not found then raise exception 'Student not found' using errcode='P0002'; end if;
 end if;
 result:=save_student_core(payload); target:=(result->>'id')::uuid;
 update students set contact_name=coalesce(payload->>'contact_name',contact_name),contact_email=coalesce(payload->>'contact_email',contact_email),contact_phone=coalesce(payload->>'contact_phone',contact_phone),contact_relationship=coalesce(payload->>'contact_relationship',contact_relationship) where id=target;
 return student_detail(target);
end; $$;
revoke all on function public.guest_profile(uuid),public.guest_directory(integer),public.save_guest_profile(jsonb,text),public.issue_guest_invitation(uuid,text),public.read_guest_invitation(text),public.submit_guest_invitation(text,jsonb),public.revoke_guest_invitations(uuid) from public,anon,authenticated;
grant execute on function public.guest_profile(uuid),public.guest_directory(integer),public.save_guest_profile(jsonb,text),public.issue_guest_invitation(uuid,text),public.read_guest_invitation(text),public.submit_guest_invitation(text,jsonb),public.revoke_guest_invitations(uuid) to service_role;

-- Private photos; restrict this bucket even if older broad storage policies exist.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('guest-artist-photos','guest-artist-photos',false,1048576,array['image/webp']);
create policy guest_photos_private on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'guest-artist-photos') with check(bucket_id<>'guest-artist-photos');
