-- F0 — Fundação: schema inicial do Pauta
-- 13 entidades do PRD (seção 8) + RLS por workspace_id + pgvector

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Users (espelha auth.users; criado por trigger no signup)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null default 'Meu workspace',
  timezone text not null default 'America/Sao_Paulo',
  autopilot_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index workspaces_owner_idx on public.workspaces (owner_id);

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  logo_light_url text,
  logo_dark_url text,
  colors jsonb not null default '[]'::jsonb,
  font_title text,
  font_body text,
  voice_tone text check (voice_tone in ('formal', 'informativo', 'descontraido', 'provocativo')),
  voice_examples text[] not null default '{}',
  never_use text[] not null default '{}',
  handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel text not null,
  external_id text not null,
  handle text,
  access_token_encrypted text,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, channel, external_id)
);
create index social_accounts_workspace_idx on public.social_accounts (workspace_id);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null check (type in ('web_search', 'rss', 'site', 'google_news', 'trends')),
  url text,
  name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index sources_workspace_idx on public.sources (workspace_id);

create table public.keywords (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  term text not null,
  kind text not null check (kind in ('include', 'exclude')),
  weight numeric not null default 1,
  created_at timestamptz not null default now(),
  unique (workspace_id, term)
);
create index keywords_workspace_idx on public.keywords (workspace_id);

create table public.pautas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  cluster_id uuid,
  title text not null,
  summary text,
  source_urls text[] not null default '{}',
  citations jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  score numeric,
  status text not null default 'new' check (status in ('new', 'used', 'dismissed')),
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index pautas_workspace_status_idx on public.pautas (workspace_id, status);
create index pautas_embedding_idx on public.pautas using hnsw (embedding vector_cosine_ops);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  format text not null check (format in ('carousel', 'feed', 'story', 'reel')),
  name text not null,
  jsx_source text not null,
  slots jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  pauta_id uuid references public.pautas (id) on delete set null,
  format text not null check (format in ('carousel', 'feed', 'story', 'reel')),
  template_id uuid references public.templates (id) on delete set null,
  script jsonb not null default '{}'::jsonb,
  caption text,
  hashtags text[] not null default '{}',
  alt_text text,
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'assisted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_workspace_status_idx on public.posts (workspace_id, status);
create index posts_pauta_idx on public.posts (pauta_id);

create table public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  stage text not null check (stage in ('research', 'script', 'media', 'render')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  provider text,
  external_task_id text,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  cost numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index pipeline_runs_post_idx on public.pipeline_runs (post_id);
create index pipeline_runs_workspace_idx on public.pipeline_runs (workspace_id);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  "order" int not null default 0,
  type text not null check (type in ('image', 'video', 'cover', 'audio')),
  url text,
  width int,
  height int,
  duration_s numeric,
  provider text,
  created_at timestamptz not null default now()
);
create index media_assets_post_idx on public.media_assets (post_id);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  social_account_id uuid not null references public.social_accounts (id) on delete cascade,
  publish_at timestamptz not null,
  attempts int not null default 0,
  external_media_id text,
  error text,
  created_at timestamptz not null default now()
);
create index schedules_publish_at_idx on public.schedules (publish_at);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  collected_at timestamptz not null default now(),
  reach int,
  likes int,
  saves int,
  shares int,
  comments int
);
create index insights_post_idx on public.insights (post_id);

-- ---------------------------------------------------------------------------
-- Signup: cria public.users + workspace padrão
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name');

  insert into public.workspaces (owner_id, name)
  values (new.id, 'Meu workspace');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: tudo por workspace do dono
-- ---------------------------------------------------------------------------
create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = p_workspace_id and w.owner_id = auth.uid()
  );
$$;

alter table public.users enable row level security;
create policy users_select_own on public.users for select using (id = auth.uid());
create policy users_update_own on public.users for update using (id = auth.uid());

alter table public.workspaces enable row level security;
create policy workspaces_owner on public.workspaces for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.brand_kits enable row level security;
create policy brand_kits_owner on public.brand_kits for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.social_accounts enable row level security;
create policy social_accounts_owner on public.social_accounts for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.sources enable row level security;
create policy sources_owner on public.sources for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.keywords enable row level security;
create policy keywords_owner on public.keywords for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.pautas enable row level security;
create policy pautas_owner on public.pautas for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.templates enable row level security;
create policy templates_read on public.templates for select
  using (is_system or workspace_id is null or public.is_workspace_owner(workspace_id));
create policy templates_write on public.templates for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.posts enable row level security;
create policy posts_owner on public.posts for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.pipeline_runs enable row level security;
create policy pipeline_runs_owner on public.pipeline_runs for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.media_assets enable row level security;
create policy media_assets_owner on public.media_assets for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.schedules enable row level security;
create policy schedules_owner on public.schedules for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

alter table public.insights enable row level security;
create policy insights_owner on public.insights for all
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

-- ---------------------------------------------------------------------------
-- RPC: pega schedules vencidos com lock (publicação sem duplicar)
-- O cron chama via service role (bypassa RLS).
-- ---------------------------------------------------------------------------
create or replace function public.claim_due_schedules(p_now timestamptz, p_limit int default 10)
returns setof public.schedules
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.schedules s
  set attempts = s.attempts + 1
  where s.id in (
    select id from public.schedules
    where publish_at <= p_now
    order by publish_at
    limit p_limit
    for update skip locked
  )
  returning s.*;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: bucket público para assets da marca (logos, templates)
-- Convenção de path: {workspace_id}/{arquivo}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

create policy "brand_assets_public_read" on storage.objects
  for select using (bucket_id = 'brand-assets');

create policy "brand_assets_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'brand-assets'
    and public.is_workspace_owner((storage.foldername(name))[1]::uuid)
  );

create policy "brand_assets_owner_update" on storage.objects
  for update using (
    bucket_id = 'brand-assets'
    and public.is_workspace_owner((storage.foldername(name))[1]::uuid)
  );

create policy "brand_assets_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'brand-assets'
    and public.is_workspace_owner((storage.foldername(name))[1]::uuid)
  );
