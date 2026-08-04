-- Runtime Palette Activation & Persistence V4D / M0022
-- Keeps palette selection inside the validated invitation draft and immutable
-- publication snapshot. No guest, project, or capability table is expanded.

begin;

create or replace function public.publish_invitation_snapshot(target_project_id uuid)
returns table(
  id uuid,
  project_id uuid,
  slug citext,
  revision integer,
  template_id text,
  draft_schema_version integer,
  snapshot jsonb,
  is_current boolean,
  published_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  target_project public.wedding_projects%rowtype;
  verified_payment public.payment_transactions%rowtype;
  active_draft public.invitation_drafts%rowtype;
  selected_template_key text;
  selected_palette_key text;
  snapshot_draft jsonb;
  snapshot_payload jsonb;
  next_revision integer;
  inserted_snapshot public.published_invitation_snapshots%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to publish an invitation.';
  end if;

  select *
  into target_project
  from public.wedding_projects as project
  where project.id = target_project_id
    and project.deleted_at is null
  for update;

  if not found or target_project.account_id <> (select auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'Project is not available for publication.';
  end if;

  select *
  into verified_payment
  from public.payment_transactions as payment
  where payment.project_id = target_project.id
    and payment.provider = 'midtrans_snap'
    and payment.product_code = 'invitation_activation'
    and payment.status = 'paid'::public.payment_status
    and payment.paid_at is not null
  order by payment.paid_at desc, payment.created_at desc
  limit 1
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'A verified payment is required before publication.';
  end if;

  if target_project.event_date_primary is null then
    raise exception using
      errcode = '22023',
      message = 'Project event date is required before publication.';
  end if;

  select *
  into active_draft
  from public.invitation_drafts as draft
  where draft.project_id = target_project.id
    and draft.deleted_at is null;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'An active invitation draft is required before publication.';
  end if;

  if jsonb_typeof(active_draft.content) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Invitation draft content must be an object.';
  end if;

  if public.invitation_draft_content_contains_raw_html(active_draft.content) then
    raise exception using
      errcode = '22023',
      message = 'Invitation draft content cannot contain raw HTML.';
  end if;

  selected_template_key := coalesce(active_draft.content ->> 'templateKey', 'roselle');

  if selected_template_key not in ('roselle', 'aruna', 'laras') then
    raise exception using
      errcode = '22023',
      message = 'Invitation template is not supported.';
  end if;

  selected_palette_key := coalesce(
    active_draft.content ->> 'paletteKey',
    case selected_template_key
      when 'roselle' then 'rose'
      when 'aruna' then 'stone'
      when 'laras' then 'midnight'
    end
  );

  if not (
    (selected_template_key = 'roselle' and selected_palette_key in ('rose', 'sage', 'butter', 'berry'))
    or (selected_template_key = 'aruna' and selected_palette_key in ('stone', 'matcha', 'cobalt', 'apricot'))
    or (selected_template_key = 'laras' and selected_palette_key in ('midnight', 'burgundy', 'emerald', 'ivory'))
  ) then
    raise exception using
      errcode = '22023',
      message = 'Invitation palette is not supported for the selected template.';
  end if;

  perform public.validate_invitation_draft_gallery_media(target_project.id, active_draft.content);

  snapshot_draft := jsonb_set(
    jsonb_set(
      active_draft.content,
      '{templateKey}',
      to_jsonb(selected_template_key),
      true
    ),
    '{paletteKey}',
    to_jsonb(selected_palette_key),
    true
  );

  snapshot_payload := jsonb_build_object(
    'project', jsonb_build_object(
      'slug', target_project.slug,
      'eventDatePrimary', target_project.event_date_primary::text,
      'eventCity', target_project.event_city,
      'timezone', target_project.default_timezone
    ),
    'draft', snapshot_draft
  );

  if public.invitation_draft_content_contains_raw_html(snapshot_payload) then
    raise exception using
      errcode = '22023',
      message = 'Published invitation snapshot cannot contain raw HTML.';
  end if;

  select coalesce(max(existing_snapshot.revision), 0) + 1
  into next_revision
  from public.published_invitation_snapshots as existing_snapshot
  where existing_snapshot.project_id = target_project.id;

  update public.published_invitation_snapshots as existing_current
  set is_current = false
  where existing_current.project_id = target_project.id
    and existing_current.is_current = true;

  insert into public.published_invitation_snapshots (
    project_id,
    slug,
    revision,
    template_id,
    draft_schema_version,
    snapshot,
    is_current
  )
  values (
    target_project.id,
    target_project.slug,
    next_revision,
    selected_template_key,
    active_draft.schema_version,
    snapshot_payload,
    true
  )
  returning * into inserted_snapshot;

  update public.wedding_projects as published_project
  set status = 'published'::public.project_status
  where published_project.id = target_project.id;

  return query
  select
    inserted_snapshot.id,
    inserted_snapshot.project_id,
    inserted_snapshot.slug,
    inserted_snapshot.revision,
    inserted_snapshot.template_id,
    inserted_snapshot.draft_schema_version,
    inserted_snapshot.snapshot,
    inserted_snapshot.is_current,
    inserted_snapshot.published_at,
    inserted_snapshot.created_at;
end;
$function$;

commit;
