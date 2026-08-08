create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  site_key text primary key default 'default',
  content jsonb not null,
  version bigint not null default 1,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content_drafts (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'default',
  updated_by uuid not null references auth.users(id) on delete cascade,
  content jsonb not null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_key, updated_by)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null check (storage_bucket in ('site-media', 'submission-media')),
  storage_path text not null unique,
  original_name text,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  checksum text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  age text not null,
  school text not null,
  image_asset_id uuid not null references public.media_assets(id),
  alt_image_asset_id uuid references public.media_assets(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  approved_card jsonb
);

create index if not exists submissions_status_submitted_idx on public.submissions(status, submitted_at desc);

create or replace function public.is_admin_or_editor()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'editor')); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'); $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch before update on public.site_content for each row execute function public.touch_updated_at();
drop trigger if exists site_draft_touch on public.site_content_drafts;
create trigger site_draft_touch before update on public.site_content_drafts for each row execute function public.touch_updated_at();

alter table public.user_roles enable row level security;
alter table public.site_content enable row level security;
alter table public.site_content_drafts enable row level security;
alter table public.media_assets enable row level security;
alter table public.submissions enable row level security;

drop policy if exists published_content_read on public.site_content;
create policy published_content_read on public.site_content for select using (site_key = 'default');
drop policy if exists content_admin_write on public.site_content;
create policy content_admin_write on public.site_content for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists draft_owner_read_write on public.site_content_drafts;
create policy draft_owner_read_write on public.site_content_drafts for all using (auth.uid() = updated_by and public.is_admin_or_editor()) with check (auth.uid() = updated_by and public.is_admin_or_editor());

drop policy if exists media_admin_read_write on public.media_assets;
create policy media_admin_read_write on public.media_assets for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
drop policy if exists submissions_public_insert on public.submissions;
create policy submissions_public_insert on public.submissions for insert with check (status = 'pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists submissions_admin_read on public.submissions;
create policy submissions_admin_read on public.submissions for select using (public.is_admin_or_editor());
drop policy if exists submissions_admin_update on public.submissions;
create policy submissions_admin_update on public.submissions for update using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

create or replace function public.reject_submission(submission_id uuid, review_note text default '')
returns public.submissions language plpgsql security invoker as $$
declare result public.submissions;
begin
  update public.submissions set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = reject_submission.review_note
  where id = submission_id and status = 'pending' returning * into result;
  if result.id is null then raise exception 'Submission not found or already reviewed'; end if;
  return result;
end;
$$;

create or replace function public.approve_submission(submission_id uuid, card_payload jsonb)
returns public.submissions language plpgsql security invoker as $$
declare result public.submissions;
begin
  update public.submissions set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), approved_card = card_payload
  where id = submission_id and status = 'pending' returning * into result;
  if result.id is null then raise exception 'Submission not found or already reviewed'; end if;
  return result;
end;
$$;
