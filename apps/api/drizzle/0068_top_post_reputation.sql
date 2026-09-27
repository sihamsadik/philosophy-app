-- apps/api/drizzle/0068_top_post_reputation.sql
-- Top Suggested Post Reputation Bonus (+25 Points)
-- When a post reaches top suggested / milestone status (5+ combined reactions and replies),
-- award +25 bonus reputation points to the author (once per post).

SET search_path TO public, extensions;
--> statement-breakpoint
create or replace function check_top_post_bonus(p_entity_id uuid)
returns void language plpgsql as $$
declare
  v_author uuid;
  v_total_eng int;
  v_already_awarded boolean;
begin
  if p_entity_id is null then return; end if;

  select user_id,
         coalesce((metadata->>'top_bonus_awarded')::boolean, false),
         (replies_count + (
           select coalesce(sum((val)::int), 0)
           from jsonb_each_text(reaction_counts) as r(key, val)
         ))
  into v_author, v_already_awarded, v_total_eng
  from entities
  where id = p_entity_id and deleted_at is null;

  if v_author is not null and not v_already_awarded and v_total_eng >= 5 then
    -- Award +25 reputation points to author
    update profiles set reputation = reputation + 25 where id = v_author;
    -- Mark top_bonus_awarded = true in entity metadata
    update entities set metadata = jsonb_set(metadata, '{top_bonus_awarded}', 'true'::jsonb)
    where id = p_entity_id;
  end if;
end $$;
--> statement-breakpoint
-- Hook check_top_post_bonus into on_comment_change()
create or replace function on_comment_change() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update entities set replies_count = replies_count + 1 where id = new.entity_id;
    if new.parent_id is not null then
      update comments set replies_count = replies_count + 1 where id = new.parent_id;
    end if;
    perform check_top_post_bonus(new.entity_id);
  elsif (tg_op = 'DELETE') then
    update entities set replies_count = greatest(0, replies_count - 1) where id = old.entity_id;
    if old.parent_id is not null then
      update comments set replies_count = greatest(0, replies_count - 1) where id = old.parent_id;
    end if;
  end if;
  return null;
end $$;
--> statement-breakpoint
-- Hook check_top_post_bonus into on_reaction_change()
create or replace function on_reaction_change() returns trigger language plpgsql as $$
declare
  author uuid;
  ent_id uuid;
begin
  if (tg_op = 'INSERT') then
    perform bump_reaction_count(new.target_type, new.target_id, new.reaction_type, 1);
    author := reaction_author(new.target_type, new.target_id);
    if author is not null then
      update profiles set reputation = reputation + reaction_reputation(new.reaction_type) where id = author;
      perform bump_space_reputation(new.project_id, new.target_type, new.target_id, author,
                                    reaction_reputation(new.reaction_type));
    end if;
    ent_id := case when new.target_type = 'entity' then new.target_id
                   when new.target_type = 'comment' then (select entity_id from comments where id = new.target_id)
                   else null end;
    perform check_top_post_bonus(ent_id);
  elsif (tg_op = 'DELETE') then
    perform bump_reaction_count(old.target_type, old.target_id, old.reaction_type, -1);
    author := reaction_author(old.target_type, old.target_id);
    if author is not null then
      update profiles set reputation = reputation - reaction_reputation(old.reaction_type) where id = author;
      perform bump_space_reputation(old.project_id, old.target_type, old.target_id, author,
                                    -reaction_reputation(old.reaction_type));
    end if;
  elsif (tg_op = 'UPDATE' and new.reaction_type <> old.reaction_type) then
    perform bump_reaction_count(old.target_type, old.target_id, old.reaction_type, -1);
    perform bump_reaction_count(new.target_type, new.target_id, new.reaction_type, 1);
    author := reaction_author(new.target_type, new.target_id);
    if author is not null then
      update profiles set reputation = reputation
        - reaction_reputation(old.reaction_type) + reaction_reputation(new.reaction_type)
      where id = author;
      perform bump_space_reputation(new.project_id, new.target_type, new.target_id, author,
                                    reaction_reputation(new.reaction_type) - reaction_reputation(old.reaction_type));
    end if;
    ent_id := case when new.target_type = 'entity' then new.target_id
                   when new.target_type = 'comment' then (select entity_id from comments where id = new.target_id)
                   else null end;
    perform check_top_post_bonus(ent_id);
  end if;
  return null;
end $$;
