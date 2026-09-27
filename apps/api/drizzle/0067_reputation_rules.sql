-- apps/api/drizzle/0067_reputation_rules.sql
-- 1. Remove downvote penalty (downvote = 0 reputation points instead of -1)
create or replace function reaction_reputation(rt reaction_type) returns int
language sql immutable as $$
  select case rt
    when 'upvote' then 1 
    when 'downvote' then 0 
    when 'like' then 1 
    when 'love' then 2
    when 'wow' then 1 
    when 'funny' then 1 
    else 0 
  end $$;

-- 2. Add connection reputation trigger (+5 reputation points to addressee when connection status becomes 'connected')
create or replace function on_connection_reputation_change() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' and new.status = 'connected') then
    update profiles set reputation = reputation + 5 where id = new.addressee_id;
  elsif (tg_op = 'UPDATE' and new.status = 'connected' and old.status <> 'connected') then
    update profiles set reputation = reputation + 5 where id = new.addressee_id;
  elsif (tg_op = 'UPDATE' and old.status = 'connected' and new.status <> 'connected') then
    update profiles set reputation = greatest(0, reputation - 5) where id = old.addressee_id;
  elsif (tg_op = 'DELETE' and old.status = 'connected') then
    update profiles set reputation = greatest(0, reputation - 5) where id = old.addressee_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_connection_reputation on connections;
create trigger trg_connection_reputation after insert or update or delete on connections
  for each row execute function on_connection_reputation_change();
