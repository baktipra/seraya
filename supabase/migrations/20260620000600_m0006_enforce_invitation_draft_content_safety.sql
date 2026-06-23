-- SRY-006 / M0006
-- Database-level invariant: invitation draft JSONB content cannot persist literal raw HTML.
-- This intentionally guards only raw HTML storage, while Zod remains responsible for the
-- full application-level invitation draft contract.

begin;

create function public.invitation_draft_content_contains_raw_html(content_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  child_value jsonb;
  text_value text;
begin
  case jsonb_typeof(content_value)
    when 'string' then
      text_value := content_value #>> '{}';

      return text_value ~* '(<[[:space:]]*/?[[:alpha:]][^>]*>)|(<!--)|(<!doctype[[:space:]]+html([[:space:]>]|$))';
    when 'array' then
      for child_value in
        select element.value
        from jsonb_array_elements(content_value) as element(value)
      loop
        if public.invitation_draft_content_contains_raw_html(child_value) then
          return true;
        end if;
      end loop;
    when 'object' then
      for child_value in
        select entry.value
        from jsonb_each(content_value) as entry(key, value)
      loop
        if public.invitation_draft_content_contains_raw_html(child_value) then
          return true;
        end if;
      end loop;
    else
      return false;
  end case;

  return false;
end;
$$;

create function public.enforce_invitation_draft_content_safety()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if public.invitation_draft_content_contains_raw_html(new.content) then
    raise exception using
      errcode = '22023',
      message = 'Invitation draft content cannot contain raw HTML.';
  end if;

  return new;
end;
$$;

revoke all on function public.invitation_draft_content_contains_raw_html(jsonb) from public, anon, authenticated;
revoke all on function public.enforce_invitation_draft_content_safety() from public, anon, authenticated;

create trigger invitation_drafts_enforce_content_safety
before insert or update of content on public.invitation_drafts
for each row
execute function public.enforce_invitation_draft_content_safety();

commit;
