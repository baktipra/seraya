import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system')>();
  return { ...actual, useToast: () => ({ toast: vi.fn() }) };
});

import { GuestResponseWorkspace } from '@/components/projects/guest-response-workspace';
import { getInvitationWorkspaceStatus } from '@/components/projects/invitation-editor';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('SRY-039 owner workspace IA reset', () => {
  it('keeps invitation publish state explicit for draft, published, and republish states', () => {
    expect(
      getInvitationWorkspaceStatus({
        identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
        invitation: {
          hasPublishedSnapshot: false,
          hasUnpublishedChanges: false,
          hasVerifiedActivation: true,
          publishedSlug: null,
          state: 'ready_to_publish',
        },
      }).badge,
    ).toBe('Siap diterbitkan');
    expect(
      getInvitationWorkspaceStatus({
        identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
        invitation: {
          hasPublishedSnapshot: true,
          hasUnpublishedChanges: false,
          hasVerifiedActivation: true,
          publishedSlug: 'raka-nadia',
          state: 'published',
        },
      }).badge,
    ).toBe('Sudah dipublikasikan');
    expect(
      getInvitationWorkspaceStatus({
        identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
        invitation: {
          hasPublishedSnapshot: true,
          hasUnpublishedChanges: true,
          hasVerifiedActivation: true,
          publishedSlug: 'raka-nadia',
          state: 'published_with_unpublished_changes',
        },
      }).badge,
    ).toBe('Perubahan belum diterbitkan');
  });

  it('renders Respons Tamu as RSVP plus ucapan monitoring without delivery or lifecycle actions', () => {
    const html = renderToStaticMarkup(
      <GuestResponseWorkspace
        analytics={{
          activeGuestCount: 2,
          attendingCountUnknownGuestCount: 0,
          attendingGuestCount: 1,
          confirmedAttendeeCount: 2,
          declinedGuestCount: 0,
          invitedPeopleCount: 3,
          pendingGuestCount: 1,
          pendingGuests: [{ displayName: 'Bima' }],
          respondedCount: 1,
          respondedPercentage: 50,
          responseRows: [
            {
              displayName: 'Alya',
              groupLabel: 'Keluarga',
              guestId: 'guest-1',
              partySize: 2,
              rsvpAttendeeCount: 2,
              rsvpStatus: 'attending',
              updatedAt: '2027-08-17T10:00:00.000Z',
            },
            {
              displayName: 'Bima',
              groupLabel: null,
              guestId: 'guest-2',
              partySize: 1,
              rsvpAttendeeCount: null,
              rsvpStatus: 'pending',
              updatedAt: '2027-08-17T11:00:00.000Z',
            },
          ],
        }}
        entries={[]}
        projectId={projectId}
        timezone="Asia/Jakarta"
      />,
    );
    expect(html).toContain('Respons Tamu');
    expect(html).toContain('Hadir');
    expect(html).toContain('Belum merespons');
    expect(html).toContain('Rombongan hadir');
    expect(html).toContain('Filter respons');
    expect(html).toContain('Ucapan');
    expect(html).toContain('Export XLSX');
    expect(html).toContain('aria-selected="false"');
    expect(html).not.toContain('Siapkan Undangan Pribadi');
    expect(html).not.toContain('Copy tautan');
    expect(html).not.toContain('Bagikan WhatsApp');
  });

  it('keeps data quality in Tamu and readiness in Bagikan without duplicate RSVP or lifecycle controls', async () => {
    const [guests, delivery, invitation] = await Promise.all([
      readFile(path.resolve(process.cwd(), 'src/components/projects/guest-manager.tsx'), 'utf8'),
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/guest-delivery-center.tsx'),
        'utf8',
      ),
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/invitation-editor.tsx'),
        'utf8',
      ),
    ]);
    expect(guests).toContain('Filter data');
    expect(guests).toContain('Tautan perlu diperbarui');
    expect(guests).not.toContain('Siap dibagikan');
    expect(delivery).toContain('Filter kesiapan');
    expect(delivery).toContain('Siap dibagikan');
    expect(delivery).not.toContain('Buat ulang tautan');
    expect(delivery).not.toContain('<option value="attending">');
    expect(delivery).not.toContain('<option value="pending">');
    expect(invitation).not.toContain('GuestDeliveryCenter');
    expect(invitation).not.toContain('GuestManager');
  });
});
