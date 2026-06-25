-- RPC functions for incrementing vote counts atomically
create or replace function increment_best_count(user_id uuid, amount integer)
returns void as $$
  update public.users
  set best_writer_count = best_writer_count + amount
  where id = user_id;
$$ language sql security definer;

create or replace function increment_worst_count(user_id uuid, amount integer)
returns void as $$
  update public.users
  set worst_writer_count = worst_writer_count + amount
  where id = user_id;
$$ language sql security definer;
