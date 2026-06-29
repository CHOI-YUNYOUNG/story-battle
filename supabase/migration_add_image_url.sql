-- Add image_url column to story_turns
alter table public.story_turns
  add column if not exists image_url text;

-- Create Supabase Storage bucket for game images
insert into storage.buckets (id, name, public)
values ('story-images', 'story-images', true)
on conflict (id) do nothing;

-- Storage RLS policies
create policy "Anyone can view story images"
  on storage.objects for select
  using (bucket_id = 'story-images');

create policy "Service can upload story images"
  on storage.objects for insert
  with check (bucket_id = 'story-images');
