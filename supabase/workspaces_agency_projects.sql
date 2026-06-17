-- Agency-ready workspaces: one authenticated user can own many projects.
-- Every project/workspace keeps separate connections, posts, schedules and AI context.

create schema if not exists contentiq;

create extension if not exists pgcrypto;

create table if not exists contentiq.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'ANM Collective',
  type text not null default 'Firma',
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table contentiq.workspaces
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text not null default 'ANM Collective',
  add column if not exists type text not null default 'Firma',
  add column if not exists slug text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists contentiq.workspaces
  drop constraint if exists workspaces_slug_key;

create unique index if not exists workspaces_user_id_slug_key
  on contentiq.workspaces(user_id, slug);

alter table contentiq.workspaces enable row level security;

drop policy if exists "workspaces_select_own" on contentiq.workspaces;
create policy "workspaces_select_own" on contentiq.workspaces
  for select
  using (auth.uid() = user_id);

drop policy if exists "workspaces_insert_own" on contentiq.workspaces;
create policy "workspaces_insert_own" on contentiq.workspaces
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "workspaces_update_own" on contentiq.workspaces;
create policy "workspaces_update_own" on contentiq.workspaces
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workspaces_delete_own" on contentiq.workspaces;
create policy "workspaces_delete_own" on contentiq.workspaces
  for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on table contentiq.workspaces to authenticated;
