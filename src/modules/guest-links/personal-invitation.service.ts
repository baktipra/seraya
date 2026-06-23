import 'server-only';

import { isSafePublicInvitationSlug } from '@/modules/publications/public-invitation.repository';
import { publishedInvitationSnapshotSchema } from '@/modules/publications/published-invitation.schema';
import { z } from 'zod';

import {
  GuestLinkRepositoryError,
  resolvePersonalGuestInvitationRecord,
  submitPersonalGuestRsvpRecord,
} from './guest-link.repository';
import { isValidPersonalGuestToken } from './guest-link-token';
import type { PersonalGuestInvitation } from './guest-link.types';

const personalGuestInvitationRecordSchema = z
  .object({
    guest_display_name: z.string().trim().min(1).max(120),
    rsvp_status: z.enum(['pending', 'attending', 'declined']),
    snapshot: publishedInvitationSnapshotSchema,
    template_id: z.literal('roselle'),
  })
  .strict();

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

/** Returns only the updated RSVP choice; unavailable/mismatched capability is indistinguishable. */
export async function submitPersonalGuestRsvp(input: {
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

  try {
    return await submitPersonalGuestRsvpRecord({
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
