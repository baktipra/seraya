import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getDeliveryCenterMock,
  getOwnedProjectMock,
  listEventsMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  getDeliveryCenterMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  listEventsMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/delivery/delivery.service', () => ({
  getGuestDeliveryCenterForVerifiedProject: getDeliveryCenterMock,
}));
vi.mock('@/modules/guests/guest.repository', () => ({
  getActiveGuestForVerifiedProjectWithAdmin: vi.fn(),
}));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('../follow-up.repository', () => ({
  appendGuestFollowUpEventForVerifiedProject: vi.fn(),
  listGuestFollowUpEventsForVerifiedProject: listEventsMock,
}));

import {
  getGuestFollowUpCenterForCurrentUser,
  getGuestFollowUpCenterForVerifiedProject,
} from '../follow-up.service';

const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'published',
};

const deliveryRow = {
  displayName: 'Keluarga Budi',
  groupLabel: 'Keluarga',
  guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  maskedWhatsAppNumber: '+62••••7890',
  personalLinkReaccessState: 'recoverable' as const,
  personalLinkState: 'active' as const,
  rsvpStatus: 'pending' as const,
  whatsappAvailability: 'available' as const,
};

describe('Guest Follow-up Slice B service composition', () => {
  beforeEach(() => {
    getDeliveryCenterMock.mockReset();
    getOwnedProjectMock.mockReset();
    listEventsMock.mockReset();
    requireCurrentUserMock.mockReset();

    getDeliveryCenterMock.mockResolvedValue({
      isPublished: true,
      project,
      rows: [deliveryRow],
      summary: {},
    });
    listEventsMock.mockResolvedValue([
      {
        channel: 'whatsapp',
        createdBy: project.account_id,
        eventType: 'handoff_prepared',
        guestId: deliveryRow.guestId,
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        messageKind: 'initial_invitation',
        metadata: { sourceSurface: 'delivery' },
        occurredAt: '2027-01-03T00:00:00.000Z',
        projectId: project.id,
      },
    ]);
    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockResolvedValue(project);
  });

  it('composes the existing privacy-safe delivery authority with project-scoped events', async () => {
    const result = await getGuestFollowUpCenterForVerifiedProject(project);

    expect(getDeliveryCenterMock).toHaveBeenCalledWith(project);
    expect(listEventsMock).toHaveBeenCalledWith(project);
    expect(result).toMatchObject({
      isPublished: true,
      project,
      rows: [
        {
          followUpCount: 1,
          followUpSegment: 'awaiting_rsvp',
          guestId: deliveryRow.guestId,
          lastMessageKind: 'initial_invitation',
        },
      ],
      summary: {
        activeGuestCount: 1,
        awaitingRsvpCount: 1,
      },
    });
    expect(result.rows[0]).not.toHaveProperty('metadata');
    expect(result.rows[0]).not.toHaveProperty('createdBy');
    expect(result.rows[0]).not.toHaveProperty('whatsapp_phone_e164');
  });

  it('resolves current-user ownership before building the read model', async () => {
    const result = await getGuestFollowUpCenterForCurrentUser(project.id);

    expect(requireCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
    expect(getDeliveryCenterMock).toHaveBeenCalledWith(project);
    expect(result.project).toBe(project);
  });
});
