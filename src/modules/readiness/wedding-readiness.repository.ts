import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

import type { WeddingReadinessAggregateCounts } from './wedding-readiness.types';

type WeddingReadinessQueryKey =
  | 'active_guest_count'
  | 'whatsapp_available_count'
  | 'non_pending_rsvp_count'
  | 'attending_rsvp_count'
  | 'declined_rsvp_count'
  | 'confirmed_attendee_values'
  | 'active_personal_link_count'
  | 'active_guestbook_count';

type ReadinessQueryResult = {
  error: unknown;
};

export class WeddingReadinessRepositoryError extends Error {
  constructor() {
    super('The wedding readiness aggregate could not be loaded.');
    this.name = 'WeddingReadinessRepositoryError';
  }
}

function toNonNegativeCount(value: number | null) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function toConfirmedAttendeeValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/**
 * The production PostgREST runtime does not rely on aggregate select syntax for
 * this value. The query fetches only the explicit scalar attendee count, then
 * this server-only reducer preserves the SRY-028 attendance contract.
 */
export function sumConfirmedAttendeeValues(data: unknown): number {
  if (!Array.isArray(data)) {
    return 0;
  }

  let total = 0;

  for (const row of data) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      continue;
    }

    const value = toConfirmedAttendeeValue((row as Record<string, unknown>).rsvp_attendee_count);

    if (value === null || total > Number.MAX_SAFE_INTEGER - value) {
      continue;
    }

    total += value;
  }

  return total;
}

function getSafeErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const value = (error as Record<string, unknown>).code;
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : undefined;
}

function getSafeErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const value = (error as Record<string, unknown>).message;

  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  return value
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[redacted]')
    .replace(/https?:\/\/[^\s]+/gi, '[redacted]')
    .replace(/\+?\d[\d\s-]{7,}\d/g, '[redacted]')
    .replace(
      /(\b(?:token(?:_hash)?|authorization|cookie|payment(?:_id|_data)?|transaction(?:_id)?|guestbook(?:_body|_content)?|display_name|guest_name|name|account_id|project_id|guest_id)\b)\s*(?:=|:)?\s*[^\s,;]+/gi,
      '$1=[redacted]',
    )
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted]')
    .slice(0, 500);
}

function logReadinessQueryFailure(query: WeddingReadinessQueryKey, error: unknown) {
  const code = getSafeErrorCode(error);
  const message = getSafeErrorMessage(error);

  console.error('[wedding-readiness] query failed', {
    ...(code ? { code } : {}),
    ...(message ? { message } : {}),
    query,
  });
}

function throwForReadinessQueryFailures(
  results: ReadonlyArray<readonly [WeddingReadinessQueryKey, ReadinessQueryResult]>,
): void {
  const failedResults = results.filter(([, result]) => result.error);

  if (failedResults.length === 0) {
    return;
  }

  for (const [query, result] of failedResults) {
    logReadinessQueryFailure(query, result.error);
  }

  throw new WeddingReadinessRepositoryError();
}

/**
 * Readiness needs only current aggregate facts. Head queries stay bounded; the
 * attendee exception materializes only one permitted scalar per attending
 * active guest so production PostgREST aggregate syntax is never required.
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
    ownerSupabase
      .from('guests')
      .select('rsvp_attendee_count')
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

  throwForReadinessQueryFailures([
    ['active_guest_count', activeGuestsResult],
    ['whatsapp_available_count', whatsappAvailableResult],
    ['non_pending_rsvp_count', nonPendingRsvpResult],
    ['attending_rsvp_count', attendingResult],
    ['declined_rsvp_count', declinedResult],
    ['confirmed_attendee_values', confirmedAttendeeResult],
    ['active_personal_link_count', activePersonalLinksResult],
    ['active_guestbook_count', activeGuestbookResult],
  ]);

  return {
    activeGuestCount: toNonNegativeCount(activeGuestsResult.count),
    activeGuestbookCount: toNonNegativeCount(activeGuestbookResult.count),
    activePersonalLinkGuestCount: toNonNegativeCount(activePersonalLinksResult.count),
    attendingCount: toNonNegativeCount(attendingResult.count),
    confirmedAttendeeCount: sumConfirmedAttendeeValues(confirmedAttendeeResult.data),
    declinedCount: toNonNegativeCount(declinedResult.count),
    nonPendingRsvpCount: toNonNegativeCount(nonPendingRsvpResult.count),
    whatsappAvailableCount: toNonNegativeCount(whatsappAvailableResult.count),
  };
}
