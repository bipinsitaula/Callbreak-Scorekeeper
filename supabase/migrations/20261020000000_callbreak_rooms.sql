-- Online Call Break rooms.
--
-- One row per room. `state` holds the whole table (seats, hands, bids, trick, scores) and is
-- written by the players' browsers. `version` is a compare-and-set counter: every update must
-- set version = old version + 1, and the app only updates the row where version still equals
-- what it last read, so two players acting at once can never overwrite each other.
--
-- Players join with just a name and a room code (no sign-in), so the anon key can read and
-- update rooms. Anyone with the code can see the room's row; the app only shows each player
-- their own cards.

create table if not exists public.callbreak_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{4,8}$'),
  state jsonb not null,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists callbreak_rooms_updated_at_idx on public.callbreak_rooms (updated_at);

create or replace function public.callbreak_rooms_guard()
returns trigger
language plpgsql
as $$
begin
  if new.code <> old.code then
    raise exception 'room code cannot change';
  end if;
  if new.version <> old.version + 1 then
    raise exception 'stale room version';
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists callbreak_rooms_guard on public.callbreak_rooms;
create trigger callbreak_rooms_guard
  before update on public.callbreak_rooms
  for each row execute function public.callbreak_rooms_guard();

alter table public.callbreak_rooms enable row level security;

drop policy if exists "Rooms are readable" on public.callbreak_rooms;
create policy "Rooms are readable"
  on public.callbreak_rooms for select
  to anon, authenticated
  using (true);

drop policy if exists "Rooms can be created" on public.callbreak_rooms;
create policy "Rooms can be created"
  on public.callbreak_rooms for insert
  to anon, authenticated
  with check (version = 0);

drop policy if exists "Rooms can be updated" on public.callbreak_rooms;
create policy "Rooms can be updated"
  on public.callbreak_rooms for update
  to anon, authenticated
  using (true)
  with check (true);

-- No delete policy: clients cannot delete rooms.

-- Push row changes to subscribed players.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'callbreak_rooms'
  ) then
    alter publication supabase_realtime add table public.callbreak_rooms;
  end if;
end;
$$;

-- Housekeeping: remove rooms nobody has touched for two days.
create or replace function public.callbreak_cleanup_rooms()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.callbreak_rooms where updated_at < now() - interval '2 days' returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.callbreak_cleanup_rooms() from public, anon, authenticated;

-- To run it every night, enable the pg_cron extension and run once:
--   select cron.schedule('callbreak-cleanup', '0 3 * * *', 'select public.callbreak_cleanup_rooms()');
