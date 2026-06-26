import 'server-only';

import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';
import type { OwnedProject } from '@/modules/projects/project.repository';

import type { WeddingReadinessAggregateCounts } from './wedding-readiness.types';

export class WeddingReadinessRepositoryError extends Error {
  constructor() {
    super('The wedding readiness aggregate could not be loaded.');
    this.name = 'WeddingReadinessRepositoryError';
  }
}

function toNonNegativeCount(value: number | null) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function parseAggregateSum(data: unknown) {
  if (!Array.isArray(data) || data.length === 0) {
    return 0;
  }

  const first = data[0];

  if (!first || typeof first !== 'object' || Array.isArray(first)) {
    return 0;
  }

  const record = first as Record<string, unknown>;
  const raw = record.sum ?? record.rsvp_attendee_count ?? Object.values(record)[0];
  const numeric = typeof raw === 'number' ? raw : Number(raw);

  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : 0;
}

/**
 * Readiness needs only current aggregate facts. Every guest query uses a head
 * count or a server aggregate; it never materializes the active guest list.
 */
export async function getWeddingReadinessAggregateCountsForVerifiedProject(
  project: OwnedProject,
): Promise<WeddingReadinessAggregateCounts> {
  const ownerSupabase = await createServerSupabaseClient();
  const adminSupabase = createAdminSupabaseClient();

  const [
    activeGuestsResult,
    whatsappAvailableResult,
    nonPendingRsvpResult,
    attendingResult,
    declinedResult,
    confirmedAttendeeResult,
    activePersonalLinksResult,
    activeGuestbookResult,
  ] = await Promise.all([
    ownerSupabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .is('deleted_at', null),
    ownerSupabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .not('whatsapp_phone_e164', 'is', null),
    ownerSupabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .neq('rsvp_status', 'pending'),
    ownerSupabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .eq('rsvp_status', 'attending'),
    ownerSupabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .eq('rsvp_status', 'declined'),
    // PostgREST aggregate selection keeps explicit attendee totals server-side;
    // no guest records or RSVP detail are materialized for the overview.
    ownerSupabase
      .from('guests')
      .select('rsvp_attendee_count.sum()')
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .eq('rsvp_status', 'attending')
      .not('rsvp_attendee_count', 'is', null),
    // M0013 enforces one active row per guest. Counting active links joined to
    // active project guests therefore represents the current projection and
    // excludes all revoked/expired history without loading it.
    adminSupabase
      .from('guest_links')
      .select('guest_id, guests!inner(project_id, deleted_at)', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('guests.project_id', project.id)
      .is('guests.deleted_at', null),
    adminSupabase
      .from('guestbook_entries')
      .select('id, guests!inner(project_id, deleted_at)', { count: 'exact', head: true })
      .eq('guests.project_id', project.id)
      .is('deleted_at', null)
      .is('guests.deleted_at', null),
  ]);

  if (
    activeGuestsResult.error ||
    whatsappAvailableResult.error ||
    nonPendingRsvpResult.error ||
    attendingResult.error ||
    declinedResult.error ||
    confirmedAttendeeResult.error ||
    activePersonalLinksResult.error ||
    activeGuestbookResult.error
  ) {
    throw new WeddingReadinessRepositoryError();
  }

  return {
    activeGuestCount: toNonNegativeCount(activeGuestsResult.count),
    activeGuestbookCount: toNonNegativeCount(activeGuestbookResult.count),
    activePersonalLinkGuestCount: toNonNegativeCount(activePersonalLinksResult.count),
    attendingCount: toNonNegativeCount(attendingResult.count),
    confirmedAttendeeCount: parseAggregateSum(confirmedAttendeeResult.data),
    declinedCount: toNonNegativeCount(declinedResult.count),
    nonPendingRsvpCount: toNonNegativeCount(nonPendingRsvpResult.count),
    whatsappAvailableCount: toNonNegativeCount(whatsappAvailableResult.count),
  };
}
