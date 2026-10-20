-- Table chat for online Call Break rooms.
--
-- One row per message. Messages belong to a room and are deleted with it. Only someone
-- seated at the table (their player id is in the room's state) can post, and messages
-- can't be edited or deleted by clients.

create table if not exists public.callbreak_messages (
  id bigint generated always as identity primary key,
  room_code text not null references public.callbreak_rooms (code) on delete cascade,
  player_id text not null check (char_length(player_id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 16),
  body text not null check (char_length(btrim(body)) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists callbreak_messages_room_idx on public.callbreak_messages (room_code, id desc);

alter table public.callbreak_messages enable row level security;

drop policy if exists "Messages are readable" on public.callbreak_messages;
create policy "Messages are readable"
  on public.callbreak_messages for select
  to anon, authenticated
  using (true);

drop policy if exists "Seated players can post" on public.callbreak_messages;
create policy "Seated players can post"
  on public.callbreak_messages for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.callbreak_rooms r
      where r.code = room_code
        and r.state -> 'players' @> jsonb_build_array(jsonb_build_object('id', player_id))
    )
  );

-- No update or delete policies: messages are permanent until the room is cleaned up.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'callbreak_messages'
  ) then
    alter publication supabase_realtime add table public.callbreak_messages;
  end if;
end;
$$;
