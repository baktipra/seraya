import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deliveryCenterMock, eventListMock } = vi.hoisted(() => ({
  deliveryCenterMock: vi.fn(),
  eventListMock: vi.fn(),
}));

vi.mock('@/modules/follow-up/follow-up.repository', () => ({
  listGuestFollowUpEventsForVerifiedProject: eventListMock,
}));
vi.mock('../delivery.service', () => ({
  getGuestDeliveryCenterForVerifiedProject: deliveryCenterMock,
}));

import { getGuestDistributionCenterForVerifiedProject } from '../delivery-handoff.service';

const project = { id: 'project-id' };
const readyRow = {
  displayName: 'Keluarga Budi',
  groupLabel: null,
  guestId: 'guest-id',
  maskedWhatsAppNumber: '+62••••7890',
  personalLinkLifecycleState: 'active_recoverable' as const,
  personalLinkReaccessState: 'recoverable' as const,
  personalLinkState: 'active' as const,
  rsvpStatus: 'pending' as const,
  whatsappAvailability: 'available' as const,
};

describe('RC3 Bagikan handoff composition', () => {
  beforeEach(() => {
    deliveryCenterMock.mockReset();
    eventListMock.mockReset();
    deliveryCenterMock.mockResolvedValue({
      isPublished: true,
      project,
      rows: [readyRow],
      summary: {
        activeGuestCount: 1,
        needsLinkUpdateCount: 0,
        needsWhatsAppCount: 0,
        noPersonalInvitationCount: 0,
        readyToDistributeCount: 1,
      },
    });
    eventListMock.mockResolvedValue([]);
  });

  it('layers existing initial handoff truth without changing base readiness authority', async () => {
    eventListMock.mockResolvedValue([
      {
        eventType: 'handoff_prepared',
        guestId: readyRow.guestId,
        messageKind: 'initial_invitation',
        occurredAt: '2026-08-02T09:15:00.000Z',
      },
    ]);

    const result = await getGuestDistributionCenterForVerifiedProject(project as never);

    expect(deliveryCenterMock).toHaveBeenCalledWith(project);
    expect(eventListMock).toHaveBeenCalledWith(project);
    expect(result.summary.readyToDistributeCount).toBe(1);
    expect(result.handoffSummary).toEqual({
      awaitingRsvpCount: 1,
      contactRecordedCount: 0,
      handoffPreparedCount: 1,
      readyForHandoffCount: 0,
    });
    expect(result.rows[0]).toMatchObject({
      guestId: readyRow.guestId,
      initialHandoffPreparedAt: '2026-08-02T09:15:00.000Z',
    });
  });
});
