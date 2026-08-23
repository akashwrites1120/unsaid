-- ============================================================
-- Write or Lose — initial schema (single consolidated migration)
-- Run this ONE file in the Supabase SQL Editor. Nothing else.
--
-- Contents:
--   1. app_users / app_sessions — accounts for publishing
--   2. public_writings   — anonymously published writings
--   3. writing_reactions — anonymous reactions + aggregates view
--   4. SECURITY DEFINER RPCs for auth (works with only the anon key)
--
-- Security model:
--   * All tables have RLS enabled.
--   * author_id is write-only: clients can never SELECT it, so a public
--     post can never be linked back to the account that published it.
--   * Password hashes are bcrypt'd inside Postgres and never leave it;
--     auth flows go through SECURITY DEFINER RPCs only.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Accounts: users + sessions
--    (writing is free & anonymous; publishing requires an account)
-- ------------------------------------------------------------

create table app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table app_sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index idx_app_sessions_user_id on app_sessions(user_id);
create index idx_app_sessions_expires_at on app_sessions(expires_at);

alter table app_users enable row level security;
alter table app_sessions enable row level security;
-- Zero RLS policies -> direct client access fully denied.
-- All access happens through the RPCs at the bottom of this file.

-- ------------------------------------------------------------
-- 2. Public writings
-- ------------------------------------------------------------

create table public_writings (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  word_count integer not null,
  category text not null check (category in ('thoughts', 'stories', 'journal', 'academic', 'confession', 'ideas', 'other')),
  challenge_mode text not null check (challenge_mode in ('soft', 'focus', 'hard')),
  challenge_duration integer not null,
  created_at timestamptz not null default now(),
  -- Set on publish; never exposed to any client query (see column grants).
  -- Deleting an account keeps their posts but severs the link.
  author_id uuid null references app_users(id) on delete set null
);

create index idx_public_writings_created_at on public_writings(created_at desc);
create index idx_public_writings_category on public_writings(category);
create index idx_public_writings_challenge_mode on public_writings(challenge_mode);

alter table public_writings enable row level security;

create policy "Public writings are viewable by everyone" on public_writings
  for select using (true);

create policy "Anyone can publish writings" on public_writings
  for insert with check (true);

-- Row-level policies say which ROWS are visible; column grants control which
-- FIELDS are readable. author_id is excluded so anonymity holds even against
-- direct PostgREST access with the anon key. The server uses the same anon
-- key and still needs full INSERT (including author_id).
revoke select on public_writings from anon, authenticated;
grant select (id, content, word_count, category, challenge_mode, challenge_duration, created_at)
  on public_writings to anon, authenticated;

-- ------------------------------------------------------------
-- 3. Writing reactions (+ aggregate view)
-- ------------------------------------------------------------

create table writing_reactions (
  id uuid primary key default gen_random_uuid(),
  writing_id uuid not null references public_writings(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('heart', 'clap', 'mind_blown', 'relate')),
  -- Coarse hash of User-Agent + Accept-Language, used only to prevent
  -- duplicate reactions from the same browser. Not an identity.
  session_fingerprint text not null,
  created_at timestamptz not null default now()
);

create unique index idx_writing_reactions_unique
  on writing_reactions(writing_id, session_fingerprint, reaction_type);

create index idx_writing_reactions_writing_id on writing_reactions(writing_id);

alter table writing_reactions enable row level security;

create policy "Reactions are viewable by everyone" on writing_reactions
  for select using (true);

create policy "Anyone can add reactions" on writing_reactions
  for insert with check (true);

-- The fingerprint is computed server-side from coarse request headers and is
-- this app's only identity primitive (inserts already accept any
-- fingerprint), so a permissive DELETE policy matches the V1 threat model.
create policy "Users can remove their own reactions" on writing_reactions
  for delete using (true);

grant all on writing_reactions to anon, authenticated;

-- Aggregate view used by the feed. Explicit column list (never pw.*) plus
-- security_invoker so base-table RLS applies to viewers.
create view public_writings_with_reactions
with (security_invoker = true)
as
select
  pw.id,
  pw.content,
  pw.word_count,
  pw.category,
  pw.challenge_mode,
  pw.challenge_duration,
  pw.created_at,
  coalesce(sum(case when wr.reaction_type = 'heart' then 1 else 0 end), 0) as heart_count,
  coalesce(sum(case when wr.reaction_type = 'clap' then 1 else 0 end), 0) as clap_count,
  coalesce(sum(case when wr.reaction_type = 'mind_blown' then 1 else 0 end), 0) as mind_blown_count,
  coalesce(sum(case when wr.reaction_type = 'relate' then 1 else 0 end), 0) as relate_count,
  coalesce(count(wr.id), 0) as total_reactions
from public_writings pw
left join writing_reactions wr on wr.writing_id = pw.id
group by pw.id;

grant select on public_writings_with_reactions to anon, authenticated;

-- ------------------------------------------------------------
-- 4. Auth RPCs (SECURITY DEFINER)
-- ------------------------------------------------------------

-- Usernames: 3-24 chars of a-z / 0-9 / _, stored lowercase (case-insensitive).
create or replace function register_user(p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text;
  v_user_id uuid;
  v_token uuid;
begin
  v_username := lower(btrim(coalesce(p_username, '')));

  if v_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'INVALID_USERNAME';
  end if;

  if char_length(coalesce(p_password, '')) < 8 or char_length(p_password) > 200 then
    raise exception 'INVALID_PASSWORD';
  end if;

  insert into app_users (username, password_hash)
  values (v_username, crypt(p_password, gen_salt('bf')))
  returning id into v_user_id;

  insert into app_sessions (user_id, expires_at)
  values (v_user_id, now() + interval '30 days')
  returning token into v_token;

  return v_token::text;
end;
$$;

create or replace function verify_login(p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user app_users%rowtype;
  v_token uuid;
begin
  select * into v_user
  from app_users
  where username = lower(btrim(coalesce(p_username, '')));

  -- Same generic error for unknown user and wrong password.
  if v_user.id is null
     or coalesce(p_password, '') = ''
     or char_length(p_password) > 200
     or v_user.password_hash <> crypt(p_password, v_user.password_hash) then
    raise exception 'INVALID_CREDENTIALS';
  end if;

  insert into app_sessions (user_id, expires_at)
  values (v_user.id, now() + interval '30 days')
  returning token into v_token;

  return v_token::text;
end;
$$;

create or replace function get_session_user(p_token text)
returns table (user_id uuid, username text)
language sql
security definer
set search_path = public, extensions
as $$
  select u.id, u.username
  from app_sessions s
  join app_users u on u.id = s.user_id
  where s.token = p_token::uuid
    and s.expires_at > now();
$$;

create or replace function revoke_session(p_token text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  delete from app_sessions where token = p_token::uuid;
$$;

grant execute on function register_user(text, text) to anon;
grant execute on function verify_login(text, text) to anon;
grant execute on function get_session_user(text) to anon;
grant execute on function revoke_session(text) to anon;
