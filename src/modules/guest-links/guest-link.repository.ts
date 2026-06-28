import 'server-only';

import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createPublicSupabaseClient } from '@/server/supabase/public';

import type {
  ActiveRecoverableGuestLinkRecord,
  GuestLinkStateRecord,
  LatestGuestLinkStateRecord,
} from './guest-link.types';

const ownerStateSelect = 'guest_id, status';

export class GuestLinkRepositoryError extends Error {
  constructor() {
    super('The personal guest-link repository could not complete the request.');
    this.name = 'GuestLinkRepositoryError';
  }
}

/** The batch-only creation guard detected a concurrently active capability. */
export class GuestLinkActiveLinkExistsError extends Error {
  constructor() {
    super('An active personal guest link already exists.');
    this.name = 'GuestLinkActiveLinkExistsError';
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

/**
 * Owner delivery projection. It reads only status and nullable key-version
 * metadata to derive a boolean recoverability fact. Ciphertext, hash, raw token,
 * and raw URL never enter this list query or browser DTO.
 */
export async function listLatestGuestLinkStatesForVerifiedGuestIds(guestIds: string[]) {
  if (guestIds.length === 0) {
    return [] as LatestGuestLinkStateRecord[];
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .select('id, guest_links(status, created_at, token_key_version)')
    .in('id', guestIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false, foreignTable: 'guest_links' })
    .limit(1, { foreignTable: 'guest_links' });

  if (error) {
    throw new GuestLinkRepositoryError();
  }

  return (data ?? []).flatMap((guest) => {
    const guestLinks = Array.isArray(guest.guest_links) ? guest.guest_links : [];
    const latestLink = guestLinks[0];

    return latestLink
      ? [
          {
            created_at: latestLink.created_at,
            guest_id: guest.id,
            hasRecoverableCapability:
              latestLink.status === 'active' && latestLink.token_key_version !== null,
            status: latestLink.status,
          },
        ]
      : [];
  }) as LatestGuestLinkStateRecord[];
}

/**
 * Fetches encrypted capability material only after a service has independently
 * verified owner, project, and active-guest scope. Never call from a list path.
 */
export async function getActiveRecoverableGuestLinkRecordForVerifiedGuest(guestId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('guest_links')
    .select('guest_id, token_hash, token_ciphertext, token_key_version')
    .eq('guest_id', guestId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new GuestLinkRepositoryError();
  }

  return (data ?? null) as ActiveRecoverableGuestLinkRecord | null;
}

/** Legacy low-level authority retained for historical callers only. */
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

/** Atomic owner replacement that persists hash plus encrypted capability material. */
export async function replacePersonalGuestLinkWithCiphertextForVerifiedGuest(input: {
  guestId: string;
  tokenCiphertext: string;
  tokenHash: string;
  tokenKeyVersion: number;
}) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('replace_personal_guest_link_with_ciphertext_for_server', {
    new_token_ciphertext: input.tokenCiphertext,
    new_token_hash: input.tokenHash,
    new_token_key_version: input.tokenKeyVersion,
    target_guest_id: input.guestId,
  });

  if (error) {
    throw new GuestLinkRepositoryError();
  }
}

/** Legacy batch authority retained for historical callers only. */
export async function createPersonalGuestLinkIfNoneActiveForVerifiedGuest(input: {
  guestId: string;
  tokenHash: string;
}) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('create_personal_guest_link_if_none_active_for_server', {
    new_token_hash: input.tokenHash,
    target_guest_id: input.guestId,
  });

  if (error?.code === 'P0001') {
    throw new GuestLinkActiveLinkExistsError();
  }

  if (error) {
    throw new GuestLinkRepositoryError();
  }
}

/** Atomic batch-only creation without replacing a concurrently active capability. */
export async function createPersonalGuestLinkIfNoneActiveWithCiphertextForVerifiedGuest(input: {
  guestId: string;
  tokenCiphertext: string;
  tokenHash: string;
  tokenKeyVersion: number;
}) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc(
    'create_personal_guest_link_if_none_active_with_ciphertext_for_server',
    {
      new_token_ciphertext: input.tokenCiphertext,
      new_token_hash: input.tokenHash,
      new_token_key_version: input.tokenKeyVersion,
      target_guest_id: input.guestId,
    },
  );

  if (error?.code === 'P0001') {
    throw new GuestLinkActiveLinkExistsError();
  }

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
  attendeeCount: number | null;
  slug: string;
  status: 'attending' | 'declined';
  token: string;
}) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('submit_personal_guest_rsvp', {
    raw_token: input.token,
    requested_attendee_count: input.attendeeCount,
    requested_slug: input.slug,
    requested_status: input.status,
  });

  if (error) {
    throw new GuestLinkRepositoryError();
  }

  return data === 'attending' || data === 'declined' ? data : null;
}
