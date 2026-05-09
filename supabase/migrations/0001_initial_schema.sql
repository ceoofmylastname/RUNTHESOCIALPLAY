-- =====================================================================
-- 0001_initial_schema.sql
-- RTAIP SOCIAL — initial schema
--
-- Mirrors @rtaip/shared Zod schemas. The Zod schema is the source of
-- truth for shape; this migration is the source of truth for storage,
-- indexes, and RLS.
--
-- v0.1: solo-creator tenancy (one row per auth.users.id).
--       workspace_id will be promoted in a later migration when teams ship.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------
-- 1. brand_skills — one row per user, the live current config.
-- ----------------------------------------------------------------------
create table public.brand_skills (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  config        jsonb not null,                          -- BrandSkill (minus characters[])
  version       int not null default 1,
  is_complete   boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id)
);

create index brand_skills_user_id_idx on public.brand_skills (user_id);

-- ----------------------------------------------------------------------
-- 2. brand_skill_versions — immutable snapshot per save.
--    post_jobs.brand_skill_version_id FKs here so old posts always resolve.
-- ----------------------------------------------------------------------
create table public.brand_skill_versions (
  id              uuid primary key default gen_random_uuid(),
  brand_skill_id  uuid not null references public.brand_skills(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  version         int not null,
  config          jsonb not null,                        -- full BrandSkill snapshot
  saved_at        timestamptz not null default now(),
  unique (brand_skill_id, version)
);

create index brand_skill_versions_user_id_idx on public.brand_skill_versions (user_id);
create index brand_skill_versions_brand_skill_id_idx on public.brand_skill_versions (brand_skill_id);

-- ----------------------------------------------------------------------
-- 3. brand_assets — logos, fonts, mood-board images, character portraits.
-- ----------------------------------------------------------------------
create table public.brand_assets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text not null check (kind in (
    'logo-primary','logo-mono','logo-icon',
    'font-heading','font-body',
    'mood-board','character-portrait'
  )),
  storage_path    text not null,                         -- Supabase Storage object path
  mime_type       text not null,
  width           int,
  height          int,
  file_size_bytes int,
  created_at      timestamptz not null default now()
);

create index brand_assets_user_id_idx on public.brand_assets (user_id);
create index brand_assets_user_kind_idx on public.brand_assets (user_id, kind);

-- ----------------------------------------------------------------------
-- 4. brand_characters — UGC actors, identity-locked via Higgsfield SOUL.
-- ----------------------------------------------------------------------
create table public.brand_characters (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  slug               text not null,
  archetype          text not null,
  specifics          text,
  default_scene      text,
  soul_job_id        text not null,
  soul_prompt        text not null,
  portrait_asset_id  uuid references public.brand_assets(id) on delete set null,
  tags               text[] not null default '{}',
  created_at         timestamptz not null default now(),
  unique (user_id, slug)
);

create index brand_characters_user_id_idx on public.brand_characters (user_id);

-- ----------------------------------------------------------------------
-- 5. post_jobs — generation jobs.
--    brand_skill_version_id snapshot pointer = reproducibility.
-- ----------------------------------------------------------------------
create table public.post_jobs (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  brand_skill_version_id   uuid not null references public.brand_skill_versions(id) on delete restrict,
  topic                    text not null,
  post_kind                text not null check (post_kind in ('single_image','carousel','reel','ad')),
  platforms                jsonb not null,                -- [{platform, format, is_priority}]
  character_id             uuid references public.brand_characters(id) on delete set null,
  status                   text not null default 'queued'
                           check (status in ('queued','running','complete','partial','failed')),
  current_stage            text check (current_stage in ('brief','copy','visual_prompt','render','composite','bundle')),
  estimated_credits        int,
  actual_credits_used      int,
  bundle                   jsonb,                         -- final PostBundle
  failures                 jsonb not null default '[]',
  trigger_run_id           text,                          -- Trigger.dev run id
  created_at               timestamptz not null default now(),
  started_at               timestamptz,
  completed_at             timestamptz
);

create index post_jobs_user_id_idx on public.post_jobs (user_id);
create index post_jobs_status_idx on public.post_jobs (status);
create index post_jobs_created_at_idx on public.post_jobs (created_at desc);

-- ----------------------------------------------------------------------
-- 6. post_assets — composited per (platform, format).
-- ----------------------------------------------------------------------
create table public.post_assets (
  id              uuid primary key default gen_random_uuid(),
  post_job_id     uuid not null references public.post_jobs(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  platform        text not null,
  format          text not null,
  asset_kind      text not null check (asset_kind in ('image','video','pdf-carousel')),
  storage_path    text not null,
  width           int,
  height          int,
  duration_s      real,
  file_size_bytes int,
  created_at      timestamptz not null default now()
);

create index post_assets_post_job_id_idx on public.post_assets (post_job_id);
create index post_assets_user_id_idx on public.post_assets (user_id);

-- ----------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger brand_skills_set_updated_at
  before update on public.brand_skills
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------
-- Row-Level Security
--
-- Service role bypasses RLS by default (used by apps/jobs workers).
-- Web-app authenticated users only see their own rows.
-- ----------------------------------------------------------------------

alter table public.brand_skills          enable row level security;
alter table public.brand_skill_versions  enable row level security;
alter table public.brand_assets          enable row level security;
alter table public.brand_characters      enable row level security;
alter table public.post_jobs             enable row level security;
alter table public.post_assets           enable row level security;

-- brand_skills
create policy "users read own brand_skills"
  on public.brand_skills for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own brand_skills"
  on public.brand_skills for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own brand_skills"
  on public.brand_skills for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- brand_skill_versions (read-only for users; workers do the inserts)
create policy "users read own brand_skill_versions"
  on public.brand_skill_versions for select
  to authenticated
  using (auth.uid() = user_id);

-- brand_assets
create policy "users read own brand_assets"
  on public.brand_assets for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own brand_assets"
  on public.brand_assets for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users delete own brand_assets"
  on public.brand_assets for delete
  to authenticated
  using (auth.uid() = user_id);

-- brand_characters
create policy "users read own brand_characters"
  on public.brand_characters for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own brand_characters"
  on public.brand_characters for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own brand_characters"
  on public.brand_characters for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own brand_characters"
  on public.brand_characters for delete
  to authenticated
  using (auth.uid() = user_id);

-- post_jobs (users can read + create; workers update)
create policy "users read own post_jobs"
  on public.post_jobs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own post_jobs"
  on public.post_jobs for insert
  to authenticated
  with check (auth.uid() = user_id);

-- post_assets (read-only for users; workers do inserts)
create policy "users read own post_assets"
  on public.post_assets for select
  to authenticated
  using (auth.uid() = user_id);
