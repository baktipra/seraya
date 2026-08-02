import type {
  GuestLinkLifecycleDerivation,
  GuestLinkLifecycleState,
  GuestPersonalLinkCurrentState,
  GuestPersonalLinkReaccessState,
  GuestPersonalLinkState,
  LatestGuestLinkStateRecord,
} from './guest-link.types';

export const guestLinkLifecycleStates = [
  'not_created',
  'active_recoverable',
  'active_legacy',
  'revoked',
  'expired',
] as const satisfies readonly GuestLinkLifecycleState[];

const lifecycleCopy: Record<
  GuestLinkLifecycleState,
  { description: string; label: string }
> = {
  active_legacy: {
    description:
      'Link lama masih aktif untuk tamu, tetapi tidak dapat ditampilkan kembali. Memperbarui link akan menonaktifkan URL lama.',
    label: 'Aktif lama · perlu diperbarui',
  },
  active_recoverable: {
    description: 'Link aktif dan dapat disalin kembali tanpa membuat URL baru.',
    label: 'Aktif · dapat dikelola',
  },
  expired: {
    description: 'Link sebelumnya sudah kedaluwarsa dan tidak dapat digunakan.',
    label: 'Kedaluwarsa',
  },
  not_created: {
    description: 'Tamu belum mempunyai Undangan Pribadi.',
    label: 'Belum dibuat',
  },
  revoked: {
    description: 'Link sebelumnya sudah dinonaktifkan dan tidak dapat digunakan.',
    label: 'Nonaktif',
  },
};

export function deriveGuestLinkLifecycle(input: {
  currentState: GuestPersonalLinkCurrentState;
  reaccessState: GuestPersonalLinkReaccessState;
}): GuestLinkLifecycleDerivation {
  const lifecycleState: GuestLinkLifecycleState =
    input.currentState === 'active'
      ? input.reaccessState === 'recoverable'
        ? 'active_recoverable'
        : 'active_legacy'
      : input.currentState;
  const hasActiveLink =
    lifecycleState === 'active_recoverable' || lifecycleState === 'active_legacy';

  return {
    canCreate:
      lifecycleState === 'not_created' ||
      lifecycleState === 'revoked' ||
      lifecycleState === 'expired',
    canReaccess: lifecycleState === 'active_recoverable',
    canReplace: hasActiveLink,
    canRevoke: hasActiveLink,
    currentState: input.currentState,
    lifecycleState,
    reaccessState:
      input.currentState === 'active'
        ? lifecycleState === 'active_recoverable'
          ? 'recoverable'
          : 'legacy'
        : 'unavailable',
    requiresReplacementConfirmation: hasActiveLink,
  };
}

export function deriveGuestLinkLifecycleFromLatestRecord(
  record: LatestGuestLinkStateRecord | undefined,
): GuestLinkLifecycleDerivation {
  if (!record) {
    return deriveGuestLinkLifecycle({
      currentState: 'not_created',
      reaccessState: 'unavailable',
    });
  }

  return deriveGuestLinkLifecycle({
    currentState: record.status,
    reaccessState:
      record.status === 'active'
        ? record.hasRecoverableCapability
          ? 'recoverable'
          : 'legacy'
        : 'unavailable',
  });
}

/**
 * Produces one canonical lifecycle per guest from an unordered link-history
 * projection. Timestamp comparison keeps the result deterministic even when a
 * caller does not preserve repository ordering.
 */
export function createLatestGuestLinkLifecycleMap(
  records: readonly LatestGuestLinkStateRecord[],
): ReadonlyMap<string, GuestLinkLifecycleDerivation> {
  const latestRecords = new Map<string, LatestGuestLinkStateRecord>();

  for (const record of records) {
    const current = latestRecords.get(record.guest_id);
    if (!current || record.created_at > current.created_at) {
      latestRecords.set(record.guest_id, record);
    }
  }

  return new Map(
    [...latestRecords.entries()].map(([guestId, record]) => [
      guestId,
      deriveGuestLinkLifecycleFromLatestRecord(record),
    ]),
  );
}

export function getGuestLinkLifecycleCopy(state: GuestLinkLifecycleState) {
  return lifecycleCopy[state];
}

/** Compatibility projection for surfaces not yet migrated to lifecycle copy. */
export function getCompactGuestPersonalLinkState(
  lifecycleState: GuestLinkLifecycleState,
): GuestPersonalLinkState {
  if (lifecycleState === 'active_recoverable' || lifecycleState === 'active_legacy') {
    return 'active';
  }

  return lifecycleState === 'not_created' ? 'not_created' : 'revoked';
}
