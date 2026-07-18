-- SRY-043 / M0020
-- Exposes the encrypted create-if-none-active authority under a PostgREST-safe
-- identifier. M0019's original 68-character identifier is truncated by
-- PostgreSQL to 63 characters and therefore cannot be addressed reliably by
-- its source spelling through Supabase RPC.

begin;

create function public.create_personal_guest_link_with_ciphertext_for_server(
  target_guest_id uuid,
  new_token_hash text,
  new_token_ciphertext text,
  new_token_key_version integer
)
returns uuid
language sql
security definer
set search_path = pg_catalog
as $$
  select public.create_personal_guest_link_if_none_active_with_ciphertext_for_s(
    target_guest_id,
    new_token_hash,
    new_token_ciphertext,
    new_token_key_version
  )
$$;

revoke all on function public.create_personal_guest_link_with_ciphertext_for_server(uuid, text, text, integer) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.create_personal_guest_link_with_ciphertext_for_server(uuid, text, text, integer) to service_role';
  end if;
end;
$$;

commit;
