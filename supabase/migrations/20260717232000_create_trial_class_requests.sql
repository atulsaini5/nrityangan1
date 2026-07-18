create extension if not exists pgcrypto;

create table if not exists public.trial_class_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_name text not null,
  student_name text not null,
  email text not null,
  phone text not null,
  student_age smallint check (student_age is null or student_age between 3 and 120),
  class_interest text not null,
  location_interest text not null,
  notes text,
  followup_completed boolean not null default false,
  followup_completed_at timestamptz,
  notification_sent boolean not null default false,
  notification_error text
);

comment on column public.trial_class_requests.followup_completed is
  'Checkbox for staff to mark once follow-up with the prospective student is complete.';

alter table public.trial_class_requests enable row level security;

-- No public policies are intentionally created. The Edge Function writes with the
-- service-role key; authenticated staff can manage rows from the Supabase dashboard.

create index if not exists trial_class_requests_created_at_idx
  on public.trial_class_requests (created_at desc);

create index if not exists trial_class_requests_followup_idx
  on public.trial_class_requests (followup_completed, created_at desc);

