'use client';

import {
  type NativeGuestManagerProps,
  useNativeGuestManagerController,
} from './native-guest-manager-controller';
import { NativeGuestManagerGuestDialogs } from './native-guest-manager-guest-dialogs';
import { NativeGuestManagerImportDialog } from './native-guest-manager-import-dialog';
import { NativeGuestManagerLinkDialogs } from './native-guest-manager-link-dialogs';
import { NativeGuestManagerWorkspace } from './native-guest-manager-workspace';

export function NativeGuestManager(props: NativeGuestManagerProps) {
  const controller = useNativeGuestManagerController(props);

  return (
    <>
      <NativeGuestManagerWorkspace controller={controller} />
      <NativeGuestManagerImportDialog controller={controller} />
      <NativeGuestManagerGuestDialogs controller={controller} />
      <NativeGuestManagerLinkDialogs controller={controller} />
    </>
  );
}
