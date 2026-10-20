-- Accounts (username + password) and game history for online Call Break.
--
-- Players now sign in (Supabase Auth, email + password under the hood; see src/online/auth.js),
-- so a seat's player id is the account's auth.uid(). This migration:
--   1. adds callbreak_games, the finished-game history, readable only by the people who played;
--   2. makes chat check that you post as yourself;
--   3. requires being signed in to create or change rooms.
--
-- Before running: Authentication > Sign In / Providers > Email: turn OFF "Confirm email".

-- 1. History --------------------------------------------------------------------------------

create table if not exists public.callbreak_games (
  id text primary key check (id ~ '^[a-z0-9]{8,32}$'),
  room_code text not null,
  finished_at timestamptz not null default now(),
  total_rounds integer not null check (total_rounds between 1 and 50),
  ended_early boolean not null default false,
  players jsonb not null check (jsonb_typeof(players) = 'array'),
  rounds jsonb not null check (jsonb_typeof(rounds) = 'array' and jsonb_array_length(rounds) >= 1),
  player_ids text[] not null check (cardinality(player_ids) >= 1)
);

create index if not exists callbreak_games_players_idx on public.callbreak_games using gin (player_ids);
create index if not exists callbreak_games_finished_idx on public.callbreak_games (finished_at desc);

alter table public.callbreak_games enable row level security;

drop policy if exists "Players read their own games" on public.callbreak_games;
create policy "Players read their own games"
  on public.callbreak_games for select
  to authenticated
  using (auth.uid()::text = any (player_ids));

drop policy if exists "Players save games they played" on public.callbreak_games;
create policy "Players save games they played"
  on public.callbreak_games for insert
  to authenticated
  with check (auth.uid()::text = any (player_ids));

-- No update or delete policies: a saved game is final.

-- 2. Chat: you can only post as yourself -------------------------------------------------

drop policy if exists "Seated players can post" on public.callbreak_messages;
create policy "Seated players can post"
  on public.callbreak_messages for insert
  to authenticated
  with check (
    player_id = auth.uid()::text
    and exists (
      select 1
      from public.callbreak_rooms r
      where r.code = room_code
        and r.state -> 'players' @> jsonb_build_array(jsonb_build_object('id', player_id))
    )
  );

-- 3. Rooms: signed-in players only for creating and playing ------------------------------

drop policy if exists "Rooms can be created" on public.callbreak_rooms;
create policy "Rooms can be created"
  on public.callbreak_rooms for insert
  to authenticated
  with check (version = 0);

drop policy if exists "Rooms can be updated" on public.callbreak_rooms;
create policy "Rooms can be updated"
  on public.callbreak_rooms for update
  to authenticated
  using (true)
  with check (true);
