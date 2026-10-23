-- Jut Patti online.
--
-- Jut Patti tables reuse callbreak_rooms and callbreak_messages like Teen Patti does, so the
-- history only has to accept the new game id.

alter table public.callbreak_games drop constraint if exists callbreak_games_game_check;
alter table public.callbreak_games
  add constraint callbreak_games_game_check check (game in ('callbreak', 'teenpatti', 'jutpatti'));
