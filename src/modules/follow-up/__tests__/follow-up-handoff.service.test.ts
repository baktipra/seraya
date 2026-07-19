import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const {
  appendEventMock,
  buildHandoffMock,
  getDeliveryCenterMock,
  getGuestMock,
  getOwnedProjectMock,
  getSnapshotMock,
  listEventsMock,
  reaccessLinkMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  appendEventMock: vi.fn(),
  buildHandoffMock: vi.fn(),
  getDeliveryCenterMock: vi.fn(),
  getGuestMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  getSnapshotMock: vi.fn(),
  listEventsMock: vi.fn(),
  reaccessLinkMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/delivery/delivery.service', () => ({
  getGuestDeliveryCenterForVerifiedProject: getDeliveryCenterMock,
}));
vi.mock('@/modules/guest-links/guest-link.service', () => ({
  reaccessPersonalGuestLinkForVerifiedGuest: reaccessLinkMock,
}));
vi.mock('@/modules/guests/guest.repository', () => ({
  getActiveGuestForVerifiedProjectWithAdmin: getGuestMock,
}));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('@/modules/publications/publication.repository', () => ({
  getCurrentPublishedInvitationForVerifiedProject: getSnapshotMock,
}));
vi.mock('../follow-up-handoff', () => ({
  buildGuestFollowUpHandoff: buildHandoffMock,
}));
vi.mock('../follow-up.repository', () => ({
  appendGuestFollowUpEventForVerifiedProject: appendEventMock,
  listGuestFollowUpEventsForVerifiedProject: listEventsMock,
}));

import {
  GuestFollowUpHandoffNotEligibleError,
  GuestFollowUpPublicationRequiredError,
  GuestFollowUpRsvpUnavailableError,
  prepareGuestFollowUpHandoffForCurrentUser,
  prepareGuestFollowUpHandoffForVerifiedProject,
} from '../follow-up.service';

const project = {
  account_id: '11111111-1111-4111-8111-111111111111',
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

const guest = {
  created_at: '2026-06-21T00:00:00.000Z',
  deleted_at: null,
  display_name: 'Keluarga Budi',
  group_label: 'Keluarga',
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  party_size: 2,
  project_id: project.id,
  rsvp_attendee_count: null,
  rsvp_status: 'pending' as const,
  updated_at: '2026-06-21T00:00:00.000Z',
  whatsapp_phone_e164: '+6281234567890',
};

const row = {
  displayName: guest.display_name,
  eligibility: {
    canPrepareEventReminder: false,
    canPrepareInitialInvitation: true,
    canPrepareRsvpReminder: false,
  },
  followUpCount: 0,
  followUpSegment: 'no_follow_up_recorded' as const,
  groupLabel: guest.group_label,
  guestId: guest.id,
  lastFollowUpAt: null,
  lastMessageKind: null,
  maskedWhatsAppNumber: '+62••••7890',
  personalLinkReaccessState: 'recoverable' as const,
  personalLinkState: 'active' as const,
  rsvpStatus: guest.rsvp_status,
  whatsappAvailability: 'available' as const,
};

function publishedSnapshot(rsvpEnabled = true) {
  const draft = createDefaultInvitationDraftContent(project);
  draft.rsvp.enabled = rsvpEnabled;

  return {
    created_at: '2027-01-01T00:00:00.000Z',
    draft_schema_version: 1,
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    is_current: true,
    project_id: project.id,
    published_at: '2027-01-01T00:00:00.000Z',
    revision: 1,
    slug: project.slug,
    snapshot: {
      draft,
      project: {
        eventCity: project.event_city,
        eventDatePrimary: project.event_date_primary,
        slug: project.slug,
        timezone: project.default_timezone,
      },
    },
    template_id: 'roselle' as const,
  };
}

describe('Guest Follow-up Slice C manual handoff authority', () => {
  let currentSnapshot: ReturnType<typeof publishedSnapshot>;

  beforeEach(() => {
    appendEventMock.mockReset();
    buildHandoffMock.mockReset();
    getDeliveryCenterMock.mockReset();
    getGuestMock.mockReset();
    getOwnedProjectMock.mockReset();
    getSnapshotMock.mockReset();
    listEventsMock.mockReset();
    reaccessLinkMock.mockReset();
    requireCurrentUserMock.mockReset();

    appendEventMock.mockResolvedValue('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    buildHandoffMock.mockReturnValue({
      messageKind: 'initial_invitation',
      messageText: 'temporary message',
      personalUrl: 'https://seraya.example/raka-nadia/g/token',
      preparedAt: '2027-08-15T03:00:00.000Z',
      whatsappComposeUrl: 'https://wa.me/6281234567890?text=temporary',
    });
    getDeliveryCenterMock.mockResolvedValue({
      isPublished: true,
      project,
      rows: [
        {
          displayName: row.displayName,
          groupLabel: row.groupLabel,
          guestId: row.guestId,
          maskedWhatsAppNumber: row.maskedWhatsAppNumber,
          personalLinkReaccessState: row.personalLinkReaccessState,
          personalLinkState: row.personalLinkState,
          rsvpStatus: row.rsvpStatus,
          whatsappAvailability: row.whatsappAvailability,
        },
      ],
      summary: {},
    });
    getGuestMock.mockResolvedValue(guest);
    getOwnedProjectMock.mockResolvedValue(project);
    currentSnapshot = publishedSnapshot();
    getSnapshotMock.mockResolvedValue(currentSnapshot);
    listEventsMock.mockResolvedValue([]);
    reaccessLinkMock.mockResolvedValue({
      personalUrl: 'https://seraya.example/raka-nadia/g/token',
      recipientWhatsAppPhoneE164: guest.whatsapp_phone_e164,
    });
    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
  });

  it('appends a truthful event before returning temporary handoff material', async () => {
    const preparedAt = new Date('2027-08-15T03:00:00.000Z');
    const result = await prepareGuestFollowUpHandoffForVerifiedProject({
      guestId: guest.id,
      messageKind: 'initial_invitation',
      preparedAt,
      project,
    });

    expect(reaccessLinkMock).toHaveBeenCalledWith({ guest, project });
    expect(buildHandoffMock).toHaveBeenCalledWith({
      guestDisplayName: guest.display_name,
      messageKind: 'initial_invitation',
      personalUrl: 'https://seraya.example/raka-nadia/g/token',
      preparedAt: preparedAt.toISOString(),
      recipientWhatsAppPhoneE164: guest.whatsapp_phone_e164,
      snapshot: currentSnapshot.snapshot,
    });
    expect(appendEventMock).toHaveBeenCalledWith({
      channel: 'whatsapp',
      eventType: 'handoff_prepared',
      guestId: guest.id,
      messageKind: 'initial_invitation',
      metadata: {
        sourceSurface: 'follow_up_center',
        templateVersion: 'manual-handoff-v1',
      },
      occurredAt: preparedAt.toISOString(),
      project,
    });
    expect(appendEventMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      buildHandoffMock.mock.invocationCallOrder[0]!,
    );
    expect(result).toEqual(buildHandoffMock.mock.results[0]!.value);
    expect(JSON.stringify(appendEventMock.mock.calls[0])).not.toContain('personalUrl');
    expect(JSON.stringify(appendEventMock.mock.calls[0])).not.toContain('messageText');
    expect(JSON.stringify(appendEventMock.mock.calls[0])).not.toContain('+6281234567890');
  });

  it('does not expose a handoff when event persistence fails', async () => {
    appendEventMock.mockRejectedValue(new Error('database unavailable'));

    await expect(
      prepareGuestFollowUpHandoffForVerifiedProject({
        guestId: guest.id,
        messageKind: 'initial_invitation',
        project,
      }),
    ).rejects.toThrow('database unavailable');
  });

  it('rejects unpublished, ineligible, and RSVP-disabled operations before capability re-access', async () => {
    getSnapshotMock.mockResolvedValueOnce(null);
    await expect(
      prepareGuestFollowUpHandoffForVerifiedProject({
        guestId: guest.id,
        messageKind: 'initial_invitation',
        project,
      }),
    ).rejects.toBeInstanceOf(GuestFollowUpPublicationRequiredError);

    listEventsMock.mockResolvedValueOnce([
      {
        channel: 'whatsapp',
        createdBy: project.account_id,
        eventType: 'handoff_prepared',
        guestId: guest.id,
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        messageKind: 'initial_invitation',
        metadata: {},
        occurredAt: '2027-08-14T00:00:00.000Z',
        projectId: project.id,
      },
    ]);
    await expect(
      prepareGuestFollowUpHandoffForVerifiedProject({
        guestId: guest.id,
        messageKind: 'initial_invitation',
        project,
      }),
    ).rejects.toBeInstanceOf(GuestFollowUpHandoffNotEligibleError);

    getSnapshotMock.mockResolvedValueOnce(publishedSnapshot(false));
    listEventsMock.mockResolvedValueOnce([
      {
        channel: 'whatsapp',
        createdBy: project.account_id,
        eventType: 'handoff_prepared',
        guestId: guest.id,
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        messageKind: 'initial_invitation',
        metadata: {},
        occurredAt: '2027-08-14T00:00:00.000Z',
        projectId: project.id,
      },
    ]);
    await expect(
      prepareGuestFollowUpHandoffForVerifiedProject({
        guestId: guest.id,
        messageKind: 'rsvp_reminder',
        project,
      }),
    ).rejects.toBeInstanceOf(GuestFollowUpRsvpUnavailableError);

    expect(reaccessLinkMock).not.toHaveBeenCalled();
    expect(appendEventMock).not.toHaveBeenCalled();
  });

  it('resolves current-user ownership once before delegating to verified authority', async () => {
    await prepareGuestFollowUpHandoffForCurrentUser({
      guestId: guest.id,
      messageKind: 'initial_invitation',
      preparedAt: new Date('2027-08-15T03:00:00.000Z'),
      projectId: project.id,
    });

    expect(requireCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
  });
});
