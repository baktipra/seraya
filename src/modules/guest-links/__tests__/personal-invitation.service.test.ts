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

describe('SRY-013 anonymous personal invitation service', () => {
  beforeEach(() => {
    resolveRecordMock.mockReset();
    submitRecordMock.mockReset();
  });

  it('maps only snapshot, linked display name, and current RSVP state from a narrow resolver', async () => {
    const token = randomBytes(32).toString('base64url');
    resolveRecordMock.mockResolvedValue({
      guest_display_name: 'Keluarga Budi',
      rsvp_status: 'pending',
      snapshot,
      template_id: 'roselle',
    });

    await expect(getPersonalGuestInvitationByToken({ slug: 'raka-nadia', token })).resolves.toEqual(
      {
        guestDisplayName: 'Keluarga Budi',
        rsvpStatus: 'pending',
        snapshot,
        templateId: 'roselle',
      },
    );

    expect(resolveRecordMock).toHaveBeenCalledWith({ slug: 'raka-nadia', token });
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

  it('accepts attending/declined only and forwards no client identity into RSVP mutation', async () => {
    const token = randomBytes(32).toString('base64url');
    submitRecordMock.mockResolvedValue('attending');

    await expect(
      submitPersonalGuestRsvp({ slug: 'raka-nadia', status: 'attending', token }),
    ).resolves.toBe('attending');
    await expect(
      submitPersonalGuestRsvp({ slug: 'raka-nadia', status: 'pending', token }),
    ).resolves.toBeNull();

    expect(submitRecordMock).toHaveBeenCalledWith({
      slug: 'raka-nadia',
      status: 'attending',
      token,
    });
    expect(submitRecordMock).toHaveBeenCalledTimes(1);
  });
});
