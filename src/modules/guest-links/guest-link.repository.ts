import 'server-only';

import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createPublicSupabaseClient } from '@/server/supabase/public';

import type { GuestLinkStateRecord } from './guest-link.types';

const ownerStateSelect = 'guest_id, status';

export class GuestLinkRepositoryError extends Error {
  constructor() {
    super('The personal guest-link repository could not complete the request.');
    this.name = 'GuestLinkRepositoryError';
  }
}

/** Never selects token_hash: dashboard DTOs must only receive factual link state. */
export async function listGuestLinkStatesForVerifiedGuestIds(guestIds: string[]) {
  if (guestIds.length === 0) {
    return [] as GuestLinkStateRecord[];
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('guest_links')
    .select(ownerStateSelect)
    .in('guest_id', guestIds);

  if (error) {
    throw new GuestLinkRepositoryError();
  }

  return (data ?? []) as GuestLinkStateRecord[];
}

/** Atomic, service-role-only mutation after Server Action ownership verification. */
export async function replacePersonalGuestLinkForVerifiedGuest(input: {
  guestId: string;
  tokenHash: string;
}) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('replace_personal_guest_link_for_server', {
    new_token_hash: input.tokenHash,
    target_guest_id: input.guestId,
  });

  if (error) {
    throw new GuestLinkRepositoryError();
  }
}

/** Atomic service-role-only revocation after Server Action ownership verification. */
export async function revokePersonalGuestLinkForVerifiedGuest(guestId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc('revoke_personal_guest_link_for_server', {
    target_guest_id: guestId,
  });

  if (error || data !== true) {
    throw new GuestLinkRepositoryError();
  }
}

/** Anonymous-safe capability resolution. Returned columns intentionally omit all IDs/hashes. */
export async function resolvePersonalGuestInvitationRecord(input: { slug: string; token: string }) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('resolve_personal_guest_invitation', {
    raw_token: input.token,
    requested_slug: input.slug,
  });

  if (error) {
    throw new GuestLinkRepositoryError();
  }

  return Array.isArray(data) ? (data[0] ?? null) : null;
}

/** Anonymous-safe RSVP mutation. No project or guest identifiers are accepted. */
export async function submitPersonalGuestRsvpRecord(input: {
  slug: string;
  status: 'attending' | 'declined';
  token: string;
}) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('submit_personal_guest_rsvp', {
    raw_token: input.token,
    requested_slug: input.slug,
    requested_status: input.status,
  });

  if (error) {
    throw new GuestLinkRepositoryError();
  }

  return data === 'attending' || data === 'declined' ? data : null;
}
