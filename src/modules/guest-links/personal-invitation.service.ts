import 'server-only';

import { isSafePublicInvitationSlug } from '@/modules/publications/public-invitation.repository';
import { INVITATION_TEMPLATE_KEYS } from '@/modules/invitation-templates/invitation-template.keys';
import { publishedInvitationSnapshotSchema } from '@/modules/publications/published-invitation.schema';
import { z } from 'zod';

import {
  GuestLinkRepositoryError,
  resolvePersonalGuestInvitationRecord,
  submitPersonalGuestRsvpRecord,
} from './guest-link.repository';
import { isValidPersonalGuestToken } from './guest-link-token';
import { parsePersonalRsvpFormData } from './personal-rsvp.schema';
import type { PersonalGuestInvitation } from './guest-link.types';

const personalGuestInvitationRecordSchema = z
  .object({
    guest_display_name: z.string().trim().min(1).max(120),
    party_size: z.number().int().min(1).max(20),
    rsvp_attendee_count: z.number().int().min(1).max(20).nullable(),
    rsvp_status: z.enum(['pending', 'attending', 'declined']),
    snapshot: publishedInvitationSnapshotSchema,
    template_id: z.enum(INVITATION_TEMPLATE_KEYS),
  })
  .strict()
  .superRefine((record, context) => {
    if (
      record.rsvp_attendee_count !== null &&
      (record.rsvp_status !== 'attending' || record.rsvp_attendee_count > record.party_size)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Personal RSVP state is invalid.',
        path: ['rsvp_attendee_count'],
      });
    }
  });

/**
 * Stateless public capability lookup. It deliberately does not use cookies,
 * dashboard context, account identity, or the cacheable public slug repository.
 */
export async function getPersonalGuestInvitationByToken(input: {
  slug: string;
  token: string;
}): Promise<PersonalGuestInvitation | null> {
  if (!isSafePublicInvitationSlug(input.slug) || !isValidPersonalGuestToken(input.token)) {
    return null;
  }

  try {
    const record = await resolvePersonalGuestInvitationRecord(input);

    if (!record) {
      return null;
    }

    const parsed = personalGuestInvitationRecordSchema.safeParse(record);
    if (!parsed.success) {
      return null;
    }

    return {
      guestDisplayName: parsed.data.guest_display_name,
      partySize: parsed.data.party_size,
      rsvpAttendeeCount: parsed.data.rsvp_attendee_count,
      rsvpStatus: parsed.data.rsvp_status,
      snapshot: parsed.data.snapshot,
      templateId: parsed.data.template_id,
    };
  } catch (error) {
    if (error instanceof GuestLinkRepositoryError) {
      return null;
    }

    throw error;
  }
}

/**
 * Returns only the updated RSVP choice. The database independently resolves the
 * active guest link and enforces the actual guest party-size ceiling.
 */
export async function submitPersonalGuestRsvp(input: {
  attendeeCount: number | null;
  slug: string;
  status: string;
  token: string;
}): Promise<'attending' | 'declined' | null> {
  if (
    !isSafePublicInvitationSlug(input.slug) ||
    !isValidPersonalGuestToken(input.token) ||
    (input.status !== 'attending' && input.status !== 'declined')
  ) {
    return null;
  }

  if (
    input.status === 'attending' &&
    (input.attendeeCount === null ||
      !Number.isSafeInteger(input.attendeeCount) ||
      input.attendeeCount < 1)
  ) {
    return null;
  }

  try {
    return await submitPersonalGuestRsvpRecord({
      attendeeCount: input.status === 'attending' ? input.attendeeCount : null,
      slug: input.slug,
      status: input.status,
      token: input.token,
    });
  } catch (error) {
    if (error instanceof GuestLinkRepositoryError) {
      return null;
    }

    throw error;
  }
}

/** Route handler-only shape validation. It accepts no guest or project identity. */
export function parsePersonalGuestRsvpSubmission(formData: FormData) {
  return parsePersonalRsvpFormData(formData);
}
