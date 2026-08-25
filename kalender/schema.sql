-- Kalendri andmebaasi skeem (Supabase / PostgreSQL).
-- Käivita see fail Supabase SQL Editoris üks kord.
-- Kõik read on seotud kasutajaga (auth.uid()) ja RLS lubab igal kasutajal
-- näha ainult enda ridu.

create extension if not exists "pgcrypto";

-- Üksiksündmused --------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 5000),
  location    text check (char_length(location) <= 200),
  all_day     boolean not null default false,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  color       text not null default '#3498db' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint events_time_order check (ends_at >= starts_at)
);

create index if not exists events_user_starts_idx on public.events (user_id, starts_at);

-- Perioodid (ajavahemikud, sh korduvad värvitsüklid) ---------------------------
-- cycle_colors on jsonb massiiv kujul:
--   [{"name": "Tsükkel A", "color": "#3498db"}, {"name": "Tsükkel B", "color": "#e67e22"}]
-- Kui massiivis on rohkem kui üks element, korduvad blokid tsüklina:
-- iga blokk on block_days päeva pikk ja saab järgmise värvi massiivist.
create table if not exists public.periods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 200),
  start_date   date not null,
  end_date     date not null,
  color        text not null default '#9b59b6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  repeats      boolean not null default false,
  block_days   integer not null default 14 check (block_days between 1 and 366),
  cycle_colors jsonb not null default '[]'::jsonb,
  repeat_until date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint periods_date_order check (end_date >= start_date),
  constraint periods_cycle_colors_is_array check (jsonb_typeof(cycle_colors) = 'array')
);

create index if not exists periods_user_start_idx on public.periods (user_id, start_date);

-- updated_at hoidmine ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists periods_set_updated_at on public.periods;
create trigger periods_set_updated_at
  before update on public.periods
  for each row execute function public.set_updated_at();

-- Row Level Security ----------------------------------------------------------
alter table public.events  enable row level security;
alter table public.periods enable row level security;

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own" on public.events
  for select using (auth.uid() = user_id);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events
  for insert with check (auth.uid() = user_id);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own" on public.events
  for delete using (auth.uid() = user_id);

drop policy if exists "periods_select_own" on public.periods;
create policy "periods_select_own" on public.periods
  for select using (auth.uid() = user_id);

drop policy if exists "periods_insert_own" on public.periods;
create policy "periods_insert_own" on public.periods
  for insert with check (auth.uid() = user_id);

drop policy if exists "periods_update_own" on public.periods;
create policy "periods_update_own" on public.periods
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "periods_delete_own" on public.periods;
create policy "periods_delete_own" on public.periods
  for delete using (auth.uid() = user_id);

revoke all on public.events  from anon;
revoke all on public.periods from anon;
grant select, insert, update, delete on public.events  to authenticated;
grant select, insert, update, delete on public.periods to authenticated;
