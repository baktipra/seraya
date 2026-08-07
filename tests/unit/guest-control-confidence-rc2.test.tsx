import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GuestControlConfidence } from '@/components/projects/guest-control-confidence';
import { deriveGuestControlConfidence } from '@/modules/readiness/guest-control-confidence';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

function createGuests(
  overrides: Partial<WeddingReadinessV1['guests']> = {},
): WeddingReadinessV1['guests'] {
  return {
    activeGuestCount: 5,
    activePersonalLinkGuestCount: 3,
    guestsWithoutActivePersonalLinkCount: 2,
    needsLinkUpdateCount: 2,
    needsWhatsAppCount: 1,
    noPersonalInvitationCount: 1,
    readyToDistributeCount: 1,
    whatsappAvailableCount: 4,
    whatsappUnavailableCount: 1,
    ...overrides,
  };
}

describe('RC2 guest control and link lifecycle confidence', () => {
  it('derives the Tamu lifecycle buckets from existing readiness aggregates', () => {
    expect(deriveGuestControlConfidence(createGuests())).toEqual({
      activeGuestCount: 5,
      attentionCount: 3,
      manageableLinkCount: 2,
      missingLinkCount: 1,
      needsUpdateCount: 2,
      state: 'needs_attention',
    });
  });

  it('shows four owner-safe lifecycle totals and one quiet Tamu handoff', () => {
    const markup = renderToStaticMarkup(
      <GuestControlConfidence guests={createGuests()} projectId="project-id" />,
    );

    expect(markup).toContain('data-guest-control-state="needs_attention"');
    expect(markup).toContain('Beberapa akses tamu perlu ditinjau');
    expect(markup).toContain('Tamu aktif');
    expect(markup).toContain('Link dapat dikelola');
    expect(markup).toContain('Belum mempunyai link');
    expect(markup).toContain('Perlu diperbarui');
    expect(markup).toContain('href="/dashboard/project-id/guests"');
    expect(markup).toContain('link personal yang masih aktif tetap berlaku');
    expect(markup).toContain('bukan bukti undangan sudah dikirim, dibuka, atau dibaca');
    expect(markup).not.toMatch(/token_hash|token_ciphertext|whatsapp_phone_e164|display_name/);
  });

  it('distinguishes managed, setup, and empty guest-control states', () => {
    const managed = renderToStaticMarkup(
      <GuestControlConfidence
        guests={createGuests({
          activeGuestCount: 3,
          activePersonalLinkGuestCount: 3,
          guestsWithoutActivePersonalLinkCount: 0,
          needsLinkUpdateCount: 0,
          needsWhatsAppCount: 1,
          noPersonalInvitationCount: 0,
          readyToDistributeCount: 2,
        })}
        projectId="project-id"
      />,
    );
    const setup = renderToStaticMarkup(
      <GuestControlConfidence
        guests={createGuests({
          activeGuestCount: 2,
          activePersonalLinkGuestCount: 0,
          guestsWithoutActivePersonalLinkCount: 2,
          needsLinkUpdateCount: 0,
          needsWhatsAppCount: 0,
          noPersonalInvitationCount: 2,
          readyToDistributeCount: 0,
        })}
        projectId="project-id"
      />,
    );
    const empty = renderToStaticMarkup(
      <GuestControlConfidence
        guests={createGuests({
          activeGuestCount: 0,
          activePersonalLinkGuestCount: 0,
          guestsWithoutActivePersonalLinkCount: 0,
          needsLinkUpdateCount: 0,
          needsWhatsAppCount: 0,
          noPersonalInvitationCount: 0,
          readyToDistributeCount: 0,
        })}
        projectId="project-id"
      />,
    );

    expect(managed).toContain('data-guest-control-state="managed"');
    expect(managed).toContain('Akses tamu terkendali');
    expect(setup).toContain('data-guest-control-state="needs_setup"');
    expect(setup).toContain('Undangan Pribadi belum disiapkan');
    expect(empty).toContain('data-guest-control-state="no_guests"');
    expect(empty).toContain('Belum ada tamu aktif');
  });

  it('reuses canonical lifecycle aggregates without adding queries or mutating link actions', () => {
    const repositorySource = readFileSync(
      'src/modules/readiness/wedding-readiness.repository.ts',
      'utf8',
    );
    const overviewSource = readFileSync(
      'src/components/projects/project-overview-bootstrap.tsx',
      'utf8',
    );
    const tamuSource = readFileSync(
      'src/components/projects/native-guest-manager-workspace.tsx',
      'utf8',
    );

    expect(repositorySource).toContain('createLatestGuestLinkLifecycleMap');
    expect(repositorySource).toContain('minimumQueryCount: 3');
    expect(repositorySource.match(/\.from\(/g)).toHaveLength(3);
    expect(overviewSource).toContain('readiness.guests.activeGuestCount');
    expect(overviewSource).toContain('readiness.guests.readyToDistributeCount');
    expect(overviewSource).toContain("href: `${base}/guests` as Route");
    expect(overviewSource).not.toContain('.from(');
    expect(tamuSource).toContain(
      'Publikasi ulang memperbarui isi undangan tanpa mengganti link aktif.',
    );
  });
});
