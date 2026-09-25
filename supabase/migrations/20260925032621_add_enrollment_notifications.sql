-- Recipients are configured privately, not accepted from public form input.
create table public.enrollment_notification_recipients (
 email text primary key, enabled boolean not null default true
);
create table public.enrollment_notifications (
 id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references public.enrollment_requests(id),
 recipient text not null, created_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','sending','accepted','failed','unknown')),
 attempts integer not null default 0, attempted_at timestamptz, accepted_at timestamptz,
 provider_status integer, unique(enrollment_id,recipient)
);
create index enrollment_notifications_queue_idx on public.enrollment_notifications(status,created_at);
alter table public.enrollment_notification_recipients enable row level security;
alter table public.enrollment_notifications enable row level security;
revoke all on public.enrollment_notification_recipients,public.enrollment_notifications from anon,authenticated;
grant select on public.enrollment_notification_recipients to service_role;
grant select,insert,update on public.enrollment_notifications to service_role;

create function public.queue_enrollment_notifications() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 insert into enrollment_notifications(enrollment_id,recipient)
 select new.id,email from enrollment_notification_recipients where enabled;
 return new;
end; $$;
create trigger enrollment_notifications_after_insert after insert on public.enrollment_requests
 for each row execute function public.queue_enrollment_notifications();

create function public.claim_enrollment_notifications(target uuid default null) returns jsonb
language sql security invoker set search_path=public as $$
 with candidates as (
  select n.id from enrollment_notifications n
  where (target is null or n.enrollment_id=target)
   and (n.status='pending' or (n.status='failed' and n.attempts<3 and n.attempted_at<now()-interval '5 minutes'))
  order by n.created_at,n.id limit 20 for update skip locked
 ), claimed as (
  update enrollment_notifications n set status='sending',attempts=attempts+1,attempted_at=clock_timestamp()
  from candidates c where n.id=c.id returning n.*
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'recipient',n.recipient,'reference',e.id,
  'student_name',e.student_name,'academic_year',e.academic_year,'created_at',e.created_at)), '[]')
 from claimed n join enrollment_requests e on e.id=n.enrollment_id;
$$;
create function public.finish_enrollment_notification(job_id uuid, outcome text, http_status integer default null)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if outcome not in ('accepted','failed','unknown') then raise exception 'Invalid notification outcome'; end if;
 update enrollment_notifications set status=outcome,provider_status=http_status,
 accepted_at=case when outcome='accepted' then clock_timestamp() else null end
 where id=job_id and status='sending';
end; $$;
revoke all on function public.queue_enrollment_notifications(),public.claim_enrollment_notifications(uuid),public.finish_enrollment_notification(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.queue_enrollment_notifications(),public.claim_enrollment_notifications(uuid),public.finish_enrollment_notification(uuid,text,integer) to service_role;
