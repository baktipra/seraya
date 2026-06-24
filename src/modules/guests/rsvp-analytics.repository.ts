import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createServerSupabaseClient } from '@/server/supabase/server';

import { GuestRepositoryError } from './guest.repository';
import type { RsvpAnalyticsGuestRecord } from './rsvp-analytics.types';

const rsvpAnalyticsSelect = 'display_name, rsvp_status';

/**
 * Narrow owner-scoped source for RSVP current-state insight. The existing
 * project verification happens before this query; RLS still remains active.
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
    rsvp_status: guest.rsvp_status,
  }));
}
