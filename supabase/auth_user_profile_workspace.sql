-- Creates app records whenever a new Supabase Auth user is created.
-- Auth accounts themselves are stored by Supabase in auth.users.
-- This trigger mirrors basic user data into public.profiles and creates
-- a private ContentIQ workspace for the user.

create schema if not exists contentiq;

-- Workspaces are private per user, so the same friendly slug can exist
-- for multiple test accounts. RLS keeps each user's rows separated.
alter table if exists contentiq.workspaces
  drop constraint if exists workspaces_slug_key;

create unique index if not exists workspaces_user_id_slug_key
  on contentiq.workspaces(user_id, slug);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, contentiq
as $$
declare
  workspace_slug text;
begin
  insert into public.profiles (id, email, username, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'preferred_username',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  workspace_slug := 'anm-collective-' || left(replace(new.id::text, '-', ''), 8);

  insert into contentiq.workspaces (user_id, name, type, slug)
  values (new.id, 'ANM Collective', 'Firma', workspace_slug)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant select, update on public.profiles to authenticated;
