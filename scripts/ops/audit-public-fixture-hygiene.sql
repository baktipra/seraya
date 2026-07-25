-- SERAYA — J1R-A Public Fixture Hygiene V1
--
-- Read-only release gate for the canonical public demo fixture.
-- Run with a privileged Postgres connection before invitation release checks:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f scripts/ops/audit-public-fixture-hygiene.sql
--
-- The fixture is deliberately narrow. It must remain a neutral, non-customer
-- invitation used only for public and personal route smoke tests. This script
-- never prints guest names, phone numbers, messages, tokens, or account data.

begin;
set local transaction read only;

DO $audit$
DECLARE
  fixture_project_id uuid;
  current_snapshot_count integer;
  violation_count integer;
BEGIN
  SELECT id
  INTO fixture_project_id
  FROM public.wedding_projects
  WHERE lower(slug) = 'seraya-demo'
    AND deleted_at IS NULL;

  IF fixture_project_id IS NULL THEN
    RAISE EXCEPTION 'J1R-A failed: canonical seraya-demo project is missing.';
  END IF;

  SELECT count(*)
  INTO current_snapshot_count
  FROM public.published_invitation_snapshots
  WHERE project_id = fixture_project_id
    AND is_current;

  IF current_snapshot_count <> 1 THEN
    RAISE EXCEPTION
      'J1R-A failed: expected exactly one current seraya-demo snapshot, found %.',
      current_snapshot_count;
  END IF;

  SELECT count(*)
  INTO violation_count
  FROM public.wedding_projects project
  JOIN public.published_invitation_snapshots snapshot
    ON snapshot.project_id = project.id
   AND snapshot.is_current
  WHERE project.id = fixture_project_id
    AND (
      project.status::text <> 'published'
      OR project.person_one_name <> 'Raka'
      OR project.person_two_name <> 'Nadia'
      OR project.event_city <> 'Jakarta'
      OR project.event_date_primary <> DATE '2027-08-17'
      OR snapshot.slug::text <> 'seraya-demo'
      OR snapshot.template_id <> 'laras'
      OR snapshot.snapshot #>> '{draft,hero,title}' <> 'Raka & Nadia'
      OR snapshot.snapshot #>> '{draft,couple,personOne,displayName}' <> 'Raka'
      OR snapshot.snapshot #>> '{draft,couple,personTwo,displayName}' <> 'Nadia'
      OR coalesce((snapshot.snapshot #>> '{draft,gallery,enabled}')::boolean, true)
      OR jsonb_array_length(coalesce(snapshot.snapshot #> '{draft,gallery,imageIds}', '[]'::jsonb)) <> 0
      OR coalesce((snapshot.snapshot #>> '{draft,digitalGift,enabled}')::boolean, true)
      OR jsonb_array_length(coalesce(snapshot.snapshot #> '{draft,digitalGift,accounts}', '[]'::jsonb)) <> 0
      OR snapshot.snapshot::text ~* '(aaaa|bbbb|lorem|dummy|asdf|mbuh)'
      OR snapshot.snapshot::text ~ '[0-9]{8,}'
    );

  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'J1R-A failed: canonical public snapshot is not neutral.';
  END IF;

  SELECT count(*)
  INTO violation_count
  FROM public.invitation_drafts draft
  WHERE draft.project_id = fixture_project_id
    AND draft.deleted_at IS NULL
    AND (
      draft.content #>> '{hero,title}' <> 'Raka & Nadia'
      OR draft.content #>> '{couple,personOne,displayName}' <> 'Raka'
      OR draft.content #>> '{couple,personTwo,displayName}' <> 'Nadia'
      OR coalesce((draft.content #>> '{gallery,enabled}')::boolean, true)
      OR jsonb_array_length(coalesce(draft.content #> '{gallery,imageIds}', '[]'::jsonb)) <> 0
      OR coalesce((draft.content #>> '{digitalGift,enabled}')::boolean, true)
      OR jsonb_array_length(coalesce(draft.content #> '{digitalGift,accounts}', '[]'::jsonb)) <> 0
      OR draft.content::text ~* '(aaaa|bbbb|lorem|dummy|asdf|mbuh)'
      OR draft.content::text ~ '[0-9]{8,}'
    );

  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'J1R-A failed: canonical draft can republish unsafe fixture content.';
  END IF;

  SELECT count(*)
  INTO violation_count
  FROM public.guests guest
  WHERE guest.project_id = fixture_project_id
    AND guest.deleted_at IS NULL
    AND guest.whatsapp_phone_e164 IS NOT NULL;

  IF violation_count <> 0 THEN
    RAISE EXCEPTION
      'J1R-A failed: canonical fixture still stores % active WhatsApp number(s).',
      violation_count;
  END IF;

  SELECT count(*)
  INTO violation_count
  FROM public.guestbook_entries entry
  JOIN public.guests guest ON guest.id = entry.guest_id
  WHERE guest.project_id = fixture_project_id
    AND guest.deleted_at IS NULL
    AND entry.deleted_at IS NULL
    AND entry.message ~* '(aaaa|bbbb|lorem|dummy|asdf|mbuh)';

  IF violation_count <> 0 THEN
    RAISE EXCEPTION 'J1R-A failed: canonical fixture guestbook still contains placeholder copy.';
  END IF;

  RAISE NOTICE 'J1R-A PASS: seraya-demo is neutral and contains no active fixture phone numbers.';
END
$audit$;

rollback;
