create table if not exists public.ai_panorama_data (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ai_panorama_data enable row level security;

revoke all on table public.ai_panorama_data from anon, authenticated;
grant select (id, data, updated_at) on table public.ai_panorama_data to anon;

drop policy if exists "Public read panorama data" on public.ai_panorama_data;
create policy "Public read panorama data"
  on public.ai_panorama_data
  for select
  to anon
  using (true);
