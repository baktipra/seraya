'use client';

import {
  OperationalMobileDataCard,
  OperationalMobileDataList,
  OperationalMobileField,
} from '@/components/workspace/operational-primitives';
import { getGuestLinkLifecycleCopy } from '@/modules/guest-links/guest-link-lifecycle';

import type { NativeGuestManagerController } from './native-guest-manager-controller';
import {
  getGuestLifecycleState,
  getRsvpDisplay,
  GuestLinkStatus,
} from './native-guest-manager-lifecycle';
import { NativeGuestManagerRowMenu } from './native-guest-manager-row-menu';

export function NativeGuestManagerMobileData({
  controller,
}: {
  controller: NativeGuestManagerController;
}) {
  const { filteredGuests, selectedVisibleIds, toggleGuestSelection } = controller;

  return (
    <OperationalMobileDataList label="Daftar lifecycle Undangan Pribadi">
      {filteredGuests.map((guest) => {
        const lifecycleCopy = getGuestLinkLifecycleCopy(getGuestLifecycleState(guest));

        return (
          <OperationalMobileDataCard
            identity={
              <div className="flex min-w-0 items-start gap-3">
                <input
                  aria-label={`Pilih ${guest.display_name}`}
                  checked={selectedVisibleIds.includes(guest.id)}
                  className="accent-seraya-action-primary mt-1 size-4 shrink-0"
                  onChange={() => toggleGuestSelection(guest.id)}
                  type="checkbox"
                />
                <div className="min-w-0">
                  <p className="text-seraya-text-primary leading-5 font-semibold">{guest.display_name}</p>
                  {guest.group_label ? (
                    <p className="text-seraya-text-muted mt-0.5 text-xs leading-5">{guest.group_label}</p>
                  ) : null}
                </div>
              </div>
            }
            key={guest.id}
            status={
              <div className="flex items-start gap-2">
                <GuestLinkStatus guest={guest} showDescription={false} />
                <NativeGuestManagerRowMenu controller={controller} guest={guest} view="mobile" />
              </div>
            }
          >
            <p className="text-seraya-text-muted mt-3 text-xs leading-5">{lifecycleCopy.description}</p>
            <dl data-operational-mobile-fields>
              <OperationalMobileField label="Rombongan" value={`${guest.party_size} orang`} />
              <OperationalMobileField
                align="end"
                label="WhatsApp"
                value={guest.whatsapp_phone_e164 ?? 'Belum ada'}
              />
              <OperationalMobileField label="RSVP" value={getRsvpDisplay(guest)} />
              <OperationalMobileField align="end" label="Status link" value={lifecycleCopy.label} />
            </dl>
          </OperationalMobileDataCard>
        );
      })}
    </OperationalMobileDataList>
  );
}
