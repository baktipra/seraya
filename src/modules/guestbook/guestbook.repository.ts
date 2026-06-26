import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createPublicSupabaseClient } from '@/server/supabase/public';

import type { OwnerGuestbookEntry, PersonalGuestbookEntry } from './guestbook.types';

const ownerGuestbookSelect =
  'id, message, updated_at, guests!inner(display_name, project_id, deleted_at)';

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
    .order('updated_at', { ascending: false });

  if (error) {
    throw new GuestbookRepositoryError();
  }

  return (data ?? []).flatMap((record) => {
    const guest = Array.isArray(record.guests) ? record.guests[0] : record.guests;

    if (
      !guest ||
      typeof record.id !== 'string' ||
      typeof record.message !== 'string' ||
      typeof record.updated_at !== 'string' ||
      typeof guest.display_name !== 'string'
    ) {
      return [];
    }

    return [
      {
        guestDisplayName: guest.display_name,
        id: record.id,
        message: record.message,
        updatedAt: record.updated_at,
      },
    ];
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
    ? Array.isArray(existing.guests)
      ? existing.guests[0]
      : existing.guests
    : null;

  if (
    existingError ||
    !existing ||
    !guest ||
    guest.project_id !== input.project.id ||
    guest.deleted_at !== null
  ) {
    throw new GuestbookRepositoryError();
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.entryId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    throw new GuestbookRepositoryError();
  }
}

/** Anonymous-safe capability lookup that returns only the current recipient's own entry. */
export async function resolvePersonalGuestbookEntryRecord(input: { slug: string; token: string }) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('resolve_personal_guestbook_entry', {
    raw_token: input.token,
    requested_slug: input.slug,
  });

  if (error) {
    throw new GuestbookRepositoryError();
  }

  return Array.isArray(data) ? (data[0] ?? null) : null;
}

/** Anonymous-safe upsert. Only raw route capability and validated message enter the RPC. */
export async function submitPersonalGuestbookEntryRecord(input: {
  message: string;
  slug: string;
  token: string;
}) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc('submit_personal_guestbook_entry', {
    raw_token: input.token,
    requested_message: input.message,
    requested_slug: input.slug,
  });

  if (error) {
    throw new GuestbookRepositoryError();
  }

  return data === 'created' || data === 'updated' ? data : null;
}

export function mapPersonalGuestbookEntryRecord(record: unknown): PersonalGuestbookEntry | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const candidate = record as { message?: unknown; updated_at?: unknown };

  if (typeof candidate.message !== 'string' || typeof candidate.updated_at !== 'string') {
    return null;
  }

  return { message: candidate.message, updatedAt: candidate.updated_at };
}
