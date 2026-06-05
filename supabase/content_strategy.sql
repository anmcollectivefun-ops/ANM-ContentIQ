-- ============================================================
-- ContentIQ - AI Strategist
-- Schema: contentiq
-- ============================================================

create table if not exists contentiq.content_strategies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references contentiq.workspaces(id) on delete cascade,
  title text not null,
  period_start date not null,
  period_end date not null,
  main_goal text,
  positioning text,
  ai_summary text,
  source_context jsonb,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contentiq.content_strategy_items (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references contentiq.content_strategies(id) on delete cascade,
  workspace_id uuid not null references contentiq.workspaces(id) on delete cascade,
  week integer,
  publish_date date not null,
  publish_time time,
  platform text not null,
  content_kind text not null,
  title text not null,
  angle text,
  format text,
  description text,
  source_recommendation text,
  status text not null default 'planned',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table contentiq.content_strategies enable row level security;
alter table contentiq.content_strategy_items enable row level security;

drop policy if exists "Users can read content strategies" on contentiq.content_strategies;
drop policy if exists "Users can insert content strategies" on contentiq.content_strategies;
drop policy if exists "Users can update content strategies" on contentiq.content_strategies;
drop policy if exists "Users can delete content strategies" on contentiq.content_strategies;

create policy "Users can read content strategies"
on contentiq.content_strategies
for select
to authenticated
using (
  workspace_id in (
    select id from contentiq.workspaces where user_id = auth.uid()
  )
);

create policy "Users can insert content strategies"
on contentiq.content_strategies
for insert
to authenticated
with check (
  workspace_id in (
    select id from contentiq.workspaces where user_id = auth.uid()
  )
);

create policy "Users can update content strategies"
on contentiq.content_strategies
for update
to authenticated
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

create policy "Users can delete content strategies"
on contentiq.content_strategies
for delete
to authenticated
using (
  workspace_id in (
    select id from contentiq.workspaces where user_id = auth.uid()
  )
);

drop policy if exists "Users can read content strategy items" on contentiq.content_strategy_items;
drop policy if exists "Users can insert content strategy items" on contentiq.content_strategy_items;
drop policy if exists "Users can update content strategy items" on contentiq.content_strategy_items;
drop policy if exists "Users can delete content strategy items" on contentiq.content_strategy_items;

create policy "Users can read content strategy items"
on contentiq.content_strategy_items
for select
to authenticated
using (
  workspace_id in (
    select id from contentiq.workspaces where user_id = auth.uid()
  )
);

create policy "Users can insert content strategy items"
on contentiq.content_strategy_items
for insert
to authenticated
with check (
  workspace_id in (
    select id from contentiq.workspaces where user_id = auth.uid()
  )
);

create policy "Users can update content strategy items"
on contentiq.content_strategy_items
for update
to authenticated
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

create policy "Users can delete content strategy items"
on contentiq.content_strategy_items
for delete
to authenticated
using (
  workspace_id in (
    select id from contentiq.workspaces where user_id = auth.uid()
  )
);

create index if not exists content_strategies_workspace_status_idx
on contentiq.content_strategies(workspace_id, status, period_start);

create index if not exists content_strategy_items_strategy_idx
on contentiq.content_strategy_items(strategy_id);

create index if not exists content_strategy_items_workspace_date_idx
on contentiq.content_strategy_items(workspace_id, publish_date);
