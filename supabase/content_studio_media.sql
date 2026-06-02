-- Content Studio media and template support.
-- Run this in Supabase SQL editor after the base `contentiq` schema exists.

create schema if not exists contentiq;

alter table contentiq.content_drafts
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

create index if not exists media_assets_workspace_id_idx
  on contentiq.media_assets(workspace_id);

create index if not exists media_assets_draft_id_idx
  on contentiq.media_assets(draft_id);

create index if not exists media_assets_scheduled_post_id_idx
  on contentiq.media_assets(scheduled_post_id);

alter table contentiq.media_assets enable row level security;

drop policy if exists "via_workspace" on contentiq.media_assets;

create policy "via_workspace" on contentiq.media_assets
  for all
  using (
    workspace_id in (
      select id from contentiq.workspaces where user_id = auth.uid()
    )
  )
  with check (
    workspace_id in (
      select id from contentiq.workspaces where user_id = auth.uid()
    )
  );

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
