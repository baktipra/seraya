'use client';

import { useMemo } from 'react';

import { useToast } from '@/design-system';
import type { GuestListItem } from '@/modules/guests/guest.types';

import { useNativeGuestManagerActionState } from './native-guest-manager-action-state';
import {
  canBatchPrepareGuestLink,
  createGuestLifecycleSummary,
  type GuestLifecycleFilter,
  getGuestLifecycleState,
  matchesGuestLifecycleFilter,
} from './native-guest-manager-lifecycle';
import type { BoundGuestBatchAction } from './native-guest-manager-shared';

export type NativeGuestManagerProps = {
  initialGuests: GuestListItem[];
  prepareBatchAction: BoundGuestBatchAction;
  projectId: string;
};

export function useNativeGuestManagerController({
  initialGuests,
  prepareBatchAction,
  projectId,
}: NativeGuestManagerProps) {
  const { toast } = useToast();
  const actionState = useNativeGuestManagerActionState();
  const {
    guestFilter,
    query,
    selectedGuestIds,
    setGuestFilter,
    setOpenOverflowKey,
    setQuery,
    setSelectedGuestIds,
  } = actionState;

  const filteredGuests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');

    return initialGuests.filter((guest) => {
      const matchesQuery =
        !normalizedQuery ||
        guest.display_name.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        guest.group_label?.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        guest.whatsapp_phone_e164?.includes(normalizedQuery);

      return matchesQuery && matchesGuestLifecycleFilter(guest, guestFilter);
    });
  }, [guestFilter, initialGuests, query]);

  const visibleGuestIds = filteredGuests.map((guest) => guest.id);
  const selectedVisibleIds = selectedGuestIds.filter((id) => visibleGuestIds.includes(id));
  const allVisibleSelected =
    visibleGuestIds.length > 0 && selectedVisibleIds.length === visibleGuestIds.length;
  const selectedGuests = filteredGuests.filter((guest) => selectedVisibleIds.includes(guest.id));
  const selectedEligibleIds = selectedGuests
    .filter((guest) => canBatchPrepareGuestLink(getGuestLifecycleState(guest)))
    .map((guest) => guest.id);
  const guestLifecycleSummary = createGuestLifecycleSummary(initialGuests);

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedGuestIds([]);
    setOpenOverflowKey(null);
  }

  function updateGuestFilter(nextFilter: GuestLifecycleFilter) {
    setGuestFilter(nextFilter);
    setSelectedGuestIds([]);
    setOpenOverflowKey(null);
  }

  function toggleGuestSelection(guestId: string) {
    setSelectedGuestIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId],
    );
  }

  function toggleAllGuests() {
    setSelectedGuestIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleGuestIds.includes(id))
        : [...new Set([...current, ...visibleGuestIds])],
    );
  }

  async function exportGuests(guestIds: string[]) {
    try {
      const response = await fetch(`/dashboard/${projectId}/guests/export-xlsx`, {
        body: JSON.stringify({ guestIds }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (!response.ok) throw new Error('Guest export unavailable');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.download = 'seraya-daftar-tamu.xlsx';
      anchor.href = url;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: 'Export Excel belum bisa disiapkan. Coba lagi beberapa saat lagi.',
        variant: 'error',
      });
    }
  }



  return {
    ...actionState,
    allVisibleSelected,
    exportGuests,
    filteredGuests,
    guestLifecycleSummary,
    initialGuests,
    prepareBatchAction,
    projectId,
    selectedEligibleIds,
    selectedVisibleIds,
    toggleAllGuests,
    toggleGuestSelection,
    updateGuestFilter,
    updateQuery,
    visibleGuestIds,
  };
}

export type NativeGuestManagerController = ReturnType<typeof useNativeGuestManagerController>;
