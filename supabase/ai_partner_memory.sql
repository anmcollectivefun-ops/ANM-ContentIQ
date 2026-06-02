-- AI Partner memory for ANM ContentIQ.
-- Stores creator style profile and learning snapshots in the `contentiq` schema.

create schema if not exists contentiq;

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

create index if not exists creator_style_profiles_workspace_id_idx
  on contentiq.creator_style_profiles(workspace_id);

create index if not exists ai_learnings_workspace_id_idx
  on contentiq.ai_learnings(workspace_id);

create index if not exists ai_learnings_type_idx
  on contentiq.ai_learnings(type);

create index if not exists ai_learnings_platform_idx
  on contentiq.ai_learnings(platform);

alter table contentiq.creator_style_profiles enable row level security;
alter table contentiq.ai_learnings enable row level security;

drop policy if exists "via_workspace" on contentiq.creator_style_profiles;
drop policy if exists "via_workspace" on contentiq.ai_learnings;

create policy "via_workspace" on contentiq.creator_style_profiles
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

create policy "via_workspace" on contentiq.ai_learnings
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
