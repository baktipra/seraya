import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createServerSupabaseClient } from '@/server/supabase/server';

import { GuestRepositoryError } from './guest.repository';
import type { RsvpAnalyticsGuestRecord } from './rsvp-analytics.types';

const rsvpAnalyticsSelect =
  'id, display_name, group_label, party_size, rsvp_status, rsvp_attendee_count, updated_at';

/**
 * One owner-scoped response source for current RSVP insight and response list.
 * Existing project verification happens before this query; RLS remains active.
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
    group_label: guest.group_label ?? null,
    id: guest.id,
    party_size: guest.party_size,
    rsvp_attendee_count: guest.rsvp_attendee_count ?? null,
    rsvp_status: guest.rsvp_status,
    updated_at: guest.updated_at,
  }));
}
