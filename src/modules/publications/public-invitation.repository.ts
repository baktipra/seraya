import 'server-only';

import { unstable_cache } from 'next/cache';

import { RESERVED_SLUGS, SLUG_MAX_LENGTH, SLUG_MIN_LENGTH } from '@/lib/slug';
import { createPublicSupabaseClient } from '@/server/supabase/public';

import { parsePublishedInvitationSnapshotRecord } from './published-invitation.schema';
import {
  getPublishedInvitationCacheTag,
  type PublishedInvitationSnapshot,
} from './publication.types';

const publicSnapshotSelect =
  'id, project_id, slug, revision, template_id, draft_schema_version, snapshot, is_current, published_at, created_at';
const publicSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class PublicInvitationRepositoryError extends Error {
  constructor() {
    super('The public invitation repository could not complete the request.');
    this.name = 'PublicInvitationRepositoryError';
  }
}

export function isSafePublicInvitationSlug(slug: string) {
  return (
    slug.length >= SLUG_MIN_LENGTH &&
    slug.length <= SLUG_MAX_LENGTH &&
    publicSlugPattern.test(slug) &&
    !RESERVED_SLUGS.has(slug)
  );
}

async function getCurrentPublishedInvitationBySlugUncached(
  slug: string,
): Promise<PublishedInvitationSnapshot | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from('published_invitation_snapshots')
    .select(publicSnapshotSelect)
    .eq('slug', slug)
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    throw new PublicInvitationRepositoryError();
  }

  if (!data) {
    return null;
  }

  try {
    return parsePublishedInvitationSnapshotRecord(data) as PublishedInvitationSnapshot;
  } catch {
    // Corrupt/unsupported snapshot data must never crash or partially render in
    // the public runtime. The service maps it to the public not-found path.
    return null;
  }
}

/**
 * No cookies, session, or dashboard context participates in this lookup. The
 * result cache is keyed and invalidated only by the public published slug.
 */
export async function getCachedCurrentPublishedInvitationBySlug(
  slug: string,
): Promise<PublishedInvitationSnapshot | null> {
  if (!isSafePublicInvitationSlug(slug)) {
    return null;
  }

  const getCached = unstable_cache(
    async () => getCurrentPublishedInvitationBySlugUncached(slug),
    ['published-invitation', slug],
    {
      revalidate: 3600,
      tags: [getPublishedInvitationCacheTag(slug)],
    },
  );

  return getCached();
}
