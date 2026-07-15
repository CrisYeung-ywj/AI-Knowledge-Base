create table if not exists public.ai_panorama_data (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_panorama_versions (
  id bigint generated always as identity primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ai_panorama_data enable row level security;
alter table public.ai_panorama_versions enable row level security;

revoke all on table public.ai_panorama_data from anon, authenticated;
revoke all on table public.ai_panorama_versions from anon, authenticated;
grant select (id, data, updated_at) on table public.ai_panorama_data to anon;
grant select (id, created_at) on table public.ai_panorama_versions to anon;

drop policy if exists "Public read panorama data" on public.ai_panorama_data;
create policy "Public read panorama data"
  on public.ai_panorama_data
  for select
  to anon
  using (true);

drop policy if exists "Public read panorama versions" on public.ai_panorama_versions;
create policy "Public read panorama versions"
  on public.ai_panorama_versions
  for select
  to anon
  using (true);

create or replace function public.save_ai_panorama_version(p_data jsonb)
returns table(version_id bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_at timestamptz := now();
  new_version_id bigint;
begin
  insert into ai_panorama_versions (data, created_at)
  values (p_data, saved_at)
  returning id into new_version_id;

  insert into ai_panorama_data (id, data, updated_at)
  values ('default', p_data, saved_at)
  on conflict (id) do update
  set data = excluded.data, updated_at = excluded.updated_at;

  return query select new_version_id, saved_at;
end;
$$;
