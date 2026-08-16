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
  claimer_id      text default '',
  claimer_name    text default '',
  created_at      timestamptz not null default now()
);

alter table posts add column if not exists author_id uuid;
alter table posts add column if not exists author_name text default '';
alter table posts add column if not exists author_avatar text default '';
alter table posts add column if not exists claimer_id text default '';
alter table posts add column if not exists claimer_name text default '';

create table if not exists likes (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  user_id     text not null,
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

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

create index if not exists idx_posts_type        on posts(type);
create index if not exists idx_posts_status      on posts(status);
create index if not exists idx_posts_created_at  on posts(created_at desc);
create index if not exists idx_likes_post_id     on likes(post_id);
create index if not exists idx_comments_post_id  on comments(post_id);

alter table posts    enable row level security;
alter table likes    enable row level security;
alter table comments enable row level security;

drop policy if exists "Public read posts" on posts;
drop policy if exists "Public insert posts" on posts;
drop policy if exists "Public update posts" on posts;
drop policy if exists "Public delete posts" on posts;
drop policy if exists "Authenticated insert posts" on posts;
drop policy if exists "Owner update posts" on posts;
drop policy if exists "Owner delete posts" on posts;

create policy "Public read posts"           on posts for select using (true);
create policy "Authenticated insert posts" on posts for insert with check (auth.role() = 'authenticated');
create policy "Public update posts"         on posts for update using (true);
create policy "Owner delete posts"         on posts for delete using (auth.uid() = author_id);

drop policy if exists "Public read likes" on likes;
drop policy if exists "Public insert likes" on likes;
drop policy if exists "Public delete likes" on likes;
drop policy if exists "Authenticated insert likes" on likes;
drop policy if exists "Owner delete likes" on likes;

create policy "Public read likes"           on likes for select using (true);
create policy "Authenticated insert likes" on likes for insert with check (auth.role() = 'authenticated');
create policy "Owner delete likes"         on likes for delete using (auth.uid()::text = user_id);

drop policy if exists "Public read comments" on comments;
drop policy if exists "Public insert comments" on comments;
drop policy if exists "Public delete comments" on comments;
drop policy if exists "Authenticated insert comments" on comments;
drop policy if exists "Owner delete comments" on comments;

create policy "Public read comments"           on comments for select using (true);
create policy "Authenticated insert comments" on comments for insert with check (auth.role() = 'authenticated');
create policy "Owner delete comments"         on comments for delete using (auth.uid()::text = user_id);

create table if not exists messages (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid references posts(id) on delete cascade,
  sender_id      text not null,
  sender_name    text not null default '',
  sender_avatar  text not null default '',
  receiver_id    text not null default '',
  text           text not null,
  read           boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table messages add column if not exists post_id uuid references posts(id) on delete cascade;
alter table messages add column if not exists sender_id text default '';
alter table messages add column if not exists sender_name text default '';
alter table messages add column if not exists sender_avatar text default '';
alter table messages add column if not exists receiver_id text default '';
alter table messages add column if not exists text text default '';
alter table messages add column if not exists conversation_id text;
alter table messages alter column conversation_id drop not null;

create table if not exists notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null,
  actor_id       text not null default '',
  actor_name     text not null default 'Someone',
  actor_avatar   text not null default '',
  type           text not null default 'like',
  post_id        uuid references posts(id) on delete cascade,
  post_title     text not null default '',
  content        text not null default '',
  read           boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table notifications add column if not exists user_id text default '';
alter table notifications add column if not exists actor_id text default '';
alter table notifications add column if not exists actor_name text default 'Someone';
alter table notifications add column if not exists actor_avatar text default '';
alter table notifications add column if not exists type text default 'like';
alter table notifications add column if not exists post_id uuid references posts(id) on delete cascade;
alter table notifications add column if not exists post_title text default '';
alter table notifications add column if not exists content text default '';
alter table notifications add column if not exists read boolean default false;

create table if not exists claims (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references posts(id) on delete cascade,
  user_id      text not null,
  user_name    text not null default 'Campus Member',
  user_avatar  text not null default '',
  claim_type   text not null default 'claim',
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_messages_participants on messages(sender_id, receiver_id);
create index if not exists idx_messages_post_id      on messages(post_id);
create index if not exists idx_notifications_user_id on notifications(user_id, read);
create index if not exists idx_claims_user_id        on claims(user_id);
create index if not exists idx_claims_post_id        on claims(post_id);

alter table messages      enable row level security;
alter table notifications enable row level security;
alter table claims        enable row level security;

drop policy if exists "Public read messages" on messages;
drop policy if exists "Authenticated insert messages" on messages;
create policy "Public read messages" on messages for select using (true);
create policy "Authenticated insert messages" on messages for insert with check (auth.role() = 'authenticated');

drop policy if exists "Public read notifications" on notifications;
drop policy if exists "Public insert notifications" on notifications;
drop policy if exists "Public update notifications" on notifications;
create policy "Public read notifications" on notifications for select using (true);
create policy "Public insert notifications" on notifications for insert with check (true);
create policy "Public update notifications" on notifications for update using (true);

drop policy if exists "Public read claims" on claims;
drop policy if exists "Public insert claims" on claims;
drop policy if exists "Public delete claims" on claims;
create policy "Public read claims"   on claims for select using (true);
create policy "Public insert claims" on claims for insert with check (true);
create policy "Public delete claims" on claims for delete using (true);

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
