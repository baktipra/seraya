import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getInvitationThemePalette,
  INVITATION_TEMPLATE_KEYS,
  resolveInvitationThemePalette,
  resolveInvitationThemePaletteKey,
} from '../../src/modules/invitation-templates/core/theme-package.registry';
import { invitationEditorLocalContentReducer } from '../../src/modules/invitations/invitation-editor-local-state';
import { invitationDraftContentSchema } from '../../src/modules/invitations/invitation-draft.schema';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function createDraftFixture(templateKey: 'aruna' | 'laras' | 'roselle' = 'roselle') {
  return {
    closing: { enabled: false, message: null, signature: null },
    couple: {
      personOne: { displayName: 'Kirana', fullName: null, parentLine: null },
      personTwo: { displayName: 'Arga', fullName: null, parentLine: null },
    },
    digitalGift: { accounts: [], enabled: false, heading: null, lead: null },
    events: {
      ceremony: {
        date: '2027-08-17',
        enabled: true,
        endTime: null,
        startTime: '09:00',
        title: 'Akad Nikah',
      },
      enabled: true,
      primaryDate: '2027-08-17',
      reception: {
        date: null,
        enabled: false,
        endTime: null,
        startTime: null,
        title: null,
      },
    },
    eventSchedule: {
      events: [
        {
          date: '2027-08-17',
          endTime: null,
          id: '00000000-0000-4000-8000-000000000321',
          mapsUrl: null,
          startTime: '09:00',
          title: 'Akad Nikah',
          venueAddress: null,
          venueName: null,
        },
      ],
    },
    gallery: { enabled: false, imageIds: [] },
    hero: { eyebrow: null, subtitle: null, title: null },
    location: { address: null, enabled: false, mapsUrl: null, venueName: null },
    meta: { locale: 'id-ID' as const, timezone: 'Asia/Jakarta' },
    rsvp: { enabled: false, heading: null, lead: null },
    story: { body: null, enabled: false, heading: null },
    templateKey,
  };
}

describe('runtime invitation theme palette contract', () => {
  it.each([
    ['roselle', 'rose'],
    ['aruna', 'stone'],
    ['laras', 'midnight'],
  ] as const)('normalizes a missing %s palette to %s', (templateKey, paletteKey) => {
    const parsed = invitationDraftContentSchema.parse(createDraftFixture(templateKey));
    expect(parsed.paletteKey).toBe(paletteKey);
    expect(resolveInvitationThemePaletteKey(templateKey, undefined)).toBe(paletteKey);
  });

  it('preserves a valid palette and rejects cross-theme palette injection', () => {
    const valid = invitationDraftContentSchema.parse({
      ...createDraftFixture('aruna'),
      paletteKey: 'cobalt',
    });
    expect(valid.paletteKey).toBe('cobalt');
    expect(getInvitationThemePalette('aruna', 'cobalt')?.variables['--aruna-clay']).toBe('#315b9b');

    expect(() =>
      invitationDraftContentSchema.parse({
        ...createDraftFixture('aruna'),
        paletteKey: 'rose',
      }),
    ).toThrow('Palet tidak tersedia');
  });

  it('resets palette to the next package default when template changes', () => {
    const roselle = invitationDraftContentSchema.parse({
      ...createDraftFixture('roselle'),
      paletteKey: 'berry',
    });
    const aruna = invitationEditorLocalContentReducer(roselle, {
      templateKey: 'aruna',
      type: 'template',
    });

    expect(aruna.templateKey).toBe('aruna');
    expect(aruna.paletteKey).toBe('stone');
  });

  it.each(INVITATION_TEMPLATE_KEYS)('%s exposes runtime CSS variables', (templateKey) => {
    const palette = resolveInvitationThemePalette(templateKey, undefined);
    expect(Object.keys(palette.variables).length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(palette.variables).every((key) => key.startsWith('--'))).toBe(true);
  });

  it('wires one persisted palette through every invitation surface', () => {
    const renderer = readSource(
      'src/modules/invitation-templates/invitation-template-renderer.tsx',
    );
    const generic = readSource('src/app/[slug]/page.tsx');
    const personal = readSource('src/app/[slug]/g/[guestToken]/page.tsx');
    const savedPreview = readSource('src/app/(dashboard)/dashboard/[projectId]/preview/page.tsx');
    const localPreview = readSource('src/components/projects/invitation-editor-live-preview.tsx');

    expect(renderer).toContain('resolveInvitationThemePalette(templateKey, paletteKey)');
    expect(generic).toContain('paletteKey={snapshot.draft.paletteKey}');
    expect(personal).toContain('paletteKey={snapshot.draft.paletteKey}');
    expect(savedPreview).toContain('paletteKey={privateDraft.draft.content.paletteKey}');
    expect(localPreview).toContain('paletteKey={content.paletteKey}');
  });

  it('publishes an explicit validated palette into immutable snapshots', () => {
    const migration = readSource(
      'supabase/migrations/20260804002200_m0022_add_invitation_theme_palette_runtime.sql',
    );

    expect(migration).toContain("active_draft.content ->> 'paletteKey'");
    expect(migration).toContain("'{paletteKey}'");
    expect(migration).toContain("selected_palette_key in ('rose', 'sage', 'butter', 'berry')");
    expect(migration).toContain("selected_palette_key in ('stone', 'matcha', 'cobalt', 'apricot')");
    expect(migration).toContain(
      "selected_palette_key in ('midnight', 'burgundy', 'emerald', 'ivory')",
    );
  });
});
