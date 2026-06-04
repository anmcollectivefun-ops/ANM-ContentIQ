-- ANM ContentIQ - RLS fix for Short Studio Pro.
-- Run this if uploads fail with:
-- "new row violates row-level security policy"

alter table contentiq.short_video_uploads enable row level security;
alter table contentiq.short_templates enable row level security;

drop policy if exists "short_video_uploads_via_workspace" on contentiq.short_video_uploads;
create policy "short_video_uploads_via_workspace" on contentiq.short_video_uploads
  for all
  to authenticated
  using (
    user_id = auth.uid()
    and workspace_id in (
      select id
      from contentiq.workspaces
      where user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and workspace_id in (
      select id
      from contentiq.workspaces
      where user_id = auth.uid()
    )
  );

drop policy if exists "short_templates_via_workspace" on contentiq.short_templates;
create policy "short_templates_via_workspace" on contentiq.short_templates
  for all
  to authenticated
  using (
    user_id = auth.uid()
    and workspace_id in (
      select id
      from contentiq.workspaces
      where user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and workspace_id in (
      select id
      from contentiq.workspaces
      where user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contentiq-temp-videos',
  'contentiq-temp-videos',
  false,
  104857600,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "contentiq_temp_videos_select" on storage.objects;
drop policy if exists "contentiq_temp_videos_insert" on storage.objects;
drop policy if exists "contentiq_temp_videos_update" on storage.objects;
drop policy if exists "contentiq_temp_videos_delete" on storage.objects;

create policy "contentiq_temp_videos_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'contentiq-temp-videos');

create policy "contentiq_temp_videos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contentiq-temp-videos');

create policy "contentiq_temp_videos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'contentiq-temp-videos')
  with check (bucket_id = 'contentiq-temp-videos');

create policy "contentiq_temp_videos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'contentiq-temp-videos');

grant usage on schema contentiq to anon, authenticated;
grant select, insert, update, delete on all tables in schema contentiq to authenticated;
grant usage, select on all sequences in schema contentiq to authenticated;

-- Explicit grants for projects where these tables were created after older grants.
grant select, insert, update, delete on table contentiq.short_video_uploads to authenticated;
grant select, insert, update, delete on table contentiq.short_templates to authenticated;
grant select on table contentiq.workspaces to authenticated;

-- Keep future tables in this schema usable by authenticated users too.
alter default privileges in schema contentiq
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema contentiq
  grant usage, select on sequences to authenticated;
