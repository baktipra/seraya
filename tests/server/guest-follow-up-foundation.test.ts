import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  GuestFollowUpValidationError,
  normalizeGuestFollowUpMetadata,
} from '../../src/modules/follow-up/follow-up.validation';

describe('Guest Follow-up Slice A foundation', () => {
  it('normalizes only allowlisted non-sensitive metadata', () => {
    expect(
      normalizeGuestFollowUpMetadata({
        noteCategory: '  reminder-needed ',
        sourceSurface: ' delivery ',
        templateVersion: ' v1 ',
      }),
    ).toEqual({
      noteCategory: 'reminder-needed',
      sourceSurface: 'delivery',
      templateVersion: 'v1',
    });

    expect(normalizeGuestFollowUpMetadata(undefined)).toEqual({});
    expect(() => normalizeGuestFollowUpMetadata({ personalUrl: 'secret' } as never)).toThrow(
      GuestFollowUpValidationError,
    );
    expect(() => normalizeGuestFollowUpMetadata({ sourceSurface: '   ' })).toThrow(
      GuestFollowUpValidationError,
    );
    expect(() => normalizeGuestFollowUpMetadata({ templateVersion: 'x'.repeat(81) })).toThrow(
      GuestFollowUpValidationError,
    );
  });

  it('keeps server authority narrow and capability-free', async () => {
    const migration = await readFile(
      path.resolve(
        process.cwd(),
        'supabase/migrations/20260719000100_m0021_add_guest_follow_up_events.sql',
      ),
      'utf8',
    );
    const repository = await readFile(
      path.resolve(process.cwd(), 'src/modules/follow-up/follow-up.repository.ts'),
      'utf8',
    );
    const service = await readFile(
      path.resolve(process.cwd(), 'src/modules/follow-up/follow-up.service.ts'),
      'utf8',
    );

    expect(migration).toContain('create table public.guest_follow_up_events');
    expect(migration).toContain(
      'alter table public.guest_follow_up_events enable row level security',
    );
    expect(migration).toContain(
      'grant select on table public.guest_follow_up_events to authenticated',
    );
    expect(migration).toContain(
      'revoke all on table public.guest_follow_up_events from service_role',
    );
    expect(migration).toContain('append_guest_follow_up_event_for_server');
    expect(migration).toContain(
      "normalized_metadata - array['source_surface', 'template_version', 'note_category']",
    );
    expect(migration).not.toMatch(
      /token_ciphertext|token_hash|personal_url|message_body|whatsapp_phone/u,
    );

    expect(repository).toContain(".rpc('append_guest_follow_up_event_for_server'");
    expect(repository).toContain(".eq('project_id', project.id)");
    expect(repository).not.toMatch(/personalUrl|rawToken|tokenCiphertext|whatsappPhone/u);

    expect(service).toContain('getOwnedProjectById(projectId, user.id)');
    expect(service).toContain('assertGuestBelongsToProject');
    expect(service).toContain('normalizeGuestFollowUpMetadata');
    expect(service).not.toContain('publishInvitation');
  });
});
