-- ============================================================
-- UniFind – Campus Lost & Found
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. POSTS ────────────────────────────────────────────────
create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('lost', 'found')),
  title           text not null,
  description     text not null,
  category        text not null default 'Other',
  location        text not null default '',
  date_lost       date,
  contact_name    text not null default '',
  contact_method  text not null default '',
  image           text not null default '',
  status          text not null default 'open' check (status in ('open', 'resolved')),
  author_id       uuid,
  author_name     text not null default '',
  author_avatar   text not null default '',
  created_at      timestamptz not null default now()
);

-- Ensure columns exist if table was already created earlier
alter table posts add column if not exists author_id uuid;
alter table posts add column if not exists author_name text default '';
alter table posts add column if not exists author_avatar text default '';

-- ── 2. LIKES ────────────────────────────────────────────────
create table if not exists likes (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  user_id     text not null,
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

-- ── 3. COMMENTS ─────────────────────────────────────────────
create table if not exists comments (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid not null references posts(id) on delete cascade,
  user_id          text not null,
  text             text not null,
  author_name      text not null default 'Anonymous',
  author_initials  text not null default 'AN',
  author_avatar    text not null default '',
  created_at       timestamptz not null default now()
);

alter table comments add column if not exists author_avatar text default '';

-- ── 4. INDEXES ──────────────────────────────────────────────
create index if not exists idx_posts_type        on posts(type);
create index if not exists idx_posts_status      on posts(status);
create index if not exists idx_posts_created_at  on posts(created_at desc);
create index if not exists idx_likes_post_id     on likes(post_id);
create index if not exists idx_comments_post_id  on comments(post_id);

-- ── 5. ROW LEVEL SECURITY ───────────────────────────────────
alter table posts    enable row level security;
alter table likes    enable row level security;
alter table comments enable row level security;

-- Posts
drop policy if exists "Public read posts" on posts;
drop policy if exists "Public insert posts" on posts;
drop policy if exists "Public update posts" on posts;
drop policy if exists "Public delete posts" on posts;
create policy "Public read posts"   on posts for select using (true);
create policy "Public insert posts" on posts for insert with check (true);
create policy "Public update posts" on posts for update using (true);
create policy "Public delete posts" on posts for delete using (true);

-- Likes
drop policy if exists "Public read likes" on likes;
drop policy if exists "Public insert likes" on likes;
drop policy if exists "Public delete likes" on likes;
create policy "Public read likes"   on likes for select using (true);
create policy "Public insert likes" on likes for insert with check (true);
create policy "Public delete likes" on likes for delete using (true);

-- Comments
drop policy if exists "Public read comments" on comments;
drop policy if exists "Public insert comments" on comments;
drop policy if exists "Public delete comments" on comments;
create policy "Public read comments"   on comments for select using (true);
create policy "Public insert comments" on comments for insert with check (true);
create policy "Public delete comments" on comments for delete using (true);

-- ── 6. HELPER VIEW: posts with like/comment counts ──────────
create or replace view posts_with_counts as
  select
    p.*,
    coalesce(l.like_count, 0)    as like_count,
    coalesce(c.comment_count, 0) as comment_count
  from posts p
  left join (
    select post_id, count(*) as like_count
    from likes
    group by post_id
  ) l on l.post_id = p.id
  left join (
    select post_id, count(*) as comment_count
    from comments
    group by post_id
  ) c on c.post_id = p.id;
