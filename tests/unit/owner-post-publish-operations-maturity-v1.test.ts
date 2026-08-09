import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('SERAYA Owner Post-Publish Operations Maturity V1', () => {
  it('keeps exactly five canonical owner destinations', () => {
    const navigation = read('src/components/dashboard/project-navigation.tsx');
    const labels = [...navigation.matchAll(/label: '([^']+)'/g)].map((match) => match[1]);

    expect(labels).toEqual(['Ringkasan', 'Undangan', 'Tamu', 'Bagikan', 'Respons Tamu']);
    expect(labels).not.toContain('Tindak Lanjut');
  });

  it('drives Ringkasan from the shared project compass with one priority action', () => {
    const overview = read('src/components/projects/project-overview-bootstrap.tsx');

    expect(overview).toContain('deriveProjectCompassNextStep');
    expect(overview).toContain('data-owner-post-publish-operations="v1"');
    expect(overview.match(/data-owner-priority-action/g)).toHaveLength(1);
    expect(overview).not.toContain('function getPriorityAction');
  });

  it('keeps Tindak Lanjut subordinate to the Bagikan authority', () => {
    const delivery = read('src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx');
    const legacyFollowUp = read('src/app/(dashboard)/dashboard/[projectId]/follow-up/page.tsx');

    expect(delivery).toContain("type DeliveryView = 'personal' | 'follow-up' | 'public';");
    expect(delivery).toContain('Undangan Pribadi');
    expect(delivery).toContain('Tindak Lanjut');
    expect(delivery).toContain('Story & QR Publik');
    expect(delivery).toContain('<CanonicalGuestFollowUpCenter');
    expect(legacyFollowUp).toContain(
      'redirect(`/dashboard/${projectId}/delivery?view=follow-up`);',
    );
  });

  it('connects Tamu to Bagikan and Respons to eligible follow-up without claiming delivery truth', () => {
    const guests = read('src/components/projects/native-guest-manager-workspace.tsx');
    const responses = read('src/app/(dashboard)/dashboard/[projectId]/rsvp/page.tsx');
    const followUp = read('src/components/projects/canonical-guest-follow-up-center.tsx');

    expect(guests).toContain('data-guest-to-delivery-handoff');
    expect(guests).toContain('Lanjut ke Bagikan');
    expect(responses).toContain('data-response-to-follow-up-handoff');
    expect(responses).toContain('delivery?view=follow-up&filter=awaiting_rsvp');
    expect(responses).toContain('Untuk tamu yang sudah masuk tahap handoff');
    expect(followUp).toContain('Seraya tidak menganggap');
    expect(followUp).toContain('pesan sudah terkirim, diterima, dibuka, atau dibaca');
  });

  it('projects only aggregate follow-up truth into readiness and preserves the legacy action contract', () => {
    const service = read('src/modules/readiness/wedding-readiness.service.ts');
    const types = read('src/modules/readiness/wedding-readiness.types.ts');

    expect(service).toContain('getGuestFollowUpCenterForVerifiedProject');
    expect(service).toContain('awaitingRsvpCount');
    expect(service).toContain('noFollowUpRecordedCount');
    expect(service).toContain('rsvpRespondedCount');
    expect(service).toContain('getPrimaryAction');
    expect(service).not.toContain('personalUrl');
    expect(types).toContain('followUp?:');
  });

  it('keeps mature follow-up priority after delivery preparation and before response review', () => {
    const compass = read('src/modules/readiness/project-compass.ts');

    const initialHandoffIndex = compass.indexOf('noFollowUpRecordedCount > 0');
    const awaitingRsvpIndex = compass.indexOf('awaitingRsvpCount > 0');
    const responseReviewIndex = compass.indexOf("'view_guest_responses'");

    expect(initialHandoffIndex).toBeGreaterThan(-1);
    expect(awaitingRsvpIndex).toBeGreaterThan(initialHandoffIndex);
    expect(responseReviewIndex).toBeGreaterThan(awaitingRsvpIndex);
    expect(compass).toContain("'/delivery?view=follow-up&filter=awaiting_rsvp'");
  });
});
