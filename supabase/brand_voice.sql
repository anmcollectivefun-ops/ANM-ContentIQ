-- Reference migration for Brand Voice settings.
-- Run this in Supabase SQL editor for projects that use the `contentiq` schema.

create schema if not exists contentiq;

create table if not exists contentiq.brand_voice (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references contentiq.workspaces(id) on delete cascade,
  tone text default '',
  style text default '',
  target_audience text default '',
  keywords text[] default '{}',
  avoid_words text[] default '{}',
  example_posts text[] default '{}',
  brand_values text default '',
  cta_style text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (workspace_id)
);

create index if not exists brand_voice_workspace_id_idx
  on contentiq.brand_voice(workspace_id);

alter table contentiq.brand_voice enable row level security;

drop policy if exists "via_workspace" on contentiq.brand_voice;

create policy "via_workspace" on contentiq.brand_voice
  for all using (
    workspace_id in (
      select id from contentiq.workspaces where user_id = auth.uid()
    )
  )
  with check (
    workspace_id in (
      select id from contentiq.workspaces where user_id = auth.uid()
    )
  );
