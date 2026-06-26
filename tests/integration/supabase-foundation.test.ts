import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { invitationDraftContentSchema } from '@/modules/invitations/invitation-draft.schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const migrationsDirectory = path.join(repositoryRoot, 'supabase', 'migrations');

const userA = '11111111-1111-1111-1111-111111111111';
const userB = '22222222-2222-2222-2222-222222222222';
const projectA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const projectB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

let database: PGlite;

async function executeMigrations(db: PGlite) {
  await db.exec(`
    create schema extensions;
    -- PGlite does not ship pgcrypto. This harness-only stand-in makes the
    -- M0013 resolver deterministic while production continues to use the real
    -- extensions.digest(..., 'sha256') installed by M0001. Node unit tests
    -- independently verify the actual SHA-256 implementation.
    create function extensions.digest(value text, algorithm text)
    returns bytea
    language plpgsql
    immutable
    strict
    as $$
    begin
      if algorithm <> 'sha256' then
        raise exception 'unsupported digest algorithm';
      end if;

      return decode(md5(value) || md5(reverse(value)), 'hex');
    end;
    $$;

    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );

    -- PGlite does not bundle Supabase Storage catalog tables. This minimal
    -- metadata-only stand-in lets M0008 exercise the real bucket migration;
    -- object bytes remain covered by server/service tests rather than PGlite.
    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null unique,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );

    create role anon nologin;
    create role authenticated nologin;

    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    let sql = await readFile(path.join(migrationsDirectory, migrationFile), 'utf8');

    // PGlite executes PostgreSQL RLS semantics but does not ship contrib extensions.
    // Local Supabase runs M0001's pgcrypto statement unchanged; this harness removes only
    // that unavailable extension command while applying every table, function, trigger,
    // privilege, policy, constraint, and index statement from repository migrations.
    sql = sql
      .replace(/^create extension if not exists pgcrypto with schema extensions;\n/m, '')
      .replace(/^create extension if not exists citext with schema extensions;\n/m, '')
      .replaceAll('extensions.citext', 'text');

    await db.exec(sql);
  }
}

async function impersonateAuthenticatedUser(db: PGlite, userId: string) {
  await db.exec('reset role;');
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`,
  );
}

async function impersonateAnonymousUser(db: PGlite) {
  await db.exec('reset role;');
  await db.exec(`select set_config('request.jwt.claim.sub', '', false); set role anon;`);
}

async function resetToDatabaseOwner(db: PGlite) {
  await db.exec('reset role;');
  await db.exec(`select set_config('request.jwt.claim.sub', '', false);`);
}

let verifiedPaymentSequence = 1;

async function createVerifiedPaidActivationPayment(db: PGlite, projectId: string, ownerId: string) {
  const fingerprint = verifiedPaymentSequence.toString(16).padStart(64, '0');
  const transactionId = `midtrans-paid-${verifiedPaymentSequence}`;
  verifiedPaymentSequence += 1;

  await resetToDatabaseOwner(db);
  const reserved = await db.query<{ id: string; provider_order_id: string }>(`
    select *
    from public.reserve_payment_checkout_attempt(
      '${projectId}', '${ownerId}', 'invitation_activation', 'v1', 99000, 'IDR'
    );
  `);
  const paymentId = reserved.rows[0]?.id;
  const orderId = reserved.rows[0]?.provider_order_id;

  if (!paymentId || !orderId) {
    throw new Error('Test payment reservation did not return an attempt.');
  }

  await db.query(`
    select * from public.start_payment_checkout_attempt(
      '${paymentId}', 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test-token'
    );
  `);

  await db.query(`
    select * from public.apply_verified_midtrans_payment_webhook(
      '${orderId}', 99000, 'IDR', '${fingerprint}', 'settlement', '200',
      '${transactionId}', 'bank_transfer', 'paid'::public.payment_status
    );
  `);

  return { orderId, paymentId };
}

async function createVerifiedActivationPaymentWithStatus(
  db: PGlite,
  projectId: string,
  ownerId: string,
  targetStatus: 'pending' | 'failed' | 'expired' | 'cancelled' | 'refunded',
) {
  const fingerprint = verifiedPaymentSequence.toString(16).padStart(64, '0');
  const transactionId = `midtrans-transition-${verifiedPaymentSequence}`;
  verifiedPaymentSequence += 1;

  await resetToDatabaseOwner(db);
  const reserved = await db.query<{ id: string; provider_order_id: string }>(`
    select * from public.reserve_payment_checkout_attempt(
      '${projectId}', '${ownerId}', 'invitation_activation', 'v1', 99000, 'IDR'
    );
  `);
  const paymentId = reserved.rows[0]?.id;
  const orderId = reserved.rows[0]?.provider_order_id;

  if (!paymentId || !orderId) {
    throw new Error('Test payment reservation did not return an attempt.');
  }

  await db.query(`
    select * from public.start_payment_checkout_attempt(
      '${paymentId}', 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test-token'
    );
  `);

  if (targetStatus === 'pending') {
    return { orderId, paymentId };
  }

  if (targetStatus === 'refunded') {
    const paidFingerprint = fingerprint.slice(0, 63) + 'a';
    await db.query(`
      select * from public.apply_verified_midtrans_payment_webhook(
        '${orderId}', 99000, 'IDR', '${paidFingerprint}', 'settlement', '200',
        '${transactionId}-paid', 'bank_transfer', 'paid'::public.payment_status
      );
    `);

    await db.query(`
      select * from public.apply_verified_midtrans_payment_webhook(
        '${orderId}', 99000, 'IDR', '${fingerprint}', 'refund', '200',
        '${transactionId}-refund', 'bank_transfer', 'refunded'::public.payment_status
      );
    `);

    return { orderId, paymentId };
  }

  const providerStatus =
    targetStatus === 'failed' ? 'deny' : targetStatus === 'expired' ? 'expire' : 'cancel';

  await db.query(`
    select * from public.apply_verified_midtrans_payment_webhook(
      '${orderId}', 99000, 'IDR', '${fingerprint}', '${providerStatus}', '200',
      '${transactionId}', 'bank_transfer', '${targetStatus}'::public.payment_status
    );
  `);

  return { orderId, paymentId };
}

function createRuntimePersonalGuestToken() {
  return randomBytes(32).toString('base64url');
}

async function createPersonalGuestLink(db: PGlite, guestId: string, token: string) {
  await resetToDatabaseOwner(db);
  await db.query(`
    select public.replace_personal_guest_link_for_server(
      '${guestId}',
      encode(extensions.digest('${token}', 'sha256'), 'hex')
    );
  `);
}

describe('SRY-003 through SRY-028 Supabase migrations, ownership, drafts, publication, media, payments, guests, personal links, RSVP, private contact data, and guestbook', () => {
  // Full Vitest runs compile the whole app beside this PGlite migration harness.
  // Allow the first cold database/migration setup enough room without weakening
  // any assertion or production behaviour.
  beforeEach(async () => {
    verifiedPaymentSequence = 1;
    database = new PGlite();
    await executeMigrations(database);

    await database.exec(`
      insert into auth.users (id, email, raw_user_meta_data)
      values
        ('${userA}', 'owner-a@example.test', '{"display_name":"Owner A"}'::jsonb),
        ('${userB}', 'owner-b@example.test', '{"display_name":"Owner B"}'::jsonb);

      insert into public.wedding_projects (
        id,
        account_id,
        slug,
        person_one_name,
        person_two_name,
        event_city,
        event_date_primary
      )
      values
        ('${projectA}', '${userA}', 'owner-a-wedding', 'Owner', 'A', 'Jakarta', '2026-12-12'),
        ('${projectB}', '${userB}', 'owner-b-wedding', 'Owner', 'B', 'Bandung', '2027-01-10');
    `);
  }, 30_000);

  afterEach(async () => {
    await database.close();
  });

  it('declares the exact locked enum contracts', async () => {
    const expected = {
      project_status: ['draft', 'awaiting_payment', 'paid', 'published', 'expired', 'archived'],
      payment_status: ['created', 'pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded'],
      guest_link_status: ['active', 'revoked', 'expired'],
      rsvp_status: ['pending', 'attending', 'declined'],
      media_status: ['uploaded', 'processing', 'ready', 'failed', 'deleted'],
    } as const;

    for (const [typeName, expectedValues] of Object.entries(expected)) {
      const result = await database.query<{ enum_values: string }>(`
        select string_agg(enumlabel, ',' order by enumsortorder) as enum_values
        from pg_enum
        where enumtypid = 'public.${typeName}'::regtype;
      `);

      expect(result.rows[0]?.enum_values.split(',')).toEqual(expectedValues);
    }
  });

  it('creates profiles from auth.users with a safe metadata fallback', async () => {
    const result = await database.query<{
      display_name: string | null;
      email: string | null;
      id: string;
    }>(`select id, email, display_name from public.profiles order by id`);

    expect(result.rows).toEqual([
      { id: userA, email: 'owner-a@example.test', display_name: 'Owner A' },
      { id: userB, email: 'owner-b@example.test', display_name: 'Owner B' },
    ]);

    await database.exec(`
      insert into auth.users (id, email, raw_user_meta_data)
      values ('33333333-3333-3333-3333-333333333333', 'metadata-free@example.test', '{}'::jsonb);
    `);

    const fallback = await database.query<{ display_name: string | null }>(`
      select display_name from public.profiles where id = '33333333-3333-3333-3333-333333333333'
    `);

    expect(fallback.rows).toEqual([{ display_name: null }]);
  });

  it('allows User A to read and update only User A profile', async () => {
    await impersonateAuthenticatedUser(database, userA);

    const visibleProfiles = await database.query<{ id: string }>(
      'select id from public.profiles order by id',
    );
    expect(visibleProfiles.rows).toEqual([{ id: userA }]);

    await database.exec(`
      update public.profiles
      set display_name = 'Owner A Updated'
      where id = '${userA}';
    `);

    const blockedUpdate = await database.query(
      `update public.profiles set display_name = 'Compromised' where id = '${userB}'`,
    );
    expect(blockedUpdate.affectedRows).toBe(0);

    await expect(
      database.query(`
        insert into public.profiles (id, email, display_name)
        values ('44444444-4444-4444-4444-444444444444', 'forged@example.test', 'Forged');
      `),
    ).rejects.toThrow(/permission denied/i);

    await resetToDatabaseOwner(database);
    const ownerB = await database.query<{ display_name: string | null }>(
      `select display_name from public.profiles where id = '${userB}'`,
    );
    expect(ownerB.rows).toEqual([{ display_name: 'Owner B' }]);
  });

  it('requires valid trimmed setup fields and owns new project defaults in the database', async () => {
    await impersonateAuthenticatedUser(database, userA);

    const created = await database.query<{
      account_id: string;
      default_timezone: string;
      event_city: string;
      event_date_primary: Date;
      id: string;
      person_one_name: string;
      person_two_name: string;
      status: string;
    }>(`
      insert into public.wedding_projects (
        account_id,
        slug,
        person_one_name,
        person_two_name,
        event_city,
        event_date_primary
      )
      values (
        '${userA}',
        'raka-nadia',
        'Raka',
        'Nadia',
        'Jakarta',
        '2027-08-17'
      )
      returning id, account_id, status, default_timezone, person_one_name, person_two_name, event_city, event_date_primary;
    `);

    expect(created.rows).toHaveLength(1);
    expect(created.rows[0]).toMatchObject({
      account_id: userA,
      default_timezone: 'Asia/Jakarta',
      event_city: 'Jakarta',
      event_date_primary: new Date('2027-08-17T00:00:00.000Z'),
      person_one_name: 'Raka',
      person_two_name: 'Nadia',
      status: 'draft',
    });

    await expect(
      database.query(`
        insert into public.wedding_projects (
          account_id,
          slug,
          person_one_name,
          person_two_name,
          event_city,
          event_date_primary
        )
        values ('${userA}', 'blank-city', 'Raka', 'Nadia', '   ', '2027-08-17');
      `),
    ).rejects.toThrow(/wedding_projects_event_city_valid/i);

    await expect(
      database.query(`
        insert into public.wedding_projects (
          account_id,
          slug,
          person_one_name,
          person_two_name,
          event_city,
          event_date_primary
        )
        values ('${userA}', 'padded-name', ' Raka', 'Nadia', 'Jakarta', '2027-08-17');
      `),
    ).rejects.toThrow(/wedding_projects_person_one_name_valid/i);
  });

  it('allows User A to create, read, update, and soft-delete only own projects', async () => {
    await impersonateAuthenticatedUser(database, userA);

    await expect(
      database.query(`
        insert into public.wedding_projects (
          account_id,
          slug,
          person_one_name,
          person_two_name,
          event_city,
          event_date_primary
        )
        values ('${userB}', 'attempted-owner-b-wedding', 'Owner', 'B', 'Bandung', '2027-08-17');
      `),
    ).rejects.toThrow(/row-level security/i);

    const visibleProjects = await database.query<{
      account_id: string;
      event_city: string;
      person_one_name: string;
    }>(
      'select account_id, person_one_name, event_city from public.wedding_projects order by account_id',
    );
    expect(visibleProjects.rows).toEqual([
      { account_id: userA, event_city: 'Jakarta', person_one_name: 'Owner' },
    ]);

    const ownUpdate = await database.query<{ slug: string }>(`
      update public.wedding_projects
      set slug = 'owner-a-wedding-updated'
      where id = '${projectA}'
      returning slug;
    `);
    expect(ownUpdate.rows).toEqual([{ slug: 'owner-a-wedding-updated' }]);

    const blockedUpdate = await database.query(
      `update public.wedding_projects set slug = 'owner-b-compromised' where id = '${projectB}'`,
    );
    expect(blockedUpdate.affectedRows).toBe(0);

    const softDeleted = await database.query(`
      update public.wedding_projects
      set deleted_at = now()
      where id = '${projectA}';
    `);
    expect(softDeleted.affectedRows).toBe(1);

    const activeDashboardProjects = await database.query<{ id: string }>(
      `select id from public.wedding_projects where account_id = '${userA}' and deleted_at is null`,
    );
    expect(activeDashboardProjects.rows).toEqual([]);

    await expect(
      database.query(`delete from public.wedding_projects where id = '${projectB}'`),
    ).rejects.toThrow(/permission denied/i);
  });

  it('creates exactly one valid default invitation draft with project-derived facts', async () => {
    await resetToDatabaseOwner(database);

    const drafts = await database.query<{
      content: {
        couple: { personOne: { displayName: string }; personTwo: { displayName: string } };
        events: { primaryDate: string | null };
        gallery: { imageIds: string[] };
        hero: { eyebrow: string | null; subtitle: string | null; title: string | null };
        location: { address: string | null; mapsUrl: string | null; venueName: string | null };
        meta: { locale: string; timezone: string };
        rsvp: { enabled: boolean };
      };
      project_id: string;
      schema_version: number;
    }>(`
      select project_id, schema_version, content
      from public.invitation_drafts
      where project_id = '${projectA}';
    `);

    expect(drafts.rows).toHaveLength(1);
    expect(() => invitationDraftContentSchema.parse(drafts.rows[0]?.content)).not.toThrow();
    expect(drafts.rows[0]).toMatchObject({
      content: {
        couple: {
          personOne: { displayName: 'Owner' },
          personTwo: { displayName: 'A' },
        },
        events: { primaryDate: '2026-12-12' },
        gallery: { imageIds: [] },
        hero: { eyebrow: 'The Wedding Of', subtitle: null, title: 'Owner & A' },
        location: { address: null, mapsUrl: null, venueName: null },
        meta: { locale: 'id-ID', timezone: 'Asia/Jakarta' },
        rsvp: { enabled: true },
      },
      project_id: projectA,
      schema_version: 1,
    });

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`
        insert into public.invitation_drafts (project_id, schema_version, content)
        values ('${projectA}', 1, '{}'::jsonb);
      `),
    ).rejects.toThrow(/invitation_drafts_one_active_per_project_idx|duplicate key/i);
  });

  it('rolls the project insert back when the default draft trigger cannot create a draft', async () => {
    await resetToDatabaseOwner(database);
    await database.exec(`
      create function public.fail_default_invitation_draft_for_test()
      returns trigger
      language plpgsql
      as $$
      begin
        raise exception 'default invitation draft failure';
      end;
      $$;

      create trigger invitation_drafts_fail_default_for_test
      before insert on public.invitation_drafts
      for each row
      execute function public.fail_default_invitation_draft_for_test();
    `);

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`
        insert into public.wedding_projects (
          account_id,
          slug,
          person_one_name,
          person_two_name,
          event_city,
          event_date_primary
        )
        values ('${userA}', 'transaction-rollback', 'Raka', 'Nadia', 'Jakarta', '2027-08-17');
      `),
    ).rejects.toThrow(/default invitation draft failure/i);

    await resetToDatabaseOwner(database);
    const persistedProject = await database.query<{ id: string }>(`
      select id from public.wedding_projects where slug = 'transaction-rollback';
    `);
    expect(persistedProject.rows).toEqual([]);
  });

  it('rejects raw HTML in direct project and invitation draft writes, then rolls unsafe project creation back', async () => {
    await impersonateAuthenticatedUser(database, userA);

    await expect(
      database.query(`
        insert into public.wedding_projects (
          account_id,
          slug,
          person_one_name,
          person_two_name,
          event_city,
          event_date_primary
        )
        values ('${userA}', 'unsafe-project-input', '<b>Raka</b>', 'Nadia', 'Jakarta', '2027-08-17');
      `),
    ).rejects.toThrow(/raw HTML/i);

    await resetToDatabaseOwner(database);
    const unsafeProjectState = await database.query<{
      draft_exists: boolean;
      project_exists: boolean;
    }>(`
      select
        exists (
          select 1
          from public.wedding_projects
          where slug = 'unsafe-project-input'
        ) as project_exists,
        exists (
          select 1
          from public.invitation_drafts as draft
          join public.wedding_projects as project on project.id = draft.project_id
          where project.slug = 'unsafe-project-input'
        ) as draft_exists;
    `);
    expect(unsafeProjectState.rows).toEqual([{ draft_exists: false, project_exists: false }]);

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`
        update public.invitation_drafts
        set content = jsonb_set(content, '{hero,title}', '"<script>alert(1)</script>"'::jsonb)
        where project_id = '${projectA}';
      `),
    ).rejects.toThrow(/raw HTML/i);

    await expect(
      database.query(`
        update public.invitation_drafts
        set content = jsonb_set(
          content,
          '{location,mapsUrl}',
          '"https://www.google.com/maps?q=<b>Jakarta</b>"'::jsonb
        )
        where project_id = '${projectA}';
      `),
    ).rejects.toThrow(/raw HTML/i);

    await expect(
      database.query(`
        update public.invitation_drafts
        set content = jsonb_set(content, '{closing,message}', '"<!doctype html>"'::jsonb)
        where project_id = '${projectA}';
      `),
    ).rejects.toThrow(/raw HTML/i);

    await database.exec(`
      update public.invitation_drafts
      set deleted_at = now()
      where project_id = '${projectA}';
    `);

    await expect(
      database.query(`
        insert into public.invitation_drafts (project_id, schema_version, content)
        values (
          '${projectA}',
          1,
          jsonb_build_object(
            'nested',
            jsonb_build_array(jsonb_build_object('message', '<!--unsafe comment-->'))
          )
        );
      `),
    ).rejects.toThrow(/raw HTML/i);

    await resetToDatabaseOwner(database);
    const unsafeDraftCount = await database.query<{ count: string }>(`
      select count(*)::text as count
      from public.invitation_drafts
      where project_id = '${projectA}';
    `);
    expect(unsafeDraftCount.rows).toEqual([{ count: '1' }]);
  });

  it('enforces invitation draft ownership, active-read scope, and anonymous denial through RLS', async () => {
    await impersonateAuthenticatedUser(database, userA);

    const visibleDrafts = await database.query<{ project_id: string }>(
      'select project_id from public.invitation_drafts order by project_id',
    );
    expect(visibleDrafts.rows).toEqual([{ project_id: projectA }]);

    const ownUpdate = await database.query<{ project_id: string }>(`
      update public.invitation_drafts
      set content = jsonb_set(content, '{hero,title}', '"Owner & A Updated"'::jsonb)
      where project_id = '${projectA}'
      returning project_id;
    `);
    expect(ownUpdate.rows).toEqual([{ project_id: projectA }]);

    const blockedUpdate = await database.query(`
      update public.invitation_drafts
      set content = jsonb_set(content, '{hero,title}', '"Compromised"'::jsonb)
      where project_id = '${projectB}';
    `);
    expect(blockedUpdate.affectedRows).toBe(0);

    await resetToDatabaseOwner(database);
    await database.exec(`
      update public.invitation_drafts
      set deleted_at = now()
      where project_id = '${projectB}';
    `);

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`
        insert into public.invitation_drafts (project_id, schema_version, content)
        values ('${projectB}', 1, '{}'::jsonb);
      `),
    ).rejects.toThrow(/row-level security/i);

    const softDeleted = await database.query(`
      update public.invitation_drafts
      set deleted_at = now()
      where project_id = '${projectA}';
    `);
    expect(softDeleted.affectedRows).toBe(1);

    const activeOwnDrafts = await database.query<{ project_id: string }>(`
      select project_id
      from public.invitation_drafts
      where project_id = '${projectA}' and deleted_at is null;
    `);
    expect(activeOwnDrafts.rows).toEqual([]);

    await impersonateAnonymousUser(database);
    await expect(database.query('select id from public.invitation_drafts')).rejects.toThrow(
      /permission denied/i,
    );
  });

  it('denies unauthenticated project access and enforces global slug uniqueness', async () => {
    await impersonateAnonymousUser(database);

    await expect(database.query('select id from public.wedding_projects')).rejects.toThrow(
      /permission denied/i,
    );

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`
        insert into public.wedding_projects (
          account_id,
          slug,
          person_one_name,
          person_two_name,
          event_city,
          event_date_primary
        )
        values ('${userA}', 'owner-a-wedding', 'Raka', 'Nadia', 'Jakarta', '2027-08-17');
      `),
    ).rejects.toThrow(/duplicate key/i);
  });

  it('publishes an owner project atomically with a current Roselle snapshot and published status', async () => {
    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);

    const published = await database.query<{
      draft_schema_version: number;
      is_current: boolean;
      revision: number;
      slug: string;
      snapshot: {
        draft: {
          couple: { personOne: { displayName: string }; personTwo: { displayName: string } };
        };
        project: { eventCity: string; eventDatePrimary: string; slug: string; timezone: string };
      };
      template_id: string;
    }>(`
      select slug, revision, template_id, draft_schema_version, snapshot, is_current
      from public.publish_invitation_snapshot('${projectA}');
    `);

    expect(published.rows).toHaveLength(1);
    expect(published.rows[0]).toMatchObject({
      draft_schema_version: 1,
      is_current: true,
      revision: 1,
      slug: 'owner-a-wedding',
      snapshot: {
        draft: {
          couple: {
            personOne: { displayName: 'Owner' },
            personTwo: { displayName: 'A' },
          },
        },
        project: {
          eventCity: 'Jakarta',
          eventDatePrimary: '2026-12-12',
          slug: 'owner-a-wedding',
          timezone: 'Asia/Jakarta',
        },
      },
      template_id: 'roselle',
    });

    await resetToDatabaseOwner(database);
    const persisted = await database.query<{
      current_count: string;
      status: string;
    }>(`
      select
        (select count(*)::text from public.published_invitation_snapshots where project_id = '${projectA}' and is_current) as current_count,
        (select status::text from public.wedding_projects where id = '${projectA}') as status;
    `);
    expect(persisted.rows).toEqual([{ current_count: '1', status: 'published' }]);
  });

  it('preserves the selected template immutably in snapshots and defaults new drafts to Roselle', async () => {
    await resetToDatabaseOwner(database);
    const defaultDraft = await database.query<{ template_key: string | null }>(`
      select content ->> 'templateKey' as template_key
      from public.invitation_drafts
      where project_id = '${projectA}' and deleted_at is null;
    `);
    expect(defaultDraft.rows).toEqual([{ template_key: 'roselle' }]);

    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await database.exec(`
      update public.invitation_drafts
      set content = jsonb_set(
        jsonb_set(content, '{templateKey}', '"aruna"'::jsonb),
        '{digitalGift}',
        '{"enabled":true,"heading":"Amplop pertama","lead":null,"accounts":[{"id":"11111111-1111-4111-8111-111111111111","providerName":"Bank Seraya","accountHolder":"Raka Pratama","accountNumber":"123456789012"}]}'::jsonb
      )
      where project_id = '${projectA}' and deleted_at is null;
    `);

    const firstPublication = await database.query<{
      snapshot_account_number: string | null;
      snapshot_template_key: string | null;
      template_id: string;
    }>(`
      select
        template_id,
        snapshot #>> '{draft,templateKey}' as snapshot_template_key,
        snapshot #>> '{draft,digitalGift,accounts,0,accountNumber}' as snapshot_account_number
      from public.publish_invitation_snapshot('${projectA}');
    `);
    expect(firstPublication.rows).toEqual([
      {
        snapshot_account_number: '123456789012',
        snapshot_template_key: 'aruna',
        template_id: 'aruna',
      },
    ]);

    await database.exec(`
      update public.invitation_drafts
      set content = jsonb_set(
        jsonb_set(content, '{templateKey}', '"laras"'::jsonb),
        '{digitalGift,accounts,0,accountNumber}',
        '"987654321098"'::jsonb
      )
      where project_id = '${projectA}' and deleted_at is null;
    `);

    await resetToDatabaseOwner(database);
    const beforeRepublish = await database.query<{
      snapshot_account_number: string | null;
      snapshot_template_key: string | null;
      template_id: string;
    }>(`
      select
        template_id,
        snapshot #>> '{draft,templateKey}' as snapshot_template_key,
        snapshot #>> '{draft,digitalGift,accounts,0,accountNumber}' as snapshot_account_number
      from public.published_invitation_snapshots
      where project_id = '${projectA}' and is_current;
    `);
    expect(beforeRepublish.rows).toEqual([
      {
        snapshot_account_number: '123456789012',
        snapshot_template_key: 'aruna',
        template_id: 'aruna',
      },
    ]);

    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);

    await resetToDatabaseOwner(database);
    const revisions = await database.query<{
      is_current: boolean;
      revision: number;
      snapshot_account_number: string | null;
      snapshot_template_key: string | null;
      template_id: string;
    }>(`
      select
        revision,
        is_current,
        template_id,
        snapshot #>> '{draft,templateKey}' as snapshot_template_key,
        snapshot #>> '{draft,digitalGift,accounts,0,accountNumber}' as snapshot_account_number
      from public.published_invitation_snapshots
      where project_id = '${projectA}'
      order by revision;
    `);
    expect(revisions.rows).toEqual([
      {
        is_current: false,
        revision: 1,
        snapshot_account_number: '123456789012',
        snapshot_template_key: 'aruna',
        template_id: 'aruna',
      },
      {
        is_current: true,
        revision: 2,
        snapshot_account_number: '987654321098',
        snapshot_template_key: 'laras',
        template_id: 'laras',
      },
    ]);

    await expect(
      database.query(`
        insert into public.published_invitation_snapshots (
          project_id, slug, revision, template_id, draft_schema_version, snapshot, is_current
        )
        values ('${projectB}', 'owner-b-wedding', 1, 'unsupported', 1, '{}'::jsonb, false);
      `),
    ).rejects.toThrow(/published_invitation_snapshots_template_valid|check constraint/i);
  });

  it('rolls publication back when the snapshot insert fails', async () => {
    await resetToDatabaseOwner(database);
    await database.exec(`
      create function public.fail_published_snapshot_for_test()
      returns trigger
      language plpgsql
      as $$
      begin
        raise exception 'published snapshot failure';
      end;
      $$;

      create trigger published_snapshots_fail_for_test
      before insert on public.published_invitation_snapshots
      for each row
      execute function public.fail_published_snapshot_for_test();
    `);

    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`select * from public.publish_invitation_snapshot('${projectA}')`),
    ).rejects.toThrow(/published snapshot failure/i);

    await resetToDatabaseOwner(database);
    const state = await database.query<{ snapshot_count: string; status: string }>(`
      select
        (select count(*)::text from public.published_invitation_snapshots where project_id = '${projectA}') as snapshot_count,
        (select status::text from public.wedding_projects where id = '${projectA}') as status;
    `);
    expect(state.rows).toEqual([{ snapshot_count: '0', status: 'draft' }]);
  });

  it('enforces publication ownership, direct-write denial, immutable snapshots, and safe republishing', async () => {
    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);

    await impersonateAuthenticatedUser(database, userB);
    await expect(
      database.query(`select * from public.publish_invitation_snapshot('${projectA}')`),
    ).rejects.toThrow(/not available for publication/i);

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`
        insert into public.published_invitation_snapshots (
          project_id, slug, revision, template_id, draft_schema_version, snapshot
        )
        values ('${projectA}', 'owner-a-wedding', 99, 'roselle', 1, '{}'::jsonb);
      `),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      database.query(`
        update public.published_invitation_snapshots
        set snapshot = '{}'::jsonb
        where project_id = '${projectA}';
      `),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      database.query(`
        delete from public.published_invitation_snapshots
        where project_id = '${projectA}';
      `),
    ).rejects.toThrow(/permission denied/i);

    await resetToDatabaseOwner(database);
    await expect(
      database.query(`
        update public.published_invitation_snapshots
        set snapshot = '{}'::jsonb
        where project_id = '${projectA}';
      `),
    ).rejects.toThrow(/immutable/i);

    const firstSnapshot = await database.query<{
      snapshot: { draft: { hero: { title: string | null } } };
    }>(`
      select snapshot
      from public.published_invitation_snapshots
      where project_id = '${projectA}' and revision = 1;
    `);
    expect(firstSnapshot.rows[0]?.snapshot.draft.hero.title).toBe('Owner & A');

    await impersonateAuthenticatedUser(database, userA);
    await database.exec(`
      update public.invitation_drafts
      set content = jsonb_set(content, '{hero,title}', '"Owner & A Baru"'::jsonb)
      where project_id = '${projectA}';
    `);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);

    await resetToDatabaseOwner(database);
    const revisions = await database.query<{
      is_current: boolean;
      revision: number;
      title: string | null;
    }>(`
      select
        revision,
        is_current,
        snapshot #>> '{draft,hero,title}' as title
      from public.published_invitation_snapshots
      where project_id = '${projectA}'
      order by revision;
    `);
    expect(revisions.rows).toEqual([
      { is_current: false, revision: 1, title: 'Owner & A' },
      { is_current: true, revision: 2, title: 'Owner & A Baru' },
    ]);

    await impersonateAnonymousUser(database);
    const anonymousCurrentOnly = await database.query<{ revision: number }>(`
      select revision
      from public.published_invitation_snapshots
      where project_id = '${projectA}'
      order by revision;
    `);
    expect(anonymousCurrentOnly.rows).toEqual([{ revision: 2 }]);
  });

  it('allows anonymous reads only for current snapshots of active published projects', async () => {
    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);

    await impersonateAnonymousUser(database);
    const publiclyVisible = await database.query<{ slug: string }>(`
      select slug::text as slug
      from public.published_invitation_snapshots
      order by slug;
    `);
    expect(publiclyVisible.rows).toEqual([{ slug: 'owner-a-wedding' }]);

    await resetToDatabaseOwner(database);
    await database.exec(`
      update public.wedding_projects
      set deleted_at = now()
      where id = '${projectA}';
    `);

    await impersonateAnonymousUser(database);
    const afterSoftDelete = await database.query<{ slug: string }>(`
      select slug::text as slug from public.published_invitation_snapshots;
    `);
    expect(afterSoftDelete.rows).toEqual([]);

    await expect(database.query(`select id from public.invitation_drafts`)).rejects.toThrow(
      /permission denied/i,
    );
  });

  it('rejects unsafe snapshot payloads through the database guard', async () => {
    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`
        select * from public.publish_invitation_snapshot('${projectA}');
      `),
    ).resolves.toBeDefined();

    await resetToDatabaseOwner(database);
    await expect(
      database.query(`
        insert into public.published_invitation_snapshots (
          project_id, slug, revision, template_id, draft_schema_version, snapshot
        )
        values (
          '${projectA}',
          'owner-a-wedding',
          2,
          'roselle',
          1,
          jsonb_build_object('project', jsonb_build_object('title', '<script>alert(1)</script>'))
        );
      `),
    ).rejects.toThrow(/raw HTML/i);
  });

  it('creates a private invitation-media bucket and enforces owner-only metadata reads with no browser mutations', async () => {
    const mediaAssetA = 'c1111111-1111-4111-8111-111111111111';

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.media_assets (
        id, project_id, storage_path, media_kind, mime_type, size_bytes
      )
      values (
        '${mediaAssetA}',
        '${projectA}',
        'projects/${projectA}/gallery/${mediaAssetA}.jpg',
        'gallery_image',
        'image/jpeg',
        12
      );
    `);

    const bucket = await database.query<{
      allowed_mime_types: string[];
      file_size_limit: string;
      public: boolean;
    }>(`
      select public, file_size_limit::text as file_size_limit, allowed_mime_types
      from storage.buckets
      where id = 'invitation-media';
    `);
    expect(bucket.rows).toEqual([
      {
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
        file_size_limit: '10485760',
        public: false,
      },
    ]);

    await impersonateAuthenticatedUser(database, userA);
    const ownerVisible = await database.query<{ id: string }>(`
      select id from public.media_assets order by id;
    `);
    expect(ownerVisible.rows).toEqual([{ id: mediaAssetA }]);

    await expect(
      database.query(`
        insert into public.media_assets (
          project_id, storage_path, media_kind, mime_type, size_bytes
        )
        values (
          '${projectA}',
          'projects/${projectA}/gallery/browser-write.jpg',
          'gallery_image',
          'image/jpeg',
          12
        );
      `),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      database.query(`
        update public.media_assets set status = 'failed' where id = '${mediaAssetA}';
      `),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      database.query(`delete from public.media_assets where id = '${mediaAssetA}';`),
    ).rejects.toThrow(/permission denied/i);

    await impersonateAuthenticatedUser(database, userB);
    const foreignVisible = await database.query<{ id: string }>(`
      select id from public.media_assets order by id;
    `);
    expect(foreignVisible.rows).toEqual([]);

    await impersonateAnonymousUser(database);
    await expect(database.query('select id from public.media_assets')).rejects.toThrow(
      /permission denied/i,
    );
  });

  it('finalizes ready gallery media atomically, enforces cap/duplicate safeguards, and freezes ready identity', async () => {
    const finalizedAsset = 'c2222222-2222-4222-8222-222222222222';
    const duplicateAsset = 'c3333333-3333-4333-8333-333333333333';
    const capAsset = 'c4444444-4444-4444-8444-444444444444';

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.media_assets (
        id, project_id, storage_path, media_kind, mime_type, size_bytes
      ) values
        (
          '${finalizedAsset}', '${projectA}',
          'projects/${projectA}/gallery/${finalizedAsset}.png',
          'gallery_image', 'image/png', 12
        ),
        (
          '${duplicateAsset}', '${projectA}',
          'projects/${projectA}/gallery/${duplicateAsset}.jpg',
          'gallery_image', 'image/jpeg', 12
        ),
        (
          '${capAsset}', '${projectA}',
          'projects/${projectA}/gallery/${capAsset}.webp',
          'gallery_image', 'image/webp', 12
        );
    `);

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`
        select public.finalize_gallery_media_asset('${finalizedAsset}', 'image/png', 12);
      `),
    ).rejects.toThrow(/permission denied/i);

    await resetToDatabaseOwner(database);
    await database.query(`
      select public.finalize_gallery_media_asset('${finalizedAsset}', 'image/png', 12);
    `);

    const finalized = await database.query<{
      content: { gallery: { enabled: boolean; imageIds: string[] } };
      status: string;
    }>(`
      select
        asset.status,
        draft.content
      from public.media_assets as asset
      join public.invitation_drafts as draft on draft.project_id = asset.project_id
      where asset.id = '${finalizedAsset}';
    `);
    expect(finalized.rows).toHaveLength(1);
    expect(finalized.rows[0]).toMatchObject({
      content: { gallery: { enabled: true, imageIds: [finalizedAsset] } },
      status: 'ready',
    });

    await expect(
      database.query(`
        update public.media_assets
        set storage_path = 'projects/${projectA}/gallery/changed.png'
        where id = '${finalizedAsset}';
      `),
    ).rejects.toThrow(/immutable/i);

    await database.exec(`
      update public.invitation_drafts
      set content = jsonb_set(
        content,
        '{gallery}',
        jsonb_build_object('enabled', true, 'imageIds', jsonb_build_array('${duplicateAsset}'))
      )
      where project_id = '${projectA}';
    `);
    await expect(
      database.query(`
        select public.finalize_gallery_media_asset('${duplicateAsset}', 'image/jpeg', 12);
      `),
    ).rejects.toThrow(/already attached/i);

    await database.exec(`
      update public.invitation_drafts
      set content = jsonb_set(
        content,
        '{gallery}',
        jsonb_build_object(
          'enabled', true,
          'imageIds', jsonb_build_array(
            '10000000-0000-4000-8000-000000000001',
            '10000000-0000-4000-8000-000000000002',
            '10000000-0000-4000-8000-000000000003',
            '10000000-0000-4000-8000-000000000004',
            '10000000-0000-4000-8000-000000000005',
            '10000000-0000-4000-8000-000000000006',
            '10000000-0000-4000-8000-000000000007',
            '10000000-0000-4000-8000-000000000008',
            '10000000-0000-4000-8000-000000000009',
            '10000000-0000-4000-8000-000000000010',
            '10000000-0000-4000-8000-000000000011',
            '10000000-0000-4000-8000-000000000012'
          )
        )
      )
      where project_id = '${projectA}';
    `);
    await expect(
      database.query(`
        select public.finalize_gallery_media_asset('${capAsset}', 'image/webp', 12);
      `),
    ).rejects.toThrow(/more than 12/i);

    await expect(
      database.query(`
        update public.invitation_drafts
        set content = jsonb_set(
          content,
          '{gallery}',
          jsonb_build_object(
            'enabled', true,
            'imageIds', jsonb_build_array(
              '10000000-0000-4000-8000-000000000001',
              '10000000-0000-4000-8000-000000000002',
              '10000000-0000-4000-8000-000000000003',
              '10000000-0000-4000-8000-000000000004',
              '10000000-0000-4000-8000-000000000005',
              '10000000-0000-4000-8000-000000000006',
              '10000000-0000-4000-8000-000000000007',
              '10000000-0000-4000-8000-000000000008',
              '10000000-0000-4000-8000-000000000009',
              '10000000-0000-4000-8000-000000000010',
              '10000000-0000-4000-8000-000000000011',
              '10000000-0000-4000-8000-000000000012',
              '10000000-0000-4000-8000-000000000013'
            )
          )
        )
        where project_id = '${projectA}';
      `),
    ).rejects.toThrow(/more than 12/i);
  });

  it('publishes only ready own gallery assets and preserves already published snapshot gallery IDs', async () => {
    const readyAsset = 'c5555555-5555-4555-8555-555555555555';

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.media_assets (
        id, project_id, storage_path, media_kind, mime_type, size_bytes
      )
      values (
        '${readyAsset}', '${projectA}',
        'projects/${projectA}/gallery/${readyAsset}.webp',
        'gallery_image', 'image/webp', 12
      );

      update public.media_assets
      set status = 'ready'
      where id = '${readyAsset}';

      update public.invitation_drafts
      set content = jsonb_set(
        content,
        '{gallery}',
        jsonb_build_object('enabled', true, 'imageIds', jsonb_build_array('${readyAsset}'))
      )
      where project_id = '${projectA}';
    `);

    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);

    await resetToDatabaseOwner(database);
    const publishedGallery = await database.query<{ image_ids: string[] }>(`
      select snapshot #> '{draft,gallery,imageIds}' as image_ids
      from public.published_invitation_snapshots
      where project_id = '${projectA}' and is_current;
    `);
    expect(publishedGallery.rows).toEqual([{ image_ids: [readyAsset] }]);

    await database.exec(`
      update public.invitation_drafts
      set content = jsonb_set(
        content,
        '{gallery}',
        jsonb_build_object('enabled', false, 'imageIds', '[]'::jsonb)
      )
      where project_id = '${projectA}';
    `);

    const unchangedSnapshot = await database.query<{ image_ids: string[] }>(`
      select snapshot #> '{draft,gallery,imageIds}' as image_ids
      from public.published_invitation_snapshots
      where project_id = '${projectA}' and is_current;
    `);
    expect(unchangedSnapshot.rows).toEqual([{ image_ids: [readyAsset] }]);
  });

  it('rejects missing, foreign, non-ready, deleted, and malformed gallery IDs atomically at publication time', async () => {
    const projectC = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const foreignReadyAsset = 'c6666666-6666-4666-8666-666666666666';
    const failedAsset = 'c7777777-7777-4777-8777-777777777777';
    const deletedAsset = 'c8888888-8888-4888-8888-888888888888';

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.wedding_projects (
        id, account_id, slug, person_one_name, person_two_name, event_city, event_date_primary
      ) values (
        '${projectC}', '${userA}', 'owner-c-wedding', 'Owner', 'C', 'Bogor', '2027-02-11'
      );

      insert into public.media_assets (
        id, project_id, storage_path, media_kind, mime_type, size_bytes
      ) values
        (
          '${foreignReadyAsset}', '${projectB}',
          'projects/${projectB}/gallery/${foreignReadyAsset}.jpg',
          'gallery_image', 'image/jpeg', 12
        ),
        (
          '${failedAsset}', '${projectC}',
          'projects/${projectC}/gallery/${failedAsset}.png',
          'gallery_image', 'image/png', 12
        ),
        (
          '${deletedAsset}', '${projectC}',
          'projects/${projectC}/gallery/${deletedAsset}.webp',
          'gallery_image', 'image/webp', 12
        );

      update public.media_assets set status = 'ready' where id = '${foreignReadyAsset}';
      update public.media_assets set status = 'failed' where id = '${failedAsset}';
      update public.media_assets set status = 'ready' where id = '${deletedAsset}';
      update public.media_assets set status = 'deleted', deleted_at = now() where id = '${deletedAsset}';
    `);

    await createVerifiedPaidActivationPayment(database, projectC, userA);

    const unavailableIds = [
      '99999999-9999-4999-8999-999999999999',
      foreignReadyAsset,
      failedAsset,
      deletedAsset,
      'not-a-valid-uuid',
    ];

    for (const unavailableId of unavailableIds) {
      await resetToDatabaseOwner(database);
      await database.exec(`
        update public.invitation_drafts
        set content = jsonb_set(
          content,
          '{gallery}',
          jsonb_build_object('enabled', true, 'imageIds', jsonb_build_array('${unavailableId}'))
        )
        where project_id = '${projectC}';
      `);

      await impersonateAuthenticatedUser(database, userA);
      await expect(
        database.query(`select * from public.publish_invitation_snapshot('${projectC}')`),
      ).rejects.toThrow(/gallery contains (an invalid media ID|an unavailable media asset)/i);

      await resetToDatabaseOwner(database);
      const atomicState = await database.query<{ snapshot_count: string; status: string }>(`
        select
          (select count(*)::text from public.published_invitation_snapshots where project_id = '${projectC}') as snapshot_count,
          (select status::text from public.wedding_projects where id = '${projectC}') as status;
      `);
      expect(atomicState.rows).toEqual([{ snapshot_count: '0', status: 'draft' }]);
    }
  });

  it('creates owner-scoped immutable payment attempts with one active checkout and no browser mutations', async () => {
    await resetToDatabaseOwner(database);
    const first = await database.query<{
      amount_idr: string;
      created_now: boolean;
      currency: string;
      id: string;
      pricing_version: string;
      provider_order_id: string;
      status: string;
    }>(`
      select *
      from public.reserve_payment_checkout_attempt(
        '${projectA}',
        '${userA}',
        'invitation_activation',
        'v1',
        99000,
        'IDR'
      );
    `);

    expect(first.rows).toHaveLength(1);
    expect(first.rows[0]).toMatchObject({
      amount_idr: 99000,
      created_now: true,
      currency: 'IDR',
      pricing_version: 'v1',
      status: 'created',
    });
    expect(first.rows[0]?.provider_order_id).toMatch(/^sry-pay-[0-9a-f-]{36}$/);

    const reused = await database.query<{ created_now: boolean; id: string }>(`
      select *
      from public.reserve_payment_checkout_attempt(
        '${projectA}',
        '${userA}',
        'invitation_activation',
        'v1',
        99000,
        'IDR'
      );
    `);
    expect(reused.rows[0]).toMatchObject({ created_now: false, id: first.rows[0]?.id });

    await impersonateAuthenticatedUser(database, userA);
    const ownerVisible = await database.query<{ id: string }>(`
      select id from public.payment_transactions order by created_at;
    `);
    expect(ownerVisible.rows).toEqual([{ id: first.rows[0]?.id }]);

    await expect(
      database.query(`
        insert into public.payment_transactions (
          project_id, provider, provider_order_id, product_code, pricing_version, amount_idr
        ) values (
          '${projectA}', 'midtrans_snap', 'browser-forged-order', 'invitation_activation', 'v1', 99000
        );
      `),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      database.query(`
        update public.payment_transactions set status = 'pending' where id = '${first.rows[0]?.id}';
      `),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      database.query(`delete from public.payment_transactions where id = '${first.rows[0]?.id}';`),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      database.query(`
        select * from public.reserve_payment_checkout_attempt(
          '${projectA}', '${userA}', 'invitation_activation', 'v1', 99000, 'IDR'
        );
      `),
    ).rejects.toThrow(/permission denied/i);

    await impersonateAuthenticatedUser(database, userB);
    const foreignVisible = await database.query<{ id: string }>(
      `select id from public.payment_transactions;`,
    );
    expect(foreignVisible.rows).toEqual([]);

    await impersonateAnonymousUser(database);
    await expect(database.query(`select id from public.payment_transactions;`)).rejects.toThrow(
      /permission denied/i,
    );

    await resetToDatabaseOwner(database);
    const started = await database.query<{ provider_checkout_url: string; status: string }>(`
      select status::text as status, provider_checkout_url
      from public.start_payment_checkout_attempt(
        '${first.rows[0]?.id}',
        'https://app.sandbox.midtrans.com/snap/v2/vtweb/test-token'
      );
    `);
    expect(started.rows).toEqual([
      {
        provider_checkout_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test-token',
        status: 'pending',
      },
    ]);

    for (const forbiddenStatus of ['paid', 'expired', 'cancelled', 'refunded']) {
      await expect(
        database.query(`
          update public.payment_transactions
          set status = '${forbiddenStatus}'
          where id = '${first.rows[0]?.id}';
        `),
      ).rejects.toThrow(/invalid payment transaction lifecycle transition/i);
    }

    await expect(
      database.query(`
        update public.payment_transactions
        set amount_idr = 1
        where id = '${first.rows[0]?.id}';
      `),
    ).rejects.toThrow(/immutable/i);
  });

  it('processes verified Midtrans webhook events idempotently with owner/private ledger boundaries', async () => {
    await resetToDatabaseOwner(database);
    const reserved = await database.query<{ id: string; provider_order_id: string }>(`
      select * from public.reserve_payment_checkout_attempt(
        '${projectA}', '${userA}', 'invitation_activation', 'v1', 99000, 'IDR'
      );
    `);
    const paymentId = reserved.rows[0]?.id;
    const orderId = reserved.rows[0]?.provider_order_id;

    await database.query(`
      select * from public.start_payment_checkout_attempt(
        '${paymentId}', 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test-token'
      );
    `);

    const settled = await database.query<{
      applied_payment_status: string | null;
      duplicate: boolean;
      paid_at: Date | null;
      status: string;
      webhook_event_id: string | null;
    }>(`
      select * from public.apply_verified_midtrans_payment_webhook(
        '${orderId}', 99000, 'IDR', repeat('a', 64), 'settlement', '200',
        'midtrans-settlement-id', 'bank_transfer', 'paid'::public.payment_status
      );
    `);

    expect(settled.rows).toHaveLength(1);
    expect(settled.rows[0]).toMatchObject({
      applied_payment_status: 'paid',
      duplicate: false,
      status: 'paid',
    });
    expect(settled.rows[0]?.paid_at).toBeInstanceOf(Date);

    const duplicate = await database.query<{
      duplicate: boolean;
      paid_at: Date | null;
      status: string;
    }>(`
      select * from public.apply_verified_midtrans_payment_webhook(
        '${orderId}', 99000, 'IDR', repeat('a', 64), 'settlement', '200',
        'midtrans-settlement-id', 'bank_transfer', 'paid'::public.payment_status
      );
    `);
    expect(duplicate.rows).toHaveLength(1);
    expect(duplicate.rows[0]).toMatchObject({
      duplicate: true,
      paid_at: settled.rows[0]?.paid_at,
      status: 'paid',
    });

    const ledger = await database.query<{
      applied_payment_status: string | null;
      count: string;
      provider_order_id: string;
    }>(`
      select count(*)::text as count, max(provider_order_id) as provider_order_id,
        max(applied_payment_status::text) as applied_payment_status
      from public.payment_webhook_events
      where payment_transaction_id = '${paymentId}';
    `);
    expect(ledger.rows).toEqual([
      { applied_payment_status: 'paid', count: '1', provider_order_id: orderId },
    ]);

    await impersonateAuthenticatedUser(database, userA);
    await expect(database.query(`select * from public.payment_webhook_events;`)).rejects.toThrow(
      /permission denied/i,
    );
    await expect(
      database.query(`
        insert into public.payment_webhook_events (
          payment_transaction_id, provider, provider_order_id, event_fingerprint,
          provider_transaction_status, provider_status_code
        ) values (
          '${paymentId}', 'midtrans_snap', '${orderId}', repeat('b', 64), 'settlement', '200'
        );
      `),
    ).rejects.toThrow(/permission denied/i);

    await impersonateAnonymousUser(database);
    await expect(database.query(`select * from public.payment_webhook_events;`)).rejects.toThrow(
      /permission denied/i,
    );

    await resetToDatabaseOwner(database);
    await expect(
      database.query(`
        select * from public.apply_verified_midtrans_payment_webhook(
          '${orderId}', 1, 'IDR', repeat('c', 64), 'settlement', '200',
          'wrong-amount', null, 'paid'::public.payment_status
        );
      `),
    ).rejects.toThrow(/not available for this webhook/i);

    const refunded = await database.query<{ applied_payment_status: string; status: string }>(`
      select * from public.apply_verified_midtrans_payment_webhook(
        '${orderId}', 99000, 'IDR', repeat('d', 64), 'refund', '200',
        'midtrans-refund-id', 'bank_transfer', 'refunded'::public.payment_status
      );
    `);
    expect(refunded.rows).toHaveLength(1);
    expect(refunded.rows[0]).toMatchObject({
      applied_payment_status: 'refunded',
      status: 'refunded',
    });
  });

  it('records unsupported verified webhook states without payment regression and rolls event inserts back with failed mutations', async () => {
    await resetToDatabaseOwner(database);
    const reserved = await database.query<{ id: string; provider_order_id: string }>(`
      select * from public.reserve_payment_checkout_attempt(
        '${projectA}', '${userA}', 'invitation_activation', 'v1', 99000, 'IDR'
      );
    `);
    const paymentId = reserved.rows[0]?.id;
    const orderId = reserved.rows[0]?.provider_order_id;

    await database.query(`
      select * from public.start_payment_checkout_attempt(
        '${paymentId}', 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test-token'
      );
    `);

    const authorized = await database.query<{
      applied_payment_status: string | null;
      status: string;
    }>(`
      select * from public.apply_verified_midtrans_payment_webhook(
        '${orderId}', 99000, null, repeat('e', 64), 'authorize', '201', null, null, null
      );
    `);
    expect(authorized.rows).toHaveLength(1);
    expect(authorized.rows[0]).toMatchObject({ applied_payment_status: null, status: 'pending' });

    await database.exec(`
      create function public.fail_verified_payment_update_for_test()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.provider_status = 'forced_failure' then
          raise exception 'verified payment mutation failure';
        end if;
        return new;
      end;
      $$;

      create trigger payment_transactions_fail_verified_update_for_test
      before update on public.payment_transactions
      for each row
      execute function public.fail_verified_payment_update_for_test();
    `);

    await expect(
      database.query(`
        select * from public.apply_verified_midtrans_payment_webhook(
          '${orderId}', 99000, 'IDR', repeat('f', 64), 'forced_failure', '200',
          null, null, 'failed'::public.payment_status
        );
      `),
    ).rejects.toThrow(/verified payment mutation failure/i);

    const afterRollback = await database.query<{ count: string; status: string }>(`
      select
        (select count(*)::text from public.payment_webhook_events where event_fingerprint = repeat('f', 64)) as count,
        (select status::text from public.payment_transactions where id = '${paymentId}') as status;
    `);
    expect(afterRollback.rows).toEqual([{ count: '0', status: 'pending' }]);
  });

  it('requires a verified paid activation inside the database publication boundary', async () => {
    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`select * from public.publish_invitation_snapshot('${projectA}')`),
    ).rejects.toThrow(/verified payment is required/i);

    await resetToDatabaseOwner(database);
    const unchanged = await database.query<{ snapshot_count: string; status: string }>(`
      select
        (select count(*)::text from public.published_invitation_snapshots where project_id = '${projectA}') as snapshot_count,
        (select status::text from public.wedding_projects where id = '${projectA}') as status;
    `);
    expect(unchanged.rows).toEqual([{ snapshot_count: '0', status: 'draft' }]);
  });

  it('rejects pending, failed, expired, cancelled, and refunded activation payments', async () => {
    for (const status of ['failed', 'expired', 'cancelled', 'refunded', 'pending'] as const) {
      await createVerifiedActivationPaymentWithStatus(database, projectA, userA, status);
      await impersonateAuthenticatedUser(database, userA);

      await expect(
        database.query(`select * from public.publish_invitation_snapshot('${projectA}')`),
      ).rejects.toThrow(/verified payment is required/i);
    }

    await resetToDatabaseOwner(database);
    const state = await database.query<{ snapshot_count: string; status: string }>(`
      select
        (select count(*)::text from public.published_invitation_snapshots where project_id = '${projectA}') as snapshot_count,
        (select status::text from public.wedding_projects where id = '${projectA}') as status;
    `);
    expect(state.rows).toEqual([{ snapshot_count: '0', status: 'draft' }]);
  });

  it('does not auto-publish after a verified payment webhook, but allows manual publish afterward', async () => {
    await createVerifiedPaidActivationPayment(database, projectA, userA);

    await resetToDatabaseOwner(database);
    const beforeManualPublish = await database.query<{ snapshot_count: string; status: string }>(`
      select
        (select count(*)::text from public.published_invitation_snapshots where project_id = '${projectA}') as snapshot_count,
        (select status::text from public.wedding_projects where id = '${projectA}') as status;
    `);
    expect(beforeManualPublish.rows).toEqual([{ snapshot_count: '0', status: 'draft' }]);

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`select * from public.publish_invitation_snapshot('${projectA}')`),
    ).resolves.toBeDefined();
  });

  it('keeps a legacy published invitation public but blocks republish without a verified payment', async () => {
    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.published_invitation_snapshots (
        project_id, slug, revision, template_id, draft_schema_version, snapshot, is_current
      )
      select
        project.id,
        project.slug,
        1,
        'roselle',
        draft.schema_version,
        jsonb_build_object(
          'project', jsonb_build_object(
            'slug', project.slug,
            'eventDatePrimary', project.event_date_primary::text,
            'eventCity', project.event_city,
            'timezone', project.default_timezone
          ),
          'draft', draft.content
        ),
        true
      from public.wedding_projects as project
      join public.invitation_drafts as draft on draft.project_id = project.id
      where project.id = '${projectA}';

      update public.wedding_projects
      set status = 'published'::public.project_status
      where id = '${projectA}';
    `);

    await impersonateAnonymousUser(database);
    const publicLegacySnapshot = await database.query<{ slug: string }>(`
      select slug::text as slug from public.published_invitation_snapshots;
    `);
    expect(publicLegacySnapshot.rows).toEqual([{ slug: 'owner-a-wedding' }]);

    await impersonateAuthenticatedUser(database, userA);
    await expect(
      database.query(`select * from public.publish_invitation_snapshot('${projectA}')`),
    ).rejects.toThrow(/verified payment is required/i);

    await resetToDatabaseOwner(database);
    const legacyState = await database.query<{
      current_count: string;
      revision_count: string;
      status: string;
    }>(`
      select
        (select count(*)::text from public.published_invitation_snapshots where project_id = '${projectA}' and is_current) as current_count,
        (select count(*)::text from public.published_invitation_snapshots where project_id = '${projectA}') as revision_count,
        (select status::text from public.wedding_projects where id = '${projectA}') as status;
    `);
    expect(legacyState.rows).toEqual([
      { current_count: '1', revision_count: '1', status: 'published' },
    ]);
  });

  it('does not allow User A to publish with User B payment entitlement', async () => {
    await createVerifiedPaidActivationPayment(database, projectB, userB);
    await impersonateAuthenticatedUser(database, userA);

    await expect(
      database.query(`select * from public.publish_invitation_snapshot('${projectA}')`),
    ).rejects.toThrow(/verified payment is required/i);
  });

  it('rejects payment reservation for a foreign project and rolls a failed fresh reservation back safely', async () => {
    await resetToDatabaseOwner(database);
    await expect(
      database.query(`
        select *
        from public.reserve_payment_checkout_attempt(
          '${projectB}', '${userA}', 'invitation_activation', 'v1', 99000, 'IDR'
        );
      `),
    ).rejects.toThrow(/not available for payment checkout/i);

    await database.exec(`
      create function public.fail_payment_reservation_for_test()
      returns trigger
      language plpgsql
      as $$
      begin
        raise exception 'payment reservation failure';
      end;
      $$;

      create trigger payment_transactions_fail_for_test
      before insert on public.payment_transactions
      for each row
      execute function public.fail_payment_reservation_for_test();
    `);

    await expect(
      database.query(`
        select *
        from public.reserve_payment_checkout_attempt(
          '${projectA}', '${userA}', 'invitation_activation', 'v1', 99000, 'IDR'
        );
      `),
    ).rejects.toThrow(/payment reservation failure/i);

    const afterFailure = await database.query<{ count: string; status: string }>(`
      select
        (select count(*)::text from public.payment_transactions where project_id = '${projectA}') as count,
        (select status::text from public.wedding_projects where id = '${projectA}') as status;
    `);
    expect(afterFailure.rows).toEqual([{ count: '0', status: 'draft' }]);
  });

  it('creates normalized private guests with pending RSVP defaults and allows duplicate names', async () => {
    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (project_id, display_name, group_label, party_size)
      values
        ('${projectA}', '  Keluarga Budi  ', '   ', 2),
        ('${projectA}', 'Keluarga Budi', 'Keluarga', 1);
    `);

    const guests = await database.query<{
      display_name: string;
      group_label: string | null;
      party_size: string;
      rsvp_status: string;
    }>(`
      select display_name, group_label, party_size::text as party_size, rsvp_status::text as rsvp_status
      from public.guests
      where project_id = '${projectA}'
      order by group_label nulls first, id;
    `);

    expect(guests.rows).toEqual([
      {
        display_name: 'Keluarga Budi',
        group_label: null,
        party_size: '2',
        rsvp_status: 'pending',
      },
      {
        display_name: 'Keluarga Budi',
        group_label: 'Keluarga',
        party_size: '1',
        rsvp_status: 'pending',
      },
    ]);
  });

  it('stores only canonical private guest WhatsApp contacts and keeps them within existing owner RLS', async () => {
    const guestA = 'd1212121-1212-4121-8121-121212121212';
    const guestB = 'd1313131-1313-4131-8131-131313131313';

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name, whatsapp_phone_e164)
      values
        ('${guestA}', '${projectA}', 'Tamu Kontak A', '+6281234567890'),
        ('${guestB}', '${projectB}', 'Tamu Kontak B', '+14155550123');
    `);

    await expect(
      database.query(`
        insert into public.guests (project_id, display_name, whatsapp_phone_e164)
        values ('${projectA}', 'Nomor Tidak Valid', '081234567890');
      `),
    ).rejects.toThrow(/guests_whatsapp_phone_e164_e164/i);

    await impersonateAuthenticatedUser(database, userA);
    const ownContact = await database.query<{ id: string; whatsapp_phone_e164: string | null }>(`
      select id, whatsapp_phone_e164
      from public.guests
      order by id;
    `);
    expect(ownContact.rows).toEqual([{ id: guestA, whatsapp_phone_e164: '+6281234567890' }]);

    await impersonateAuthenticatedUser(database, userB);
    const foreignContact = await database.query<{
      id: string;
      whatsapp_phone_e164: string | null;
    }>(`
      select id, whatsapp_phone_e164
      from public.guests
      order by id;
    `);
    expect(foreignContact.rows).toEqual([{ id: guestB, whatsapp_phone_e164: '+14155550123' }]);
  });

  it('keeps guest metadata owner-only and denies browser insert/update/delete paths', async () => {
    const guestA = 'd1111111-1111-4111-8111-111111111111';
    const guestB = 'd2222222-2222-4222-8222-222222222222';

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name)
      values
        ('${guestA}', '${projectA}', 'Tamu A'),
        ('${guestB}', '${projectB}', 'Tamu B');
    `);

    await impersonateAuthenticatedUser(database, userA);
    const ownerVisible = await database.query<{ id: string }>(
      'select id from public.guests order by id',
    );
    expect(ownerVisible.rows).toEqual([{ id: guestA }]);

    await expect(
      database.query(`
        insert into public.guests (project_id, display_name)
        values ('${projectA}', 'Browser write');
      `),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      database.query(`update public.guests set display_name = 'Changed' where id = '${guestA}';`),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      database.query(`delete from public.guests where id = '${guestA}';`),
    ).rejects.toThrow(/permission denied/i);

    await impersonateAuthenticatedUser(database, userB);
    const foreignVisible = await database.query<{ id: string }>('select id from public.guests');
    expect(foreignVisible.rows).toEqual([{ id: guestB }]);

    await impersonateAnonymousUser(database);
    await expect(database.query('select id from public.guests')).rejects.toThrow(
      /permission denied/i,
    );
  });

  it('soft-removes guests from normal reads/counts and hides all guests when a project is soft-deleted', async () => {
    const activeGuest = 'd3333333-3333-4333-8333-333333333333';
    const removedGuest = 'd4444444-4444-4444-8444-444444444444';

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name)
      values
        ('${activeGuest}', '${projectA}', 'Tamu Aktif'),
        ('${removedGuest}', '${projectA}', 'Tamu Dihapus');
      update public.guests set deleted_at = now() where id = '${removedGuest}';
    `);

    await impersonateAuthenticatedUser(database, userA);
    const activeRows = await database.query<{ id: string }>(
      'select id from public.guests order by id',
    );
    expect(activeRows.rows).toEqual([{ id: activeGuest }]);

    await resetToDatabaseOwner(database);
    await database.exec(
      `update public.wedding_projects set deleted_at = now() where id = '${projectA}';`,
    );

    await impersonateAuthenticatedUser(database, userA);
    const afterProjectDelete = await database.query<{ id: string }>('select id from public.guests');
    expect(afterProjectDelete.rows).toEqual([]);
  });

  it('keeps guests out of published snapshot data and public invitation source contracts', async () => {
    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);

    await resetToDatabaseOwner(database);
    const snapshotShape = await database.query<{
      draft_has_guests: boolean;
      has_guests: boolean;
      has_whatsapp_phone: boolean;
    }>(`
      select
        (snapshot ? 'guests') as has_guests,
        ((snapshot -> 'draft') ? 'guests') as draft_has_guests,
        (snapshot ? 'whatsapp_phone_e164') as has_whatsapp_phone
      from public.published_invitation_snapshots
      where project_id = '${projectA}' and is_current;
    `);

    expect(snapshotShape.rows).toEqual([
      { draft_has_guests: false, has_guests: false, has_whatsapp_phone: false },
    ]);
  });

  it('creates private guest_links with hashed-only capability storage and one active link maximum', async () => {
    const guestId = 'd5555555-5555-4555-8555-555555555555';
    const token = createRuntimePersonalGuestToken();

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name)
      values ('${guestId}', '${projectA}', 'Tamu Tautan');
    `);

    const columns = await database.query<{ column_name: string }>(`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'guest_links'
      order by ordinal_position;
    `);
    expect(columns.rows.map((row) => row.column_name)).toEqual([
      'id',
      'guest_id',
      'token_hash',
      'status',
      'created_at',
      'updated_at',
      'revoked_at',
    ]);

    await expect(
      database.query(`
        insert into public.guest_links (guest_id, token_hash)
        values ('${guestId}', 'not-a-sha256-digest');
      `),
    ).rejects.toThrow(/guest_links_token_hash_sha256_hex/i);

    await createPersonalGuestLink(database, guestId, token);
    const stored = await database.query<{ status: string; token_hash: string }>(`
      select token_hash, status::text as status
      from public.guest_links
      where guest_id = '${guestId}';
    `);
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0]?.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.rows[0]?.status).toBe('active');

    const anotherToken = createRuntimePersonalGuestToken();
    await expect(
      database.query(`
        insert into public.guest_links (guest_id, token_hash)
        values (
          '${guestId}',
          encode(extensions.digest('${anotherToken}', 'sha256'), 'hex')
        );
      `),
    ).rejects.toThrow(/guest_links_one_active_per_guest_idx|duplicate key/i);
  });

  it('keeps guest_links closed to browser table browsing and direct mutation', async () => {
    const guestId = 'd6666666-6666-4666-8666-666666666666';
    const token = createRuntimePersonalGuestToken();

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name)
      values ('${guestId}', '${projectA}', 'Tamu Privat');
    `);
    await createPersonalGuestLink(database, guestId, token);

    await impersonateAuthenticatedUser(database, userA);
    await expect(database.query('select * from public.guest_links')).rejects.toThrow(
      /permission denied/i,
    );
    await expect(
      database.query(`
        insert into public.guest_links (guest_id, token_hash)
        values ('${guestId}', repeat('0', 64));
      `),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      database.query(`
        update public.guest_links
        set status = 'revoked'::public.guest_link_status
        where guest_id = '${guestId}';
      `),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      database.query(`delete from public.guest_links where guest_id = '${guestId}';`),
    ).rejects.toThrow(/permission denied/i);

    await impersonateAnonymousUser(database);
    await expect(database.query('select * from public.guest_links')).rejects.toThrow(
      /permission denied/i,
    );
  });

  it('resolves only the linked active guest RSVP state and validates explicit attendance count against server party size', async () => {
    const guestA = 'd7777777-7777-4777-8777-777777777777';
    const guestB = 'd8888888-8888-4888-8888-888888888888';
    const tokenA = createRuntimePersonalGuestToken();

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name, party_size)
      values
        ('${guestA}', '${projectA}', 'Tamu RSVP A', 4),
        ('${guestB}', '${projectA}', 'Tamu RSVP B', 2);
    `);
    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);
    await createPersonalGuestLink(database, guestA, tokenA);

    await impersonateAnonymousUser(database);
    const resolved = await database.query<{
      guest_display_name: string;
      party_size: number;
      rsvp_attendee_count: string | null;
      rsvp_status: string;
      snapshot: { draft: { rsvp: { enabled: boolean } } };
      template_id: string;
    }>(`
      select * from public.resolve_personal_guest_invitation('owner-a-wedding', '${tokenA}');
    `);
    expect(resolved.rows).toHaveLength(1);
    expect(resolved.rows[0]).toMatchObject({
      guest_display_name: 'Tamu RSVP A',
      party_size: 4,
      rsvp_attendee_count: null,
      rsvp_status: 'pending',
      snapshot: { draft: { rsvp: { enabled: true } } },
      template_id: 'roselle',
    });
    expect(Object.keys(resolved.rows[0] ?? {}).sort()).toEqual([
      'guest_display_name',
      'party_size',
      'rsvp_attendee_count',
      'rsvp_status',
      'snapshot',
      'template_id',
    ]);

    const rejectedZero = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${tokenA}', 'attending'::public.rsvp_status, 0::smallint
      )::text as status;
    `);
    expect(rejectedZero.rows).toEqual([{ status: null }]);

    const rejectedOverLimit = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${tokenA}', 'attending'::public.rsvp_status, 5::smallint
      )::text as status;
    `);
    expect(rejectedOverLimit.rows).toEqual([{ status: null }]);

    const attending = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${tokenA}', 'attending'::public.rsvp_status, 2::smallint
      )::text as status;
    `);
    expect(attending.rows).toEqual([{ status: 'attending' }]);

    const declined = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${tokenA}', 'declined'::public.rsvp_status, 4::smallint
      )::text as status;
    `);
    expect(declined.rows).toEqual([{ status: 'declined' }]);

    const rejectedPending = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${tokenA}', 'pending'::public.rsvp_status, null::smallint
      )::text as status;
    `);
    expect(rejectedPending.rows).toEqual([{ status: null }]);

    await resetToDatabaseOwner(database);
    const guestStatuses = await database.query<{
      id: string;
      rsvp_attendee_count: string | null;
      rsvp_status: string;
    }>(`
      select id, rsvp_status::text as rsvp_status, rsvp_attendee_count::text as rsvp_attendee_count
      from public.guests
      where id in ('${guestA}', '${guestB}')
      order by id;
    `);
    expect(guestStatuses.rows).toEqual([
      { id: guestA, rsvp_attendee_count: null, rsvp_status: 'declined' },
      { id: guestB, rsvp_attendee_count: null, rsvp_status: 'pending' },
    ]);
  });

  it('keeps legacy attending RSVP rows with unknown count deploy-safe while enforcing M0017 count constraints', async () => {
    const legacyGuest = 'd7878787-7878-4787-8787-787878787878';
    const confirmedGuest = 'd7979797-7979-4797-8797-797979797979';

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name, party_size, rsvp_status)
      values ('${legacyGuest}', '${projectA}', 'Tamu Legacy Hadir', 4, 'attending'::public.rsvp_status);

      insert into public.guests (
        id, project_id, display_name, party_size, rsvp_status, rsvp_attendee_count
      )
      values (
        '${confirmedGuest}', '${projectA}', 'Tamu Konfirmasi', 4,
        'attending'::public.rsvp_status, 3
      );
    `);

    const legacy = await database.query<{
      rsvp_attendee_count: string | null;
      rsvp_status: string;
    }>(`
      select rsvp_status::text as rsvp_status, rsvp_attendee_count::text as rsvp_attendee_count
      from public.guests where id = '${legacyGuest}';
    `);
    expect(legacy.rows).toEqual([{ rsvp_attendee_count: null, rsvp_status: 'attending' }]);

    await expect(
      database.query(`
        insert into public.guests (
          project_id, display_name, party_size, rsvp_status, rsvp_attendee_count
        ) values (
          '${projectA}', 'Pending Tidak Valid', 2, 'pending'::public.rsvp_status, 1
        );
      `),
    ).rejects.toThrow(/guests_rsvp_attendee_count_contract/i);

    await expect(
      database.query(`
        insert into public.guests (
          project_id, display_name, party_size, rsvp_status, rsvp_attendee_count
        ) values (
          '${projectA}', 'Declined Tidak Valid', 2, 'declined'::public.rsvp_status, 1
        );
      `),
    ).rejects.toThrow(/guests_rsvp_attendee_count_contract/i);

    await expect(
      database.query(`
        update public.guests
        set rsvp_status = 'pending'::public.rsvp_status, rsvp_attendee_count = 1
        where id = '${confirmedGuest}';
      `),
    ).rejects.toThrow(/guests_rsvp_attendee_count_contract/i);

    await expect(
      database.query(`
        update public.guests
        set party_size = 2
        where id = '${confirmedGuest}';
      `),
    ).rejects.toThrow(/guests_rsvp_attendee_count_contract/i);
  });

  it('invalidates replaced, revoked, expired, soft-removed, unpublished, deleted, and cross-project links uniformly', async () => {
    const linkedGuest = 'd9999999-9999-4999-8999-999999999999';
    const softRemovedGuest = 'daaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const foreignGuest = 'dbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const oldToken = createRuntimePersonalGuestToken();
    const replacementToken = createRuntimePersonalGuestToken();
    const softRemovedToken = createRuntimePersonalGuestToken();
    const foreignToken = createRuntimePersonalGuestToken();
    const expiredToken = createRuntimePersonalGuestToken();

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name)
      values
        ('${linkedGuest}', '${projectA}', 'Tamu Ganti'),
        ('${softRemovedGuest}', '${projectA}', 'Tamu Soft Remove'),
        ('${foreignGuest}', '${projectB}', 'Tamu Project Lain');
    `);
    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);

    await createPersonalGuestLink(database, linkedGuest, oldToken);
    await createPersonalGuestLink(database, linkedGuest, replacementToken);
    await createPersonalGuestLink(database, softRemovedGuest, softRemovedToken);
    await createPersonalGuestLink(database, foreignGuest, foreignToken);

    await resetToDatabaseOwner(database);
    await database.query(`
      insert into public.guest_links (guest_id, token_hash, status, revoked_at)
      values (
        '${linkedGuest}',
        encode(extensions.digest('${expiredToken}', 'sha256'), 'hex'),
        'expired'::public.guest_link_status,
        now()
      );
    `);

    await impersonateAnonymousUser(database);
    const oldLink = await database.query(`
      select * from public.resolve_personal_guest_invitation('owner-a-wedding', '${oldToken}');
    `);
    const replacementLink = await database.query(`
      select * from public.resolve_personal_guest_invitation('owner-a-wedding', '${replacementToken}');
    `);
    const expiredLink = await database.query(`
      select * from public.resolve_personal_guest_invitation('owner-a-wedding', '${expiredToken}');
    `);
    const invalidLink = await database.query(`
      select * from public.resolve_personal_guest_invitation('owner-a-wedding', '${createRuntimePersonalGuestToken()}');
    `);
    const foreignCrossProjectLink = await database.query(`
      select * from public.resolve_personal_guest_invitation('owner-a-wedding', '${foreignToken}');
    `);
    const unpublishedForeignLink = await database.query(`
      select * from public.resolve_personal_guest_invitation('owner-b-wedding', '${foreignToken}');
    `);

    expect(oldLink.rows).toEqual([]);
    expect(replacementLink.rows).toHaveLength(1);
    expect(expiredLink.rows).toEqual([]);
    expect(invalidLink.rows).toEqual([]);
    expect(foreignCrossProjectLink.rows).toEqual([]);
    expect(unpublishedForeignLink.rows).toEqual([]);

    const revokedRsvp = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${oldToken}', 'declined'::public.rsvp_status, null::smallint
      )::text as status;
    `);
    const expiredRsvp = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${expiredToken}', 'declined'::public.rsvp_status, null::smallint
      )::text as status;
    `);
    const crossProjectRsvp = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${foreignToken}', 'declined'::public.rsvp_status, null::smallint
      )::text as status;
    `);

    expect(revokedRsvp.rows).toEqual([{ status: null }]);
    expect(expiredRsvp.rows).toEqual([{ status: null }]);
    expect(crossProjectRsvp.rows).toEqual([{ status: null }]);

    await resetToDatabaseOwner(database);
    await database.exec(`
      update public.guests set deleted_at = now() where id = '${softRemovedGuest}';
    `);
    const softRemovalState = await database.query<{ revoked_at: string | null; status: string }>(`
      select status::text as status, revoked_at
      from public.guest_links
      where guest_id = '${softRemovedGuest}';
    `);
    expect(softRemovalState.rows).toEqual([expect.objectContaining({ status: 'revoked' })]);
    expect(softRemovalState.rows[0]?.revoked_at).not.toBeNull();

    await impersonateAnonymousUser(database);
    const softRemovedLink = await database.query(`
      select * from public.resolve_personal_guest_invitation('owner-a-wedding', '${softRemovedToken}');
    `);
    const softRemovedRsvp = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${softRemovedToken}', 'declined'::public.rsvp_status, null::smallint
      )::text as status;
    `);
    expect(softRemovedLink.rows).toEqual([]);
    expect(softRemovedRsvp.rows).toEqual([{ status: null }]);

    await resetToDatabaseOwner(database);
    await database.exec(
      `update public.wedding_projects set deleted_at = now() where id = '${projectA}';`,
    );
    await impersonateAnonymousUser(database);
    const deletedProjectLink = await database.query(`
      select * from public.resolve_personal_guest_invitation('owner-a-wedding', '${replacementToken}');
    `);
    expect(deletedProjectLink.rows).toEqual([]);
  });

  it('creates a private guestbook with one active entry per guest, capability-scoped upsert, owner-only inbox reads, and soft removal', async () => {
    const guestA = 'deeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const guestB = 'dfffffff-ffff-4fff-8fff-ffffffffffff';
    const guestC = 'd1212121-1212-4121-8121-121212121212';
    const tokenA = createRuntimePersonalGuestToken();
    const tokenB = createRuntimePersonalGuestToken();
    const tokenC = createRuntimePersonalGuestToken();

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name)
      values
        ('${guestA}', '${projectA}', 'Tamu Buku A'),
        ('${guestB}', '${projectB}', 'Tamu Buku B'),
        ('${guestC}', '${projectA}', 'Tamu Buku C');
    `);
    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);
    await createPersonalGuestLink(database, guestA, tokenA);
    await createPersonalGuestLink(database, guestB, tokenB);
    await createPersonalGuestLink(database, guestC, tokenC);

    const columns = await database.query<{ column_name: string }>(`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'guestbook_entries'
      order by ordinal_position;
    `);
    expect(columns.rows.map((row) => row.column_name)).toEqual([
      'id',
      'guest_id',
      'message',
      'created_at',
      'updated_at',
      'deleted_at',
    ]);

    await impersonateAnonymousUser(database);
    await expect(database.query('select * from public.guestbook_entries')).rejects.toThrow(
      /permission denied/i,
    );
    await expect(
      database.query(`
        insert into public.guestbook_entries (guest_id, message)
        values ('${guestA}', 'Browser write');
      `),
    ).rejects.toThrow(/permission denied/i);

    const created = await database.query<{ state: string | null }>(`
      select public.submit_personal_guestbook_entry(
        'owner-a-wedding', '${tokenA}', '  Semoga bahagia\nselalu 💐  '
      ) as state;
    `);
    expect(created.rows).toEqual([{ state: 'created' }]);

    const resolved = await database.query<{ message: string | null; updated_at: string | null }>(`
      select * from public.resolve_personal_guestbook_entry('owner-a-wedding', '${tokenA}');
    `);
    expect(resolved.rows).toHaveLength(1);
    expect(resolved.rows[0]?.message).toBe('Semoga bahagia\nselalu 💐');
    expect(resolved.rows[0]?.updated_at).toBeTruthy();
    expect(Object.keys(resolved.rows[0] ?? {}).sort()).toEqual(['message', 'updated_at']);

    const crossGuestAttempt = await database.query<{ state: string | null }>(`
      select public.submit_personal_guestbook_entry(
        'owner-a-wedding', '${tokenB}', 'Tidak boleh mengubah pesan tamu lain'
      ) as state;
    `);
    expect(crossGuestAttempt.rows).toEqual([{ state: null }]);

    const immediateRepeat = await database.query<{ state: string | null }>(`
      select public.submit_personal_guestbook_entry(
        'owner-a-wedding', '${tokenA}', 'Pesan kedua terlalu cepat'
      ) as state;
    `);
    expect(immediateRepeat.rows).toEqual([{ state: null }]);

    await resetToDatabaseOwner(database);
    await database.exec(`
      alter table public.guestbook_entries disable trigger guestbook_entries_set_updated_at;
      update public.guestbook_entries
      set updated_at = now() - interval '10 seconds'
      where guest_id = '${guestA}' and deleted_at is null;
      alter table public.guestbook_entries enable trigger guestbook_entries_set_updated_at;
    `);

    await impersonateAnonymousUser(database);
    const updated = await database.query<{ state: string | null }>(`
      select public.submit_personal_guestbook_entry(
        'owner-a-wedding', '${tokenA}', 'Semoga selalu bahagia'
      ) as state;
    `);
    expect(updated.rows).toEqual([{ state: 'updated' }]);

    await resetToDatabaseOwner(database);
    const activeCount = await database.query<{ count: string }>(`
      select count(*)::text as count
      from public.guestbook_entries
      where guest_id = '${guestA}' and deleted_at is null;
    `);
    expect(activeCount.rows).toEqual([{ count: '1' }]);
    await expect(
      database.query(`
        insert into public.guestbook_entries (guest_id, message)
        values ('${guestA}', 'Duplikat tidak boleh aktif');
      `),
    ).rejects.toThrow(/guestbook_entries_one_active_per_guest_idx|duplicate key/i);

    await impersonateAuthenticatedUser(database, userA);
    const ownerInbox = await database.query<{ message: string }>(`
      select message from public.guestbook_entries order by updated_at desc;
    `);
    expect(ownerInbox.rows).toEqual([{ message: 'Semoga selalu bahagia' }]);

    await impersonateAuthenticatedUser(database, userB);
    const foreignInbox = await database.query(`select message from public.guestbook_entries;`);
    expect(foreignInbox.rows).toEqual([]);

    await resetToDatabaseOwner(database);
    await database.exec(`
      update public.guestbook_entries
      set deleted_at = now()
      where guest_id = '${guestA}' and deleted_at is null;
    `);

    await impersonateAuthenticatedUser(database, userA);
    const afterRemoval = await database.query(`select message from public.guestbook_entries;`);
    expect(afterRemoval.rows).toEqual([]);

    await impersonateAnonymousUser(database);
    const replacement = await database.query<{ state: string | null }>(`
      select public.submit_personal_guestbook_entry(
        'owner-a-wedding', '${tokenA}', 'Ucapan baru setelah dihapus'
      ) as state;
    `);
    expect(replacement.rows).toEqual([{ state: 'created' }]);

    await resetToDatabaseOwner(database);
    await database.exec(`
      update public.guest_links
      set status = 'revoked'::public.guest_link_status,
          revoked_at = now()
      where guest_id = '${guestA}' and status = 'active'::public.guest_link_status;
    `);

    await impersonateAnonymousUser(database);
    const revoked = await database.query<{ state: string | null }>(`
      select public.submit_personal_guestbook_entry(
        'owner-a-wedding', '${tokenA}', 'Tidak boleh masuk'
      ) as state;
    `);
    expect(revoked.rows).toEqual([{ state: null }]);

    await resetToDatabaseOwner(database);
    await database.exec(`update public.guests set deleted_at = now() where id = '${guestB}';`);

    await impersonateAnonymousUser(database);
    const softDeleted = await database.query<{ state: string | null }>(`
      select public.submit_personal_guestbook_entry(
        'owner-b-wedding', '${tokenB}', 'Tidak boleh masuk'
      ) as state;
    `);
    expect(softDeleted.rows).toEqual([{ state: null }]);

    await resetToDatabaseOwner(database);
    await database.exec(`
      update public.guest_links
      set status = 'expired'::public.guest_link_status,
          revoked_at = now()
      where guest_id = '${guestC}' and status = 'active'::public.guest_link_status;
    `);

    await impersonateAnonymousUser(database);
    const expired = await database.query<{ state: string | null }>(`
      select public.submit_personal_guestbook_entry(
        'owner-a-wedding', '${tokenC}', 'Tidak boleh masuk'
      ) as state;
    `);
    expect(expired.rows).toEqual([{ state: null }]);
  });

  it('rejects anonymous RSVP when the current published snapshot has RSVP disabled', async () => {
    const guestId = 'dccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const token = createRuntimePersonalGuestToken();

    await resetToDatabaseOwner(database);
    await database.exec(`
      insert into public.guests (id, project_id, display_name)
      values ('${guestId}', '${projectA}', 'Tamu RSVP Nonaktif');
    `);
    await createVerifiedPaidActivationPayment(database, projectA, userA);
    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);

    await resetToDatabaseOwner(database);
    await database.exec(`
      update public.invitation_drafts
      set content = jsonb_set(content, '{rsvp,enabled}', 'false'::jsonb)
      where project_id = '${projectA}' and deleted_at is null;
    `);
    await impersonateAuthenticatedUser(database, userA);
    await database.query(`select * from public.publish_invitation_snapshot('${projectA}')`);
    await createPersonalGuestLink(database, guestId, token);

    await impersonateAnonymousUser(database);
    const rejected = await database.query<{ status: string | null }>(`
      select public.submit_personal_guest_rsvp(
        'owner-a-wedding', '${token}', 'declined'::public.rsvp_status, null::smallint
      )::text as status;
    `);
    expect(rejected.rows).toEqual([{ status: null }]);
  });
});
