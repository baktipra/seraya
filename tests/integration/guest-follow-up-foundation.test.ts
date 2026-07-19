import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const migrationsDirectory = path.join(repositoryRoot, 'supabase', 'migrations');

const userA = '11111111-1111-1111-1111-111111111111';
const userB = '22222222-2222-2222-2222-222222222222';
const projectA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const projectB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const guestA = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
const guestB = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';

let database: PGlite;

async function executeMigrations(db: PGlite) {
  await db.exec(`
    create schema extensions;
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
    sql = sql
      .replace(/^create extension if not exists pgcrypto with schema extensions;\n/m, '')
      .replace(/^create extension if not exists citext with schema extensions;\n/m, '')
      .replaceAll('extensions.citext', 'text');
    await db.exec(sql);
  }
}

async function resetToDatabaseOwner() {
  await database.exec('reset role;');
  await database.exec(`select set_config('request.jwt.claim.sub', '', false);`);
}

async function impersonateAuthenticatedUser(userId: string) {
  await database.exec('reset role;');
  await database.exec(
    `select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`,
  );
}

async function impersonateAnonymousUser() {
  await database.exec('reset role;');
  await database.exec(`select set_config('request.jwt.claim.sub', '', false); set role anon;`);
}

async function appendEvent(input: {
  createdBy?: string;
  guestId?: string;
  metadata?: string;
  projectId?: string;
}) {
  await resetToDatabaseOwner();
  return database.query<{ event_id: string }>(`
    select public.append_guest_follow_up_event_for_server(
      '${input.projectId ?? projectA}',
      '${input.guestId ?? guestA}',
      '${input.createdBy ?? userA}',
      'handoff_prepared',
      'initial_invitation',
      'whatsapp',
      now(),
      '${input.metadata ?? '{"source_surface":"delivery"}'}'::jsonb
    ) as event_id;
  `);
}

describe('M0021 guest follow-up domain and persistence foundation', () => {
  beforeEach(async () => {
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

      insert into public.guests (id, project_id, display_name, whatsapp_phone_e164)
      values
        ('${guestA}', '${projectA}', 'Guest A', '+628111111111'),
        ('${guestB}', '${projectB}', 'Guest B', '+628222222222');
    `);
  }, 30_000);

  afterEach(async () => {
    await database.close();
  });

  it('persists only the narrow append event contract', async () => {
    const result = await appendEvent({});
    expect(result.rows[0]?.event_id).toMatch(/^[0-9a-f-]{36}$/u);

    const events = await database.query<{
      channel: string;
      event_type: string;
      message_kind: string;
      metadata: Record<string, string>;
      project_id: string;
      guest_id: string;
      created_by: string;
    }>(`
      select project_id, guest_id, created_by, event_type, message_kind, channel, metadata
      from public.guest_follow_up_events;
    `);

    expect(events.rows).toEqual([
      {
        channel: 'whatsapp',
        created_by: userA,
        event_type: 'handoff_prepared',
        guest_id: guestA,
        message_kind: 'initial_invitation',
        metadata: { source_surface: 'delivery' },
        project_id: projectA,
      },
    ]);
  });

  it('allows owners to read only events from their own active project', async () => {
    await appendEvent({});

    await impersonateAuthenticatedUser(userA);
    const ownerAEvents = await database.query<{ guest_id: string }>(
      'select guest_id from public.guest_follow_up_events',
    );
    expect(ownerAEvents.rows).toEqual([{ guest_id: guestA }]);

    await impersonateAuthenticatedUser(userB);
    const ownerBEvents = await database.query<{ guest_id: string }>(
      'select guest_id from public.guest_follow_up_events',
    );
    expect(ownerBEvents.rows).toEqual([]);
  });

  it('keeps anonymous reads and authenticated browser mutations closed', async () => {
    await appendEvent({});

    await impersonateAnonymousUser();
    await expect(database.query('select id from public.guest_follow_up_events')).rejects.toThrow(
      /permission denied/i,
    );

    await impersonateAuthenticatedUser(userA);
    await expect(
      database.query(`
        insert into public.guest_follow_up_events (
          project_id, guest_id, created_by, event_type, message_kind, channel
        ) values (
          '${projectA}', '${guestA}', '${userA}',
          'handoff_prepared', 'initial_invitation', 'whatsapp'
        );
      `),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      database.query(`
        update public.guest_follow_up_events
        set message_kind = 'other';
      `),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      database.query(`
        select public.append_guest_follow_up_event_for_server(
          '${projectA}', '${guestA}', '${userA}',
          'handoff_prepared', 'initial_invitation', 'whatsapp', now(), '{}'::jsonb
        );
      `),
    ).rejects.toThrow(/permission denied/i);
  });

  it('rejects cross-project, wrong-owner, inactive-guest, and unsafe metadata writes', async () => {
    await expect(appendEvent({ guestId: guestB, projectId: projectA })).rejects.toThrow(
      /target is unavailable/i,
    );

    await expect(appendEvent({ createdBy: userB })).rejects.toThrow(/target is unavailable/i);

    await resetToDatabaseOwner();
    await database.exec(`update public.guests set deleted_at = now() where id = '${guestA}'`);
    await expect(appendEvent({})).rejects.toThrow(/target is unavailable/i);

    await resetToDatabaseOwner();
    await database.exec(`update public.guests set deleted_at = null where id = '${guestA}'`);
    await expect(
      appendEvent({ metadata: '{"personal_url":"https://example.test/secret"}' }),
    ).rejects.toThrow(/invalid guest follow-up metadata/i);
  });
});
