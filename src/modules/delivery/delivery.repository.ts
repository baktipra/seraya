import 'server-only';

import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { OwnedProject } from '@/modules/projects/project.repository';
import { createServerSupabaseClient } from '@/server/supabase/server';

const deliveryGuestSelect =
  'id, project_id, deleted_at, display_name, group_label, whatsapp_phone_e164, rsvp_status';

export type DeliveryGuestRecord = {
  deleted_at: string | null;
  display_name: string;
  group_label: string | null;
  id: string;
  project_id: string;
  rsvp_status: GuestRsvpStatus;
  whatsapp_phone_e164: string | null;
};

export class DeliveryRepositoryError extends Error {
  constructor() {
    super('The delivery center repository could not complete the request.');
    this.name = 'DeliveryRepositoryError';
  }
}

/** One owner-scoped active guest query with only delivery workspace fields. */
export async function listActiveDeliveryGuestsForVerifiedProject(
  project: OwnedProject,
): Promise<DeliveryGuestRecord[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .select(deliveryGuestSelect)
    .eq('project_id', project.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new DeliveryRepositoryError();
  }

  return (data ?? []) as DeliveryGuestRecord[];
}

export type DeliveryGuestSelectionEligibilityRecord = {
  deleted_at: string | null;
  id: string;
};

/**
 * Resolves only the selected IDs inside the already verified project. It never
 * queries another project's guests, so an invalid selected ID can be counted
 * without becoming a cross-project existence oracle.
 */
export async function listDeliveryGuestSelectionEligibilityForVerifiedProject(
  project: OwnedProject,
  guestIds: string[],
): Promise<DeliveryGuestSelectionEligibilityRecord[]> {
  if (guestIds.length === 0) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .select('id, deleted_at')
    .eq('project_id', project.id)
    .in('id', guestIds);

  if (error) {
    throw new DeliveryRepositoryError();
  }

  return (data ?? []) as DeliveryGuestSelectionEligibilityRecord[];
}
