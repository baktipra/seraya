-- SRY-038 / M0019
-- Adds encrypted, versioned owner re-access material for capability links created
-- after this release. token_hash remains the sole public authorization lookup.
-- Existing hashed-only links remain valid legacy links and are never rewritten.

begin;

alter table public.guest_links
  add column token_ciphertext text,
  add column token_key_version integer;

alter table public.guest_links
  add constraint guest_links_token_ciphertext_pair_check check (
    (token_ciphertext is null and token_key_version is null)
    or (
      token_ciphertext is not null
      and char_length(token_ciphertext) between 24 and 4096
      and token_key_version between 1 and 2147483647
    )
  );

-- Explicit owner-only replacement with encrypted material. The legacy two-arg
-- authority remains for historical compatibility; all SRY-038 application paths
-- use this function so new links are recoverable server-side only.
create function public.replace_personal_guest_link_with_ciphertext_for_server(
  target_guest_id uuid,
  new_token_hash text,
  new_token_ciphertext text,
  new_token_key_version integer
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
  if new_token_hash !~ '^[0-9a-f]{64}$'
    or new_token_ciphertext is null
    or char_length(new_token_ciphertext) not between 24 and 4096
    or new_token_key_version is null
    or new_token_key_version not between 1 and 2147483647 then
    raise exception using
      errcode = '22023',
      message = 'Guest link capability material is invalid.';
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

  update public.guest_links
  set status = 'revoked'::public.guest_link_status,
      revoked_at = coalesce(revoked_at, now())
  where guest_id = target_guest.id
    and status = 'active'::public.guest_link_status;

  insert into public.guest_links (
    guest_id,
    token_hash,
    token_ciphertext,
    token_key_version
  )
  values (
    target_guest.id,
    new_token_hash,
    new_token_ciphertext,
    new_token_key_version
  )
  returning id into new_link_id;

  return new_link_id;
end;
$$;

create function public.create_personal_guest_link_if_none_active_with_ciphertext_for_server(
  target_guest_id uuid,
  new_token_hash text,
  new_token_ciphertext text,
  new_token_key_version integer
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
  if new_token_hash !~ '^[0-9a-f]{64}$'
    or new_token_ciphertext is null
    or char_length(new_token_ciphertext) not between 24 and 4096
    or new_token_key_version is null
    or new_token_key_version not between 1 and 2147483647 then
    raise exception using
      errcode = '22023',
      message = 'Guest link capability material is invalid.';
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

  insert into public.guest_links (
    guest_id,
    token_hash,
    token_ciphertext,
    token_key_version
  )
  values (
    target_guest.id,
    new_token_hash,
    new_token_ciphertext,
    new_token_key_version
  )
  returning id into new_link_id;

  return new_link_id;
end;
$$;

revoke all on function public.replace_personal_guest_link_with_ciphertext_for_server(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.create_personal_guest_link_if_none_active_with_ciphertext_for_server(uuid, text, text, integer) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.replace_personal_guest_link_with_ciphertext_for_server(uuid, text, text, integer) to service_role';
    execute 'grant execute on function public.create_personal_guest_link_if_none_active_with_ciphertext_for_server(uuid, text, text, integer) to service_role';
  end if;
end;
$$;

commit;
