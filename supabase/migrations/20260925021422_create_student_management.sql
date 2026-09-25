-- Private registry. Only the authenticated admin edge function uses service_role.
create table public.students (
 id uuid primary key default gen_random_uuid(), import_key text unique,
 display_name text not null check(length(trim(display_name)) between 1 and 160),
 certificate_name text not null default '', aliases text[] not null default '{}',
 current_level text not null default '', status text not null default 'active' check(status in ('active','inactive')),
 kind text not null default 'student' check(kind in ('student','guest','instructor')),
 notes text not null default '', needs_review boolean not null default false,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.class_sessions (
 id text primary key, name text not null, location text not null, schedule text not null,
 instructor text not null, level text not null, age_group text not null
);
create table public.student_certifications (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 academic_year text not null check(academic_year ~ '^20[0-9]{2}-[0-9]{2}$'),
 title text not null check(length(trim(title)) between 1 and 200), certificate_name text not null default '',
 unique(student_id,academic_year,title)
);
create table public.student_enrollments (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 class_id text not null references public.class_sessions(id), academic_year text not null check(academic_year ~ '^20[0-9]{2}-[0-9]{2}$'),
 unique(student_id,class_id,academic_year)
);
create index student_enrollments_class_idx on public.student_enrollments(class_id);
create table public.recitals (
 year text primary key check(year ~ '^20[0-9]{2}$'), title text not null, time text not null, published boolean not null default false
);
create table public.recital_sections (
 id uuid primary key default gen_random_uuid(), recital_year text not null references public.recitals(year),
 slug text not null, title text not null, time text not null, description text not null default '', position integer not null,
 unique(recital_year,slug)
);
create table public.recital_performances (
 id uuid primary key default gen_random_uuid(), section_id uuid not null references public.recital_sections(id),
 slug text not null, number text, title text not null, position integer not null, unique(section_id,slug)
);
create table public.recital_participants (
 performance_id uuid not null references public.recital_performances(id), student_id uuid not null references public.students(id),
 role text not null default '', position integer not null, primary key(performance_id,student_id,role)
);
create index recital_participants_student_idx on public.recital_participants(student_id);
create table public.student_changes (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 changed_at timestamptz not null default now(), previous_record jsonb not null
);
create index student_changes_student_idx on public.student_changes(student_id);

create function public.student_detail(target uuid) returns jsonb language sql stable security invoker set search_path = public as $$
 select to_jsonb(s) || jsonb_build_object(
  'certifications', coalesce((select jsonb_agg(to_jsonb(c) order by c.academic_year desc,c.title) from student_certifications c where c.student_id=s.id),'[]'),
  'enrollments', coalesce((select jsonb_agg(to_jsonb(e) order by e.academic_year desc,e.class_id) from student_enrollments e where e.student_id=s.id),'[]'),
  'performances', coalesce((select jsonb_agg(jsonb_build_object('year',r.year,'recital',r.title,'title',p.title,'number',p.number,'role',rp.role) order by r.year desc,sec.position,p.position)
    from recital_participants rp join recital_performances p on p.id=rp.performance_id join recital_sections sec on sec.id=p.section_id join recitals r on r.year=sec.recital_year where rp.student_id=s.id),'[]'))
 from students s where s.id=target;
$$;

create function public.save_student(payload jsonb) returns jsonb language plpgsql security invoker set search_path = public as $$
declare target uuid; existing students; item jsonb;
begin
 target := nullif(payload->>'id','')::uuid;
 if target is null then
  insert into students(display_name) values (payload->>'display_name') returning id into target;
 else
  select * into existing from students where id=target for update;
  if not found then raise exception 'Student not found' using errcode='P0002'; end if;
  if existing.version is distinct from (payload->>'version')::integer then raise exception 'Record changed. Reload before saving.' using errcode='40001'; end if;
  insert into student_changes(student_id,previous_record) values(target,student_detail(target));
 end if;
 update students set display_name=trim(payload->>'display_name'), certificate_name=coalesce(payload->>'certificate_name',''),
 aliases=array(select jsonb_array_elements_text(coalesce(payload->'aliases','[]'))), current_level=coalesce(payload->>'current_level',''),
 status=coalesce(payload->>'status','active'),kind=coalesce(payload->>'kind','student'),notes=coalesce(payload->>'notes',''),
 needs_review=coalesce((payload->>'needs_review')::boolean,false),version=case when existing.id is null then 1 else existing.version+1 end,updated_at=now()
 where id=target;
 delete from student_certifications where student_id=target;
 for item in select * from jsonb_array_elements(payload->'certifications') loop
  insert into student_certifications(student_id,academic_year,title,certificate_name)
  values(target,item->>'academic_year',trim(item->>'title'),coalesce(item->>'certificate_name',''));
 end loop;
 delete from student_enrollments where student_id=target;
 for item in select * from jsonb_array_elements(payload->'enrollments') loop
  insert into student_enrollments(student_id,class_id,academic_year) values(target,item->>'class_id',item->>'academic_year');
 end loop;
 return student_detail(target);
end;
$$;

-- Explicit projection: no student IDs, certificates, aliases, classes, or notes in public output.
create function public.recital_agenda(target_year text) returns jsonb language sql stable security invoker set search_path = public as $$
 select jsonb_strip_nulls(jsonb_build_object('year',r.year,'time',r.time,'sections',coalesce((
 select jsonb_agg(jsonb_build_object('id',sec.slug,'title',sec.title,'time',sec.time,'description',nullif(sec.description,''),'items',coalesce((
 select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',p.slug,'number',p.number,'title',p.title,'participants',coalesce((
 select jsonb_agg(case when rp.role='' then s.display_name else rp.role || ': ' || s.display_name end order by rp.position)
 from recital_participants rp join students s on s.id=rp.student_id where rp.performance_id=p.id),'[]'))) order by p.position)
 from recital_performances p where p.section_id=sec.id),'[]')) order by sec.position)
 from recital_sections sec where sec.recital_year=r.year),'[]'))) from recitals r where r.year=target_year and r.published;
$$;

do $$ declare t text; begin
 foreach t in array array['students','class_sessions','student_certifications','student_enrollments','recitals','recital_sections','recital_performances','recital_participants','student_changes'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on function public.student_detail(uuid),public.save_student(jsonb),public.recital_agenda(text) from public,anon,authenticated;
grant execute on function public.student_detail(uuid),public.save_student(jsonb),public.recital_agenda(text) to service_role;
