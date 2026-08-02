'use client';

import { OverflowMenuAction, RowOverflowMenu } from '@/components/projects/row-overflow-menu';
import type { GuestListItem } from '@/modules/guests/guest.types';

import type { NativeGuestManagerController } from './native-guest-manager-controller';
import {
  getGuestLifecycleActionLabel,
  getGuestLifecycleState,
  isActiveGuestLifecycle,
} from './native-guest-manager-lifecycle';

export function NativeGuestManagerRowMenu({
  controller,
  guest,
  view,
}: {
  controller: NativeGuestManagerController;
  guest: GuestListItem;
  view: 'desktop' | 'mobile';
}) {
  const {
    openOverflowKey,
    setEditGuest,
    setLinkGuest,
    setOpenOverflowKey,
    setReaccessGuest,
    setRemoveGuest,
    setRevokeLinkGuest,
  } = controller;
  const menuKey = `${guest.id}:${view}`;
  const lifecycleState = getGuestLifecycleState(guest);

  return (
    <RowOverflowMenu
      ariaLabel={`Aksi untuk ${guest.display_name}`}
      onOpenChange={(open: boolean) => setOpenOverflowKey(open ? menuKey : null)}
      open={openOverflowKey === menuKey}
    >
      <OverflowMenuAction
        onClick={() => {
          setOpenOverflowKey(null);
          setEditGuest(guest);
        }}
      >
        Edit tamu
      </OverflowMenuAction>
      {lifecycleState === 'active_recoverable' ? (
        <OverflowMenuAction
          onClick={() => {
            setOpenOverflowKey(null);
            setReaccessGuest(guest);
          }}
        >
          Lihat & salin tautan
        </OverflowMenuAction>
      ) : null}
      <OverflowMenuAction
        onClick={() => {
          setOpenOverflowKey(null);
          setLinkGuest(guest);
        }}
      >
        {getGuestLifecycleActionLabel(lifecycleState)}
      </OverflowMenuAction>
      {isActiveGuestLifecycle(lifecycleState) ? (
        <OverflowMenuAction
          onClick={() => {
            setOpenOverflowKey(null);
            setRevokeLinkGuest(guest);
          }}
        >
          Nonaktifkan tautan
        </OverflowMenuAction>
      ) : null}
      <OverflowMenuAction
        onClick={() => {
          setOpenOverflowKey(null);
          setRemoveGuest(guest);
        }}
      >
        Hapus tamu
      </OverflowMenuAction>
    </RowOverflowMenu>
  );
}
