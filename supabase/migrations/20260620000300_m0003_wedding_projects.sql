-- SRY-003 / M0003
-- Project ownership foundation only. Invitation, guest, payment, media, and publishing tables stay out of scope.

begin;

create table public.wedding_projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete restrict,
  slug text not null,
  status public.project_status not null default 'draft',
  selected_template_id text,
  selected_theme_preset_id text,
  default_timezone text not null default 'Asia/Jakarta',
  event_date_primary date,
  publish_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint wedding_projects_slug_format check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 96
  ),
  constraint wedding_projects_publish_window check (
    expires_at is null
    or publish_at is null
    or expires_at > publish_at
  )
);

create unique index wedding_projects_slug_unique_idx
on public.wedding_projects (lower(slug));

create index wedding_projects_account_id_active_idx
on public.wedding_projects (account_id)
where deleted_at is null;

create trigger wedding_projects_set_updated_at
before update on public.wedding_projects
for each row
execute function public.set_updated_at();

alter table public.wedding_projects enable row level security;

revoke all on table public.wedding_projects from anon, authenticated;
grant select on table public.wedding_projects to authenticated;
grant insert (
  account_id,
  slug,
  selected_template_id,
  selected_theme_preset_id,
  default_timezone,
  event_date_primary,
  publish_at,
  expires_at
) on table public.wedding_projects to authenticated;
grant update (
  slug,
  selected_template_id,
  selected_theme_preset_id,
  default_timezone,
  event_date_primary,
  publish_at,
  expires_at,
  deleted_at
) on table public.wedding_projects to authenticated;

create policy wedding_projects_select_own
on public.wedding_projects
for select
to authenticated
using ((select auth.uid()) = account_id);

create policy wedding_projects_insert_own_active
on public.wedding_projects
for insert
to authenticated
with check (
  (select auth.uid()) = account_id
  and deleted_at is null
);

create policy wedding_projects_update_own_active
on public.wedding_projects
for update
to authenticated
using (
  (select auth.uid()) = account_id
  and deleted_at is null
)
with check ((select auth.uid()) = account_id);

commit;
