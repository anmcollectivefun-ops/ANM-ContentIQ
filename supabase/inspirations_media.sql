-- Persistent image and video previews for ContentIQ inspirations.
-- Run once in the Supabase SQL editor.

alter table contentiq.inspirations
  add column if not exists media jsonb not null default '[]'::jsonb;

comment on column contentiq.inspirations.media is
  'Media metadata used by inspiration cards, templates and scheduling.';
