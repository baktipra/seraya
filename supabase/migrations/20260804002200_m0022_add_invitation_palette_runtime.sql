-- SERAYA V4D / M0022
-- Persist a validated invitation template key in draft JSON and immutable
-- published snapshots. Legacy drafts/snapshots without the JSON key resolve
-- to Roselle in application parsers; this migration only affects new drafts
-- and new publication snapshots.

begin;

alter table public.published_invitation_snapshots
  drop constraint published_invitation_snapshots_template_valid;

alter table public.published_invitation_snapshots
  add constraint published_invitation_snapshots_template_valid
  check (template_id in ('roselle', 'aruna', 'laras'));

-- M0005's trigger remains authoritative for project + draft creation. New
-- projects receive an explicit Roselle key; historical JSON documents are not
-- rewritten and stay backward-compatible through the strict application parser.
create or replace function public.create_default_invitation_draft()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.invitation_drafts (project_id, schema_version, content)
  values (
    new.id,
    1,
    jsonb_build_object(
      'templateKey', 'roselle',
      'paletteKey', 'rose',
      'meta', jsonb_build_object(
        'locale', 'id-ID',
        'timezone', new.default_timezone
      ),
      'hero', jsonb_build_object(
        'eyebrow', 'The Wedding Of',
        'title', concat(new.person_one_name, ' & ', new.person_two_name),
        'subtitle', null
      ),
      'couple', jsonb_build_object(
        'personOne', jsonb_build_object(
          'displayName', new.person_one_name,
          'fullName', null,
          'parentLine', null
        ),
        'personTwo', jsonb_build_object(
          'displayName', new.person_two_name,
          'fullName', null,
          'parentLine', null
        )
      ),
      'story', jsonb_build_object(
        'enabled', false,
        'heading', null,
        'body', null
      ),
      'events', jsonb_build_object(
        'enabled', true,
        'primaryDate', new.event_date_primary,
        'ceremony', jsonb_build_object(
          'enabled', false,
          'title', null,
          'date', null,
          'startTime', null,
          'endTime', null
        ),
        'reception', jsonb_build_object(
          'enabled', false,
          'title', null,
          'date', null,
          'startTime', null,
          'endTime', null
        )
      ),
      'location', jsonb_build_object(
        'enabled', false,
        'venueName', null,
        'address', null,
        'mapsUrl', null
      ),
      'gallery', jsonb_build_object(
        'enabled', false,
        'imageIds', jsonb_build_array()
      ),
      'rsvp', jsonb_build_object(
        'enabled', true,
        'heading', null,
        'lead', null
      ),
      'closing', jsonb_build_object(
        'enabled', false,
        'message', null,
        'signature', null
      )
    )
  );

  return new;
end;
$$;

-- M0011's database payment gate remains the only publication authority. The
-- function is replaced solely to derive the validated template key from the
-- active private draft and copy it into the immutable snapshot transaction.
create or replace function public.publish_invitation_snapshot(target_project_id uuid)
returns table (
  id uuid,
  project_id uuid,
  slug extensions.citext,
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
as $$
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

  selected_palette_key := active_draft.content ->> 'paletteKey';

  if selected_template_key = 'roselle' then
    if selected_palette_key not in ('rose', 'sage', 'butter', 'berry') then
      selected_palette_key := 'rose';
    end if;
  elsif selected_template_key = 'aruna' then
    if selected_palette_key not in ('stone', 'matcha', 'cobalt', 'apricot') then
      selected_palette_key := 'stone';
    end if;
  else
    if selected_palette_key not in ('midnight', 'burgundy', 'emerald', 'ivory') then
      selected_palette_key := 'midnight';
    end if;
  end if;

  perform public.validate_invitation_draft_gallery_media(target_project.id, active_draft.content);

  -- The immutable snapshot receives an explicit key even when publishing a
  -- legacy draft that lacks it. The active private draft is never rewritten by
  -- this publication path.
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
$$;

revoke all on function public.publish_invitation_snapshot(uuid) from public, anon;
grant execute on function public.publish_invitation_snapshot(uuid) to authenticated;

commit;
