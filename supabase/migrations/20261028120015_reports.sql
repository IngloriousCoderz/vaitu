-- What the owner receives by email, and acts on: see docs/moderation.md.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('job', 'user', 'review')),
  job_id uuid references public.jobs (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  reason text not null
    check (reason in ('spam', 'inappropriate', 'fake', 'harassment', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index reports_reporter_idx on public.reports (reporter_id, created_at);

alter table public.reports enable row level security;

revoke all on table public.reports from anon, authenticated;
