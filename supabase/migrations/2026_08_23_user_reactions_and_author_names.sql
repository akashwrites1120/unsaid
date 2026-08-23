-- ============================================================
-- Patch: de-anonymize branding support + user-keyed reactions
--
--  * Posts are now published under the author's user id, so feed queries
--    move into SECURITY DEFINER RPCs that join app_users.username.
--  * Reactions switch from session-fingerprint dedup to one reaction per
--    user per writing (any emoji type). writing_reactions is recreated:
--    it contains no data yet, so this is lossless.
--  * The aggregate view is dropped; the RPCs replace it entirely.
--
-- Run in the Supabase SQL Editor. Idempotent-safe on a fresh patch run.
-- ============================================================

begin;

drop view if exists public_writings_with_reactions;
drop table if exists writing_reactions;

create table writing_reactions (
  id uuid primary key default gen_random_uuid(),
  writing_id uuid not null references public_writings(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('heart', 'clap', 'mind_blown', 'relate')),
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One reaction total per user per writing — switching emoji updates the row.
create unique index idx_writing_reactions_user_unique
  on writing_reactions(writing_id, user_id);

create index idx_writing_reactions_writing_id on writing_reactions(writing_id);

alter table writing_reactions enable row level security;

create policy "Reactions are viewable by everyone" on writing_reactions
  for select using (true);

create policy "Anyone can add reactions" on writing_reactions
  for insert with check (true);

create policy "Users can remove reactions" on writing_reactions
  for delete using (true);

grant all on writing_reactions to anon, authenticated;

commit;

-- ------------------------------------------------------------
-- Feed RPCs (SECURITY DEFINER): public posts joined with author username.
-- The server calls these instead of querying tables/views directly.
-- ------------------------------------------------------------

create or replace function list_feed_writings(
  p_sort text,
  p_category text,
  p_limit int,
  p_offset int
)
returns table (
  id uuid,
  content text,
  word_count int,
  category text,
  challenge_mode text,
  challenge_duration int,
  created_at timestamptz,
  total_reactions bigint,
  author_username text
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    w.id,
    w.content,
    w.word_count,
    w.category,
    w.challenge_mode,
    w.challenge_duration,
    w.created_at,
    count(r.id) as total_reactions,
    u.username as author_username
  from public_writings w
  left join writing_reactions r on r.writing_id = w.id
  left join app_users u on u.id = w.author_id
  where (p_category is null or w.category = p_category)
  group by w.id, u.username
  order by
    -- popular: reaction total first; recent: constant NULL falls through
    case when p_sort = 'popular' then count(r.id) end desc,
    w.created_at desc
  limit p_limit
  offset p_offset;
$$;

create or replace function get_feed_writing(p_id uuid)
returns table (
  id uuid,
  content text,
  word_count int,
  category text,
  challenge_mode text,
  challenge_duration int,
  created_at timestamptz,
  total_reactions bigint,
  author_username text
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    w.id,
    w.content,
    w.word_count,
    w.category,
    w.challenge_mode,
    w.challenge_duration,
    w.created_at,
    count(r.id) as total_reactions,
    u.username as author_username
  from public_writings w
  left join writing_reactions r on r.writing_id = w.id
  left join app_users u on u.id = w.author_id
  where w.id = p_id
  group by w.id, u.username;
$$;

grant execute on function list_feed_writings(text, text, int, int) to anon;
grant execute on function get_feed_writing(uuid) to anon;
