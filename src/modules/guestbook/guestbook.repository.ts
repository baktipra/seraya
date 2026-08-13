import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createPublicSupabaseClient } from '@/server/supabase/public';
import { createServerSupabaseClient } from '@/server/supabase/server';

import type {
  OwnerGuestbookEntry,
  PersonalGuestbookEntry,
  PersonalGuestbookSharedWish,
} from './guestbook.types';

const ownerGuestbookSelect =
  'id, guest_id, message, share_with_guests, hidden_from_guest_feed, created_at, updated_at, guests!inner(display_name, group_label, project_id, deleted_at)';

export class GuestbookRepositoryError extends Error {
  constructor() {
    super('The guestbook repository could not complete the request.');
    this.name = 'GuestbookRepositoryError';
  }
}

/** One bounded owner-scoped inbox query. No guest links or unrelated guest data. */
export async function listGuestbookEntriesForVerifiedProject(
  project: OwnedProject,
): Promise<OwnerGuestbookEntry[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('guestbook_entries')
    .select(ownerGuestbookSelect)
    .eq('guests.project_id', project.id)
    .is('deleted_at', null)
    .is('guests.deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new GuestbookRepositoryError();

  return (data ?? []).flatMap((record) => {
    const guest = Array.isArray(record.guests) ? record.guests[0] : record.guests;
    if (
      !guest ||
      typeof record.id !== 'string' ||
      typeof record.message !== 'string' ||
      typeof record.created_at !== 'string' ||
      typeof record.updated_at !== 'string' ||
      typeof guest.display_name !== 'string'
    ) return [];

    return [{
      createdAt: record.created_at,
      groupLabel: typeof guest.group_label === 'string' ? guest.group_label : null,
      guestDisplayName: guest.display_name,
      guestId: typeof record.guest_id === 'string' ? record.guest_id : undefined,
      hiddenFromGuestFeed: record.hidden_from_guest_feed === true,
      id: record.id,
      message: record.message,
      shareWithGuests: record.share_with_guests === true,
      updatedAt: record.updated_at,
    }];
  });
}

/** Server-authorized soft removal after owner + project verification. */
export async function softRemoveGuestbookEntryForVerifiedProject(input: {
  entryId: string;
  project: OwnedProject;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from('guestbook_entries')
    .select('id, guests!inner(project_id, deleted_at)')
    .eq('id', input.entryId)
    .is('deleted_at', null)
    .maybeSingle();

  const guest = existing
    ? Array.isArray(existing.guests) ? existing.guests[0] : existing.guests
    : null;

  if (
    existingError || !existing || !guest ||
    guest.project_id !== input.project.id || guest.deleted_at !== null
  ) throw new GuestbookRepositoryError();

  const { data, error } = await supabase
    .from('guestbook_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.entryId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error || !data) throw new GuestbookRepositoryError();
}

/** Anonymous-safe capability lookup that returns only the current recipient's own entry. */
export async function resolvePersonalGuestbookEntryRecord(input: { slug: string; token: string }) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('resolve_personal_guestbook_entry_v2', {
    raw_token: input.token,
    requested_slug: input.slug,
  });
  if (error) throw new GuestbookRepositoryError();
  return Array.isArray(data) ? (data[0] ?? null) : null;
}

/** Anonymous-safe upsert using the v2 sharing-consent contract. */
export async function submitPersonalGuestbookEntryRecord(input: {
  message: string;
  shareWithGuests: boolean;
  slug: string;
  token: string;
}) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('submit_personal_guestbook_entry_v2', {
    raw_token: input.token,
    requested_message: input.message,
    requested_share_with_guests: input.shareWithGuests,
    requested_slug: input.slug,
  });
  if (error) throw new GuestbookRepositoryError();
  return data === 'created' || data === 'updated' ? data : null;
}

/** Personal-only shared feed. The database enforces project, consent, and moderation boundaries. */
export async function listPersonalGuestbookSharedWishesRecords(input: {
  limit?: number;
  offset?: number;
  slug: string;
  token: string;
}) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('list_personal_guestbook_shared_wishes', {
    raw_token: input.token,
    requested_limit: input.limit ?? 12,
    requested_offset: input.offset ?? 0,
    requested_slug: input.slug,
  });
  if (error) throw new GuestbookRepositoryError();
  return Array.isArray(data) ? data : [];
}

/** Authenticated owner mutation. M0026 independently verifies project ownership. */
export async function setGuestbookEntryFeedHiddenForVerifiedProject(input: {
  entryId: string;
  hidden: boolean;
  project: OwnedProject;
}): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('set_guestbook_entry_feed_hidden', {
    requested_hidden: input.hidden,
    target_entry_id: input.entryId,
    target_project_id: input.project.id,
  });
  if (error || data !== true) throw new GuestbookRepositoryError();
}

export function mapPersonalGuestbookEntryRecord(record: unknown): PersonalGuestbookEntry | null {
  if (!record || typeof record !== 'object') return null;
  const candidate = record as {
    message?: unknown;
    share_with_guests?: unknown;
    updated_at?: unknown;
  };
  if (typeof candidate.message !== 'string' || typeof candidate.updated_at !== 'string') return null;
  return {
    message: candidate.message,
    shareWithGuests: candidate.share_with_guests === true,
    updatedAt: candidate.updated_at,
  };
}

export function mapPersonalGuestbookSharedWishRecord(record: unknown): PersonalGuestbookSharedWish | null {
  if (!record || typeof record !== 'object') return null;
  const candidate = record as { created_at?: unknown; display_name?: unknown; message?: unknown };
  if (
    typeof candidate.created_at !== 'string' ||
    typeof candidate.display_name !== 'string' ||
    typeof candidate.message !== 'string'
  ) return null;
  return {
    createdAt: candidate.created_at,
    displayName: candidate.display_name,
    message: candidate.message,
  };
}
