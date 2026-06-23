-- SRY-012 / M0012
-- Private guest-list foundation. Guest records are owner-scoped through their
-- parent project and never form part of public invitation snapshots.

begin;

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  display_name text not null,
  group_label text,
  party_size smallint not null default 1,
  rsvp_status public.rsvp_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint guests_display_name_present check (char_length(btrim(display_name)) between 1 and 120),
  constraint guests_group_label_length check (
    group_label is null or char_length(btrim(group_label)) between 1 and 40
  ),
  constraint guests_party_size_range check (party_size between 1 and 20)
);

create index guests_project_id_active_idx
on public.guests (project_id)
where deleted_at is null;

-- Normalize direct server-side writes too. Browser roles have no mutation
-- grants, but this keeps the persisted product contract stable for controlled
-- server paths and future maintenance tooling.
create function public.normalize_guest_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  new.display_name := btrim(new.display_name);
  new.group_label := nullif(btrim(new.group_label), '');
  return new;
end;
$$;

revoke all on function public.normalize_guest_fields() from public, anon, authenticated;

create trigger guests_normalize_fields
before insert or update of display_name, group_label on public.guests
for each row
execute function public.normalize_guest_fields();

create trigger guests_set_updated_at
before update on public.guests
for each row
execute function public.set_updated_at();

alter table public.guests enable row level security;

-- Direct browser mutations stay closed. Controlled server actions validate
-- current ownership first and use the server-only boundary for mutations.
revoke all on table public.guests from anon, authenticated;
grant select on table public.guests to authenticated;

create policy guests_select_own_active_project
on public.guests
for select
to authenticated
using (
  guests.deleted_at is null
  and exists (
    select 1
    from public.wedding_projects as project
    where project.id = guests.project_id
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  )
);

commit;
