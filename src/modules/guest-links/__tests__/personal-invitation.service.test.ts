import { randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const { resolveRecordMock, submitRecordMock } = vi.hoisted(() => ({
  resolveRecordMock: vi.fn(),
  submitRecordMock: vi.fn(),
}));

vi.mock('../guest-link.repository', () => ({
  GuestLinkRepositoryError: class GuestLinkRepositoryError extends Error {},
  resolvePersonalGuestInvitationRecord: resolveRecordMock,
  submitPersonalGuestRsvpRecord: submitRecordMock,
}));

import {
  getPersonalGuestInvitationByToken,
  parsePersonalGuestRsvpSubmission,
  submitPersonalGuestRsvp,
} from '../personal-invitation.service';

const snapshot = {
  draft: createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-08-17',
    person_one_name: 'Raka',
    person_two_name: 'Nadia',
  }),
  project: {
    eventCity: 'Jakarta',
    eventDatePrimary: '2027-08-17',
    slug: 'raka-nadia',
    timezone: 'Asia/Jakarta',
  },
};

describe('SRY-028 anonymous personal RSVP service', () => {
  beforeEach(() => {
    resolveRecordMock.mockReset();
    submitRecordMock.mockReset();
  });

  it('maps only snapshot, linked display name, and that guest’s RSVP/party fields from a narrow resolver', async () => {
    const token = randomBytes(32).toString('base64url');
    resolveRecordMock.mockResolvedValue({
      guest_display_name: 'Keluarga Budi',
      party_size: 4,
      rsvp_attendee_count: 2,
      rsvp_status: 'attending',
      snapshot,
      template_id: 'roselle',
    });

    await expect(getPersonalGuestInvitationByToken({ slug: 'raka-nadia', token })).resolves.toEqual(
      {
        guestDisplayName: 'Keluarga Budi',
        partySize: 4,
        rsvpAttendeeCount: 2,
        rsvpStatus: 'attending',
        snapshot,
        templateId: 'roselle',
      },
    );

    expect(resolveRecordMock).toHaveBeenCalledWith({ slug: 'raka-nadia', token });
  });

  it('normalizes legacy personal snapshot data without digitalGift before route rendering', async () => {
    const token = randomBytes(32).toString('base64url');
    const legacyDraft = { ...snapshot.draft };
    delete (legacyDraft as Partial<typeof legacyDraft>).digitalGift;
    resolveRecordMock.mockResolvedValue({
      guest_display_name: 'Keluarga Budi',
      party_size: 1,
      rsvp_attendee_count: null,
      rsvp_status: 'pending',
      snapshot: { ...snapshot, draft: legacyDraft },
      template_id: 'roselle',
    });

    await expect(
      getPersonalGuestInvitationByToken({ slug: 'raka-nadia', token }),
    ).resolves.toMatchObject({
      snapshot: {
        draft: {
          digitalGift: { accounts: [], enabled: false, heading: null, lead: null },
        },
      },
    });
  });

  it('rejects a resolver payload that tries to retain an attendance count outside the resolved party limit', async () => {
    const token = randomBytes(32).toString('base64url');
    resolveRecordMock.mockResolvedValue({
      guest_display_name: 'Keluarga Budi',
      party_size: 2,
      rsvp_attendee_count: 3,
      rsvp_status: 'attending',
      snapshot,
      template_id: 'roselle',
    });

    await expect(
      getPersonalGuestInvitationByToken({ slug: 'raka-nadia', token }),
    ).resolves.toBeNull();
  });

  it('uses the same unavailable result for invalid capability and malformed resolver output', async () => {
    await expect(
      getPersonalGuestInvitationByToken({ slug: 'raka-nadia', token: 'invalid' }),
    ).resolves.toBeNull();
    expect(resolveRecordMock).not.toHaveBeenCalled();

    const token = randomBytes(32).toString('base64url');
    resolveRecordMock.mockResolvedValue({ guest_display_name: 'Keluarga Budi' });
    await expect(
      getPersonalGuestInvitationByToken({ slug: 'raka-nadia', token }),
    ).resolves.toBeNull();
  });

  it('requires a whole positive count for attending, clears count for declined, and forwards no client identity', async () => {
    const token = randomBytes(32).toString('base64url');
    submitRecordMock.mockResolvedValue('attending');

    await expect(
      submitPersonalGuestRsvp({ attendeeCount: 2, slug: 'raka-nadia', status: 'attending', token }),
    ).resolves.toBe('attending');
    await expect(
      submitPersonalGuestRsvp({
        attendeeCount: null,
        slug: 'raka-nadia',
        status: 'attending',
        token,
      }),
    ).resolves.toBeNull();
    await expect(
      submitPersonalGuestRsvp({
        attendeeCount: 999,
        slug: 'raka-nadia',
        status: 'declined',
        token,
      }),
    ).resolves.toBe('attending');

    expect(submitRecordMock).toHaveBeenNthCalledWith(1, {
      attendeeCount: 2,
      slug: 'raka-nadia',
      status: 'attending',
      token,
    });
    expect(submitRecordMock).toHaveBeenNthCalledWith(2, {
      attendeeCount: null,
      slug: 'raka-nadia',
      status: 'declined',
      token,
    });
  });

  it('parses only status and attendee count from the anonymous form payload', () => {
    const formData = new FormData();
    formData.set('status', 'attending');
    formData.set('attendeeCount', '2');
    formData.set('guestId', 'attacker-controlled');
    formData.set('partySize', '999');

    expect(parsePersonalGuestRsvpSubmission(formData)).toEqual({
      data: { attendeeCount: 2, status: 'attending' },
      success: true,
    });

    for (const invalidCount of ['0', '-1', '1.5', '', '2.0']) {
      formData.set('attendeeCount', invalidCount);
      expect(parsePersonalGuestRsvpSubmission(formData)).toEqual({ success: false });
    }
  });
});
