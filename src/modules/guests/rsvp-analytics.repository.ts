import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createServerSupabaseClient } from '@/server/supabase/server';

import { GuestRepositoryError } from './guest.repository';
import type { RsvpAnalyticsGuestRecord } from './rsvp-analytics.types';

const rsvpAnalyticsSelect = 'display_name, party_size, rsvp_status, rsvp_attendee_count';

/**
 * Narrow owner-scoped source for RSVP current-state insight. Existing project
 * verification happens before this query; RLS still remains active.
 */
export async function listRsvpAnalyticsGuestsForVerifiedProject(
  project: OwnedProject,
): Promise<RsvpAnalyticsGuestRecord[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('guests')
    .select(rsvpAnalyticsSelect)
    .eq('project_id', project.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new GuestRepositoryError();
  }

  return (data ?? []).map((guest) => ({
    display_name: guest.display_name,
    party_size: guest.party_size,
    rsvp_attendee_count: guest.rsvp_attendee_count ?? null,
    rsvp_status: guest.rsvp_status,
  }));
}
