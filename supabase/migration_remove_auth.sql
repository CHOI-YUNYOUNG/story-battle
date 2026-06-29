-- 로그인 없이 플레이할 수 있도록 auth 의존성 제거

-- 1. 외래키 제약 제거 (auth.users 참조 제거)
alter table public.rooms drop constraint if exists rooms_host_id_fkey;
alter table public.room_players drop constraint if exists room_players_user_id_fkey;
alter table public.story_turns drop constraint if exists story_turns_author_id_fkey;
alter table public.chat_messages drop constraint if exists chat_messages_user_id_fkey;

-- 2. 기존 인증 기반 정책 제거
drop policy if exists "Authenticated users can join rooms" on public.room_players;
drop policy if exists "Users can leave rooms" on public.room_players;
drop policy if exists "Host can remove players" on public.room_players;
drop policy if exists "Authenticated users can create rooms" on public.rooms;
drop policy if exists "Host can update room" on public.rooms;
drop policy if exists "Host can delete room" on public.rooms;
drop policy if exists "Authenticated users can insert turns" on public.story_turns;
drop policy if exists "Service can update turns" on public.story_turns;
drop policy if exists "Authenticated users can send chat" on public.chat_messages;
drop policy if exists "Authenticated users can vote" on public.votes;

-- 3. 누구나 접근 가능한 정책으로 교체
create policy "Open access room_players insert" on public.room_players for insert with check (true);
create policy "Open access room_players delete" on public.room_players for delete using (true);

create policy "Open access rooms insert" on public.rooms for insert with check (true);
create policy "Open access rooms update" on public.rooms for update using (true);
create policy "Open access rooms delete" on public.rooms for delete using (true);

create policy "Open access story_turns insert" on public.story_turns for insert with check (true);
create policy "Open access story_turns update" on public.story_turns for update using (true);
create policy "Open access story_turns delete" on public.story_turns for delete using (true);

create policy "Open access chat insert" on public.chat_messages for insert with check (true);
