create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

create table public.obstacle_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  title text not null,
  location_text text,
  location extensions.geography (point, 4326) not null,
  location_accuracy_m real check (location_accuracy_m is null or location_accuracy_m >= 0),
  category text not null,
  severity text not null check (severity in ('impassable', 'difficult', 'caution')),
  clearance_cm smallint check (clearance_cm is null or clearance_cm >= 0),
  notes text not null default '',
  photo_path text not null,
  forward_dpupr boolean not null default false,
  is_public boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'resolved', 'rejected')),
  ai_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index obstacle_reports_location_gix
  on public.obstacle_reports using gist (location);
create index obstacle_reports_status_created_idx
  on public.obstacle_reports (status, created_at desc);
create index obstacle_reports_reporter_created_idx
  on public.obstacle_reports (reporter_id, created_at desc);

create table public.obstacle_verifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.obstacle_reports (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  verdict text not null check (verdict in ('still_there', 'fixed')),
  note text,
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

create index obstacle_verifications_report_verdict_idx
  on public.obstacle_verifications (report_id, verdict);

create table public.institution_reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  institution_name text not null,
  title text not null,
  format text not null check (format in ('pdf', 'text')),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'acknowledged', 'closed')),
  document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institution_report_items (
  institution_report_id uuid not null
    references public.institution_reports (id) on delete cascade,
  obstacle_report_id uuid not null
    references public.obstacle_reports (id) on delete restrict,
  snapshot jsonb not null,
  primary key (institution_report_id, obstacle_report_id)
);

create table public.institution_report_events (
  id uuid primary key default gen_random_uuid(),
  institution_report_id uuid not null
    references public.institution_reports (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index institution_report_events_report_created_idx
  on public.institution_report_events (institution_report_id, created_at desc);

create table public.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  location extensions.geography (point, 4326) not null,
  provider text not null,
  forecast_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  conditions jsonb not null
);

create index weather_snapshots_location_gix
  on public.weather_snapshots using gist (location);
create index weather_snapshots_expiry_idx
  on public.weather_snapshots (expires_at);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger obstacle_reports_set_updated_at
before update on public.obstacle_reports
for each row execute function public.set_updated_at();

create trigger institution_reports_set_updated_at
before update on public.institution_reports
for each row execute function public.set_updated_at();

create function public.apply_obstacle_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_report_id uuid;
  still_count integer;
  fixed_count integer;
begin
  if tg_op = 'DELETE' then
    affected_report_id = old.report_id;
  else
    affected_report_id = new.report_id;
  end if;

  select
    count(*) filter (where verdict = 'still_there'),
    count(*) filter (where verdict = 'fixed')
  into still_count, fixed_count
  from public.obstacle_verifications
  where report_id = affected_report_id;

  update public.obstacle_reports
  set status = case
    when fixed_count >= 2 and fixed_count > still_count then 'resolved'
    when still_count >= 2 and still_count >= fixed_count then 'active'
    else status
  end
  where id = affected_report_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger obstacle_verifications_update_status
after insert or update or delete on public.obstacle_verifications
for each row execute function public.apply_obstacle_verification_status();

revoke all on function public.apply_obstacle_verification_status() from public, anon, authenticated;

alter table public.obstacle_reports enable row level security;
alter table public.obstacle_verifications enable row level security;
alter table public.institution_reports enable row level security;
alter table public.institution_report_items enable row level security;
alter table public.institution_report_events enable row level security;
alter table public.weather_snapshots enable row level security;

create policy "Public and own obstacle reports are readable"
on public.obstacle_reports for select to anon, authenticated
using (is_public or reporter_id = (select auth.uid()));

create policy "Users create their own obstacle reports"
on public.obstacle_reports for insert to authenticated
with check (reporter_id = (select auth.uid()));

create policy "Users verify another user's report once"
on public.obstacle_verifications for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.obstacle_reports report
    where report.id = report_id
      and report.reporter_id is distinct from (select auth.uid())
      and report.is_public
      and report.status in ('pending', 'active')
  )
);

create policy "Users read their institution reports"
on public.institution_reports for select to authenticated
using (created_by = (select auth.uid()));

create policy "Users create their institution reports"
on public.institution_reports for insert to authenticated
with check (created_by = (select auth.uid()));

create policy "Users read items from their institution reports"
on public.institution_report_items for select to authenticated
using (
  exists (
    select 1
    from public.institution_reports report
    where report.id = institution_report_id
      and report.created_by = (select auth.uid())
  )
);

create policy "Users add items to their institution reports"
on public.institution_report_items for insert to authenticated
with check (
  exists (
    select 1
    from public.institution_reports report
    where report.id = institution_report_id
      and report.created_by = (select auth.uid())
  )
);

create policy "Users read events from their institution reports"
on public.institution_report_events for select to authenticated
using (
  exists (
    select 1
    from public.institution_reports report
    where report.id = institution_report_id
      and report.created_by = (select auth.uid())
  )
);

create policy "Weather snapshots are readable"
on public.weather_snapshots for select to anon, authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('obstacle-photos', 'obstacle-photos', false)
on conflict (id) do nothing;

create policy "Users upload obstacle photos to their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'obstacle-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users read their own obstacle photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'obstacle-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
