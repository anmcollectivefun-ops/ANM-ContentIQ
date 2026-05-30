create schema if not exists contentiq;

create table if not exists contentiq.platform_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  platform text not null check (
    platform in ('instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'blog')
  ),
  account_id text not null,
  account_name text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform, account_id)
);

alter table contentiq.platform_connections enable row level security;

  create policy "Authenticated users can read platform connections"
  on contentiq.platform_connections
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert platform connections"
  on contentiq.platform_connections
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update platform connections"
  on contentiq.platform_connections
  for update
  to authenticated
  using (true)
  with check (true);

create index if not exists platform_connections_workspace_idx
  on contentiq.platform_connections (workspace_id);

create index if not exists platform_connections_platform_idx
  on contentiq.platform_connections (platform);
