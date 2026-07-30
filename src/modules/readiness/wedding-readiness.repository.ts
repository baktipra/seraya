import 'server-only';

import { measureWorkspaceServerLoad } from '@/lib/performance/workspace-performance.server';
import { isCanonicalGuestWhatsAppPhoneE164 } from '@/modules/guests/whatsapp-phone';
import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

import type { WeddingReadinessAggregateCounts } from './wedding-readiness.types';

type WeddingReadinessQueryKey = 'active_guest_rows' | 'guest_link_rows' | 'active_guestbook_count';

type ReadinessQueryResult = {
  error: unknown;
};

type ReadinessRowsResult = ReadinessQueryResult & {
  data: unknown[] | null;
};

type GuestReadinessFacts = {
  activeGuestCount: number;
  attendingCount: number;
  confirmedAttendeeCount: number;
  declinedCount: number;
  nonPendingRsvpCount: number;
  whatsappAvailableCount: number;
};

const readinessPageSize = 1000;

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

export function reduceActiveGuestReadinessRows(data: unknown): GuestReadinessFacts {
  if (!Array.isArray(data)) {
    return {
      activeGuestCount: 0,
      attendingCount: 0,
      confirmedAttendeeCount: 0,
      declinedCount: 0,
      nonPendingRsvpCount: 0,
      whatsappAvailableCount: 0,
    };
  }

  let activeGuestCount = 0;
  let attendingCount = 0;
  let declinedCount = 0;
  let nonPendingRsvpCount = 0;
  let whatsappAvailableCount = 0;
  const attendingRows: Array<{ rsvp_attendee_count: unknown }> = [];

  for (const candidate of data) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      continue;
    }

    const row = candidate as Record<string, unknown>;
    activeGuestCount += 1;

    if (row.whatsapp_phone_e164 !== null && row.whatsapp_phone_e164 !== undefined) {
      whatsappAvailableCount += 1;
    }

    const status = typeof row.rsvp_status === 'string' ? row.rsvp_status : null;
    if (status !== null && status !== 'pending') {
      nonPendingRsvpCount += 1;
    }
    if (status === 'attending') {
      attendingCount += 1;
      attendingRows.push({ rsvp_attendee_count: row.rsvp_attendee_count });
    } else if (status === 'declined') {
      declinedCount += 1;
    }
  }

  return {
    activeGuestCount,
    attendingCount,
    confirmedAttendeeCount: sumConfirmedAttendeeValues(attendingRows),
    declinedCount,
    nonPendingRsvpCount,
    whatsappAvailableCount,
  };
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

async function listActiveGuestReadinessRows(
  ownerSupabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  projectId: string,
): Promise<ReadinessRowsResult> {
  const rows: unknown[] = [];

  for (let from = 0; ; from += readinessPageSize) {
    const result = await ownerSupabase
      .from('guests')
      .select('id, whatsapp_phone_e164, rsvp_status, rsvp_attendee_count')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('id', { ascending: true })
      .range(from, from + readinessPageSize - 1);

    if (result.error) {
      return { data: null, error: result.error };
    }

    const page = result.data ?? [];
    rows.push(...page);

    if (page.length < readinessPageSize) {
      return { data: rows, error: null };
    }
  }
}

async function listGuestLinkReadinessRows(
  adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
  projectId: string,
): Promise<ReadinessRowsResult> {
  const rows: unknown[] = [];

  for (let from = 0; ; from += readinessPageSize) {
    const result = await adminSupabase
      .from('guest_links')
      .select(
        'guest_id, status, token_key_version, created_at, guests!inner(project_id, deleted_at, whatsapp_phone_e164)',
      )
      .eq('guests.project_id', projectId)
      .is('guests.deleted_at', null)
      .order('created_at', { ascending: false })
      .order('guest_id', { ascending: true })
      .range(from, from + readinessPageSize - 1);

    if (result.error) {
      return { data: null, error: result.error };
    }

    const page = result.data ?? [];
    rows.push(...page);

    if (page.length < readinessPageSize) {
      return { data: rows, error: null };
    }
  }
}

/**
 * Readiness derives all guest and RSVP facts from one paginated scalar
 * projection, all personal-link facts from one paginated link projection, and
 * keeps Guestbook as one exact count. Typical projects therefore use three
 * PostgREST operations instead of the previous nine while projects above the
 * API row limit remain complete through explicit pagination.
 */
export async function getWeddingReadinessAggregateCountsForVerifiedProject(
  project: OwnedProject,
): Promise<WeddingReadinessAggregateCounts> {
  const ownerSupabase = await createServerSupabaseClient();
  const adminSupabase = createAdminSupabaseClient();

  const [activeGuestRowsResult, guestLinkRowsResult, activeGuestbookResult] =
    await measureWorkspaceServerLoad(
      {
        minimumQueryCount: 3,
        operation: 'aggregate-query-batch',
        workspace: 'shared-readiness',
      },
      () =>
        Promise.all([
          listActiveGuestReadinessRows(ownerSupabase, project.id),
          listGuestLinkReadinessRows(adminSupabase, project.id),
          adminSupabase
            .from('guestbook_entries')
            .select('id, guests!inner(project_id, deleted_at)', { count: 'exact', head: true })
            .eq('guests.project_id', project.id)
            .is('deleted_at', null)
            .is('guests.deleted_at', null),
        ]),
    );

  throwForReadinessQueryFailures([
    ['active_guest_rows', activeGuestRowsResult],
    ['guest_link_rows', guestLinkRowsResult],
    ['active_guestbook_count', activeGuestbookResult],
  ]);

  const guestFacts = reduceActiveGuestReadinessRows(activeGuestRowsResult.data);
  const latestLinks = new Map<
    string,
    { status: string; token_key_version: number | null; whatsapp_phone_e164: string | null }
  >();
  let activePersonalLinkGuestCount = 0;

  for (const candidate of guestLinkRowsResult.data ?? []) {
    const row = candidate as {
      guest_id?: string;
      status?: string;
      token_key_version?: number | null;
      guests?: { whatsapp_phone_e164?: string | null } | { whatsapp_phone_e164?: string | null }[];
    };

    if (row.status === 'active') {
      activePersonalLinkGuestCount += 1;
    }
    if (!row.guest_id || latestLinks.has(row.guest_id)) {
      continue;
    }

    const joinedGuest = Array.isArray(row.guests) ? row.guests[0] : row.guests;
    latestLinks.set(row.guest_id, {
      status: row.status ?? 'unknown',
      token_key_version: row.token_key_version ?? null,
      whatsapp_phone_e164: joinedGuest?.whatsapp_phone_e164 ?? null,
    });
  }

  let readyToDistributeCount = 0;
  let needsWhatsAppCount = 0;
  let needsLinkUpdateCount = 0;

  for (const link of latestLinks.values()) {
    const recoverable = link.status === 'active' && link.token_key_version !== null;
    if (recoverable && isCanonicalGuestWhatsAppPhoneE164(link.whatsapp_phone_e164)) {
      readyToDistributeCount += 1;
    } else if (recoverable) {
      needsWhatsAppCount += 1;
    } else {
      needsLinkUpdateCount += 1;
    }
  }

  return {
    ...guestFacts,
    activeGuestbookCount: toNonNegativeCount(activeGuestbookResult.count),
    activePersonalLinkGuestCount,
    readyToDistributeCount,
    noPersonalInvitationCount: Math.max(0, guestFacts.activeGuestCount - latestLinks.size),
    needsLinkUpdateCount,
    needsWhatsAppCount,
  };
}
