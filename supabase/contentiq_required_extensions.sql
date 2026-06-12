-- ANM ContentIQ - required app extension tables.
-- Run this after the base contentiq schema exists.
-- Templates use contentiq.content_drafts with status = 'template'.

create schema if not exists contentiq;

-- Content templates, drafts and Studio media metadata.
alter table contentiq.content_drafts
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table contentiq.inspirations
  add column if not exists media jsonb not null default '[]'::jsonb;

create table if not exists contentiq.media_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references contentiq.workspaces(id) on delete cascade,
  draft_id uuid references contentiq.content_drafts(id) on delete cascade,
  scheduled_post_id uuid references contentiq.scheduled_posts(id) on delete set null,
  storage_bucket text not null default 'content-temp-media',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null,
  asset_type text not null check (asset_type in ('image', 'video', 'audio', 'document')),
  status text not null default 'temporary' check (status in ('temporary', 'scheduled', 'published', 'deleted')),
  platform_asset_id text,
  platform_post_id text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists media_assets_workspace_id_idx on contentiq.media_assets(workspace_id);
create index if not exists media_assets_draft_id_idx on contentiq.media_assets(draft_id);
create index if not exists media_assets_scheduled_post_id_idx on contentiq.media_assets(scheduled_post_id);

-- Manual links used as account/post context until full API metrics are available.
create table if not exists contentiq.manual_links (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references contentiq.platform_connections(id) on delete cascade,
  type text not null check (type in ('account', 'post')),
  url text not null,
  title text,
  created_at timestamptz default now()
);

create index if not exists manual_links_connection_id_idx on contentiq.manual_links(connection_id);

-- Brand Voice settings.
create table if not exists contentiq.brand_voice (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references contentiq.workspaces(id) on delete cascade,
  tone text default '',
  style text default '',
  target_audience text default '',
  keywords text[] default '{}',
  avoid_words text[] default '{}',
  example_posts text[] default '{}',
  brand_values text default '',
  cta_style text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists brand_voice_workspace_id_idx on contentiq.brand_voice(workspace_id);

-- AI partner memory.
create table if not exists contentiq.creator_style_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references contentiq.workspaces(id) on delete cascade,
  summary text,
  tone text,
  style text,
  audience text,
  strengths text[] default '{}',
  avoid_patterns text[] default '{}',
  platform_notes jsonb not null default '{}'::jsonb,
  experiment_queue text[] default '{}',
  confidence integer not null default 0 check (confidence >= 0 and confidence <= 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contentiq.ai_learnings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references contentiq.workspaces(id) on delete cascade,
  type text not null,
  platform text,
  insight text not null,
  evidence jsonb not null default '{}'::jsonb,
  confidence integer not null default 0 check (confidence >= 0 and confidence <= 100),
  dismissed boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists creator_style_profiles_workspace_id_idx on contentiq.creator_style_profiles(workspace_id);
create index if not exists ai_learnings_workspace_id_idx on contentiq.ai_learnings(workspace_id);
create index if not exists ai_learnings_type_idx on contentiq.ai_learnings(type);
create index if not exists ai_learnings_platform_idx on contentiq.ai_learnings(platform);

-- Optional metadata table for generated Creative Studio images.
-- The app can still display images without this table; use it when we persist generated assets.
create table if not exists contentiq.creative_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references contentiq.workspaces(id) on delete cascade,
  draft_id uuid references contentiq.content_drafts(id) on delete set null,
  platform text,
  asset_type text,
  aspect_ratio text,
  provider text not null default 'google',
  model text,
  prompt text not null,
  negative_prompt text,
  storage_bucket text,
  storage_path text,
  generation_text text,
  created_at timestamptz default now()
);

create index if not exists creative_generations_workspace_id_idx on contentiq.creative_generations(workspace_id);
create index if not exists creative_generations_draft_id_idx on contentiq.creative_generations(draft_id);

alter table contentiq.media_assets enable row level security;
alter table contentiq.manual_links enable row level security;
alter table contentiq.brand_voice enable row level security;
alter table contentiq.creator_style_profiles enable row level security;
alter table contentiq.ai_learnings enable row level security;
alter table contentiq.creative_generations enable row level security;

drop policy if exists "via_workspace" on contentiq.media_assets;
create policy "via_workspace" on contentiq.media_assets
  for all
  using (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()))
  with check (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()));

drop policy if exists "via_connection" on contentiq.manual_links;
create policy "via_connection" on contentiq.manual_links
  for all
  using (
    connection_id in (
      select pc.id
      from contentiq.platform_connections pc
      join contentiq.workspaces w on w.id = pc.workspace_id
      where w.user_id = auth.uid()
    )
  )
  with check (
    connection_id in (
      select pc.id
      from contentiq.platform_connections pc
      join contentiq.workspaces w on w.id = pc.workspace_id
      where w.user_id = auth.uid()
    )
  );

drop policy if exists "via_workspace" on contentiq.brand_voice;
create policy "via_workspace" on contentiq.brand_voice
  for all
  using (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()))
  with check (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()));

drop policy if exists "via_workspace" on contentiq.creator_style_profiles;
create policy "via_workspace" on contentiq.creator_style_profiles
  for all
  using (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()))
  with check (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()));

drop policy if exists "via_workspace" on contentiq.ai_learnings;
create policy "via_workspace" on contentiq.ai_learnings
  for all
  using (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()))
  with check (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()));

drop policy if exists "via_workspace" on contentiq.creative_generations;
create policy "via_workspace" on contentiq.creative_generations
  for all
  using (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()))
  with check (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()));

-- Storage bucket for uploaded media from Content Studio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-temp-media',
  'content-temp-media',
  false,
  262144000,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "content_temp_media_authenticated_select" on storage.objects;
drop policy if exists "content_temp_media_authenticated_insert" on storage.objects;
drop policy if exists "content_temp_media_authenticated_update" on storage.objects;
drop policy if exists "content_temp_media_authenticated_delete" on storage.objects;

create policy "content_temp_media_authenticated_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'content-temp-media');

create policy "content_temp_media_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'content-temp-media');

create policy "content_temp_media_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'content-temp-media')
  with check (bucket_id = 'content-temp-media');

create policy "content_temp_media_authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'content-temp-media');

grant usage on schema contentiq to anon, authenticated;
grant select, insert, update, delete on all tables in schema contentiq to authenticated;
grant usage, select on all sequences in schema contentiq to authenticated;
