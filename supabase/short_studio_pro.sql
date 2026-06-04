-- ANM ContentIQ - Short Studio Pro.
-- Run after the base contentiq schema exists.

create schema if not exists contentiq;

create table if not exists contentiq.short_video_uploads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references contentiq.workspaces(id) on delete cascade,
  user_id uuid not null,
  storage_bucket text not null default 'contentiq-temp-videos',
  storage_path text not null,
  public_url text,
  file_name text not null,
  mime_type text not null,
  file_size bigint,
  duration_seconds integer,
  status text not null default 'uploaded_temp'
    check (status in (
      'uploaded_temp',
      'analyzed',
      'template_ready',
      'publishing',
      'published_external',
      'deleted_local',
      'expired'
    )),
  ai_transcript text,
  ai_visual_summary text,
  ai_detected_topic text,
  ai_suggested_hook text,
  ai_suggested_caption text,
  ai_suggested_hashtags text[],
  external_platform text,
  external_post_id text,
  external_post_url text,
  published_at timestamptz,
  deleted_local_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contentiq.short_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references contentiq.workspaces(id) on delete cascade,
  user_id uuid not null,
  source_upload_id uuid references contentiq.short_video_uploads(id) on delete set null,
  title text not null,
  platform text,
  hook text,
  caption text,
  hashtags text[],
  script text,
  on_screen_text jsonb,
  shots jsonb,
  thumbnail_text text,
  ai_summary text,
  video_storage_path text,
  video_public_url text,
  external_platform text,
  external_post_id text,
  external_post_url text,
  published_at timestamptz,
  status text not null default 'template_ready'
    check (status in (
      'uploaded_temp',
      'analyzed',
      'template_ready',
      'publishing',
      'published_external',
      'deleted_local',
      'expired'
    )),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists short_video_uploads_workspace_id_idx
  on contentiq.short_video_uploads(workspace_id);

create index if not exists short_video_uploads_user_id_idx
  on contentiq.short_video_uploads(user_id);

create index if not exists short_video_uploads_status_idx
  on contentiq.short_video_uploads(status);

create index if not exists short_templates_workspace_id_idx
  on contentiq.short_templates(workspace_id);

create index if not exists short_templates_user_id_idx
  on contentiq.short_templates(user_id);

create index if not exists short_templates_source_upload_id_idx
  on contentiq.short_templates(source_upload_id);

create index if not exists short_templates_platform_idx
  on contentiq.short_templates(platform);

alter table contentiq.short_video_uploads enable row level security;
alter table contentiq.short_templates enable row level security;

drop policy if exists "via_workspace" on contentiq.short_video_uploads;
create policy "via_workspace" on contentiq.short_video_uploads
  for all
  using (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()))
  with check (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()));

drop policy if exists "via_workspace" on contentiq.short_templates;
create policy "via_workspace" on contentiq.short_templates
  for all
  using (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()))
  with check (workspace_id in (select id from contentiq.workspaces where user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contentiq-temp-videos',
  'contentiq-temp-videos',
  false,
  104857600,
  array[
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

drop policy if exists "contentiq_temp_videos_authenticated_select" on storage.objects;
drop policy if exists "contentiq_temp_videos_authenticated_insert" on storage.objects;
drop policy if exists "contentiq_temp_videos_authenticated_update" on storage.objects;
drop policy if exists "contentiq_temp_videos_authenticated_delete" on storage.objects;

create policy "contentiq_temp_videos_authenticated_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'contentiq-temp-videos');

create policy "contentiq_temp_videos_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contentiq-temp-videos');

create policy "contentiq_temp_videos_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'contentiq-temp-videos')
  with check (bucket_id = 'contentiq-temp-videos');

create policy "contentiq_temp_videos_authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'contentiq-temp-videos');

grant usage on schema contentiq to anon, authenticated;
grant select, insert, update, delete on all tables in schema contentiq to authenticated;
grant usage, select on all sequences in schema contentiq to authenticated;
