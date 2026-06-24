import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

import { mapGuest, type GuestDatabaseRecord } from './guest.mapper';
import type { CreateGuestInput, Guest, UpdateGuestInput } from './guest.types';

const guestSelect =
  'id, project_id, display_name, group_label, party_size, rsvp_status, whatsapp_phone_e164, created_at, updated_at, deleted_at';

export class GuestRepositoryError extends Error {
  constructor() {
    super('The guest repository could not complete the request.');
    this.name = 'GuestRepositoryError';
  }
}

/** Owner-visible active list through the regular session/RLS boundary. */
export async function listActiveGuestsForVerifiedProject(project: OwnedProject): Promise<Guest[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .select(guestSelect)
    .eq('project_id', project.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new GuestRepositoryError();
  }

  return (data ?? []).map((record) => mapGuest(record as GuestDatabaseRecord));
}

/** Server-only create after current user + project ownership are established. */
export async function createGuestForVerifiedProject(input: {
  guest: CreateGuestInput;
  project: OwnedProject;
}): Promise<Guest> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .insert({
      display_name: input.guest.displayName,
      group_label: input.guest.groupLabel,
      party_size: input.guest.partySize,
      project_id: input.project.id,
      whatsapp_phone_e164: input.guest.whatsappPhoneE164 ?? null,
    })
    .select(guestSelect)
    .single();

  if (error || !data) {
    throw new GuestRepositoryError();
  }

  return mapGuest(data as GuestDatabaseRecord);
}

/** One prevalidated add-only batch. PostgREST receives one INSERT request, never one write per CSV row. */
export async function createGuestsForVerifiedProject(input: {
  guests: CreateGuestInput[];
  project: OwnedProject;
}): Promise<void> {
  if (input.guests.length === 0) {
    return;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from('guests').insert(
    input.guests.map((guest) => ({
      display_name: guest.displayName,
      group_label: guest.groupLabel,
      party_size: guest.partySize,
      project_id: input.project.id,
      whatsapp_phone_e164: guest.whatsappPhoneE164 ?? null,
    })),
  );

  if (error) {
    throw new GuestRepositoryError();
  }
}

/** Privileged lookup still scopes by a previously verified project record. */
export async function getActiveGuestForVerifiedProjectWithAdmin(
  project: OwnedProject,
  guestId: string,
): Promise<Guest | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .select(guestSelect)
    .eq('id', guestId)
    .eq('project_id', project.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new GuestRepositoryError();
  }

  return data ? mapGuest(data as GuestDatabaseRecord) : null;
}

export async function updateGuestForVerifiedProject(input: {
  guest: UpdateGuestInput;
  guestId: string;
  project: OwnedProject;
}): Promise<Guest> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .update({
      display_name: input.guest.displayName,
      group_label: input.guest.groupLabel,
      party_size: input.guest.partySize,
      whatsapp_phone_e164: input.guest.whatsappPhoneE164 ?? null,
    })
    .eq('id', input.guestId)
    .eq('project_id', input.project.id)
    .is('deleted_at', null)
    .select(guestSelect)
    .maybeSingle();

  if (error) {
    throw new GuestRepositoryError();
  }

  if (!data) {
    throw new GuestRepositoryError();
  }

  return mapGuest(data as GuestDatabaseRecord);
}

/** Soft removal is intentional: no normal product path hard-deletes a guest. */
export async function softRemoveGuestForVerifiedProject(input: {
  guestId: string;
  project: OwnedProject;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.guestId)
    .eq('project_id', input.project.id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    throw new GuestRepositoryError();
  }
}
