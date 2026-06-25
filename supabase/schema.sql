-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile table (extends Supabase Auth)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  nickname text not null default '',
  avatar_url text,
  best_writer_count integer not null default 0,
  worst_writer_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Rooms table
create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  code char(6) unique not null,
  host_id uuid references public.users(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'voting', 'finished')),
  created_at timestamptz not null default now()
);

-- Room players
create table public.room_players (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  nickname text not null,
  turn_order integer not null default 0,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique(room_id, user_id)
);

-- Story turns
create table public.story_turns (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  turn_number integer not null,
  author_type text not null check (author_type in ('human', 'ai')),
  author_id uuid references public.users(id) on delete set null,
  author_nickname text,
  content text not null,
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  unique(room_id, turn_number)
);

-- Chat messages
create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  nickname text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Votes
create table public.votes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  voter_id uuid references public.users(id) on delete cascade not null,
  best_writer_id uuid references public.users(id) on delete cascade not null,
  worst_writer_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(room_id, voter_id)
);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.story_turns enable row level security;
alter table public.chat_messages enable row level security;
alter table public.votes enable row level security;

-- RLS Policies: Users
create policy "Users can view all profiles" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- RLS Policies: Rooms
create policy "Anyone can view rooms" on public.rooms for select using (true);
create policy "Authenticated users can create rooms" on public.rooms for insert with check (auth.role() = 'authenticated');
create policy "Host can update room" on public.rooms for update using (auth.uid() = host_id);
create policy "Host can delete room" on public.rooms for delete using (auth.uid() = host_id);

-- RLS Policies: Room Players
create policy "Anyone can view room players" on public.room_players for select using (true);
create policy "Authenticated users can join rooms" on public.room_players for insert with check (auth.uid() = user_id);
create policy "Users can leave rooms" on public.room_players for delete using (auth.uid() = user_id);
create policy "Host can remove players" on public.room_players for delete using (
  exists (select 1 from public.rooms where id = room_id and host_id = auth.uid())
);

-- RLS Policies: Story Turns
create policy "Players can view visible turns" on public.story_turns for select using (true);
create policy "Authenticated users can insert turns" on public.story_turns for insert with check (auth.role() = 'authenticated');
create policy "Service can update turns" on public.story_turns for update using (auth.role() = 'authenticated');

-- RLS Policies: Chat Messages
create policy "Room players can view chat" on public.chat_messages for select using (true);
create policy "Authenticated users can send chat" on public.chat_messages for insert with check (auth.uid() = user_id);

-- RLS Policies: Votes
create policy "Authenticated users can vote" on public.votes for insert with check (auth.uid() = voter_id);
create policy "Anyone can view votes after submission" on public.votes for select using (true);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, nickname, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable realtime for key tables
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.story_turns;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.votes;
