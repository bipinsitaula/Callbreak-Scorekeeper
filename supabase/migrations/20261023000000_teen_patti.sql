-- Teen Patti online.
--
-- Teen Patti tables reuse callbreak_rooms (the room state says which game it is) and
-- callbreak_messages for chat, so only the history needs to know about games.

alter table public.callbreak_games
  add column if not exists game text not null default 'callbreak';

alter table public.callbreak_games drop constraint if exists callbreak_games_game_check;
alter table public.callbreak_games
  add constraint callbreak_games_game_check check (game in ('callbreak', 'teenpatti'));

-- Teen Patti games are 5 to 30 hands; the existing check allows up to 50.
create index if not exists callbreak_games_game_finished_idx on public.callbreak_games (game, finished_at desc);
