-- SRY-037 / M0018
-- Batch delivery preparation must create a personal link only when the active
-- guest has no active capability at the moment of the mutation. M0013's
-- replacement function intentionally revokes an active link, which remains
-- correct for the explicit one-time owner replacement flow but is unsafe for a
-- batch "prepare missing" action. This function preserves the active link
-- under concurrent owner actions and returns a stable server-only conflict.

begin;

create function public.create_personal_guest_link_if_none_active_for_server(
  target_guest_id uuid,
  new_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_guest public.guests%rowtype;
  new_link_id uuid;
begin
  if new_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Guest link token hash is invalid.';
  end if;

  select *
  into target_guest
  from public.guests as guest
  where guest.id = target_guest_id
    and guest.deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Active guest is not available for a personal link.';
  end if;

  if exists (
    select 1
    from public.guest_links as link
    where link.guest_id = target_guest.id
      and link.status = 'active'::public.guest_link_status
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'An active personal guest link already exists.';
  end if;

  insert into public.guest_links (guest_id, token_hash)
  values (target_guest.id, new_token_hash)
  returning id into new_link_id;

  return new_link_id;
end;
$$;

revoke all on function public.create_personal_guest_link_if_none_active_for_server(uuid, text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.create_personal_guest_link_if_none_active_for_server(uuid, text) to service_role';
  end if;
end;
$$;

commit;
