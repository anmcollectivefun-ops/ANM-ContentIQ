-- Reference migration for the existing ANM ContentIQ schema.
-- The live project stores this table in the `contentiq` schema and uses
-- contentiq.workspaces.id (UUID) as platform_connections.workspace_id.

create schema if not exists contentiq;

create table if not exists contentiq.platform_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references contentiq.workspaces(id) on delete cascade,
  platform text not null,
  account_name text,
  account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  connected boolean default false,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists platform_connections_workspace_id_idx
  on contentiq.platform_connections(workspace_id);

alter table contentiq.platform_connections enable row level security;
