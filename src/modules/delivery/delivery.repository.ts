import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createServerSupabaseClient } from '@/server/supabase/server';

const deliveryGuestSelect = 'id, display_name, group_label, whatsapp_phone_e164';

export type DeliveryGuestRecord = {
  display_name: string;
  group_label: string | null;
  id: string;
  whatsapp_phone_e164: string | null;
};

export class DeliveryRepositoryError extends Error {
  constructor() {
    super('The delivery center repository could not complete the request.');
    this.name = 'DeliveryRepositoryError';
  }
}

/**
 * One owner-scoped active guest query with only delivery workspace fields.
 * It intentionally omits RSVP, guestbook, payment, draft, and link secrets.
 */
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
