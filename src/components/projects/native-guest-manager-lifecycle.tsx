import { getGuestLinkLifecycleCopy } from '@/modules/guest-links/guest-link-lifecycle';
import type { GuestLinkLifecycleState } from '@/modules/guest-links/guest-link.types';
import type { GuestListItem, GuestRsvpStatus } from '@/modules/guests/guest.types';

export type GuestLifecycleFilter =
  | 'all'
  | 'not_created'
  | 'active_recoverable'
  | 'active_legacy'
  | 'revoked'
  | 'expired'
  | 'missing_whatsapp';

export const guestLifecycleFilterOptions: ReadonlyArray<{
  label: string;
  value: GuestLifecycleFilter;
}> = [
  { label: 'Semua tamu', value: 'all' },
  { label: 'Belum dibuat', value: 'not_created' },
  { label: 'Aktif dan dapat dikelola', value: 'active_recoverable' },
  { label: 'Aktif lama', value: 'active_legacy' },
  { label: 'Nonaktif', value: 'revoked' },
  { label: 'Kedaluwarsa', value: 'expired' },
  { label: 'Tanpa Nomor WhatsApp', value: 'missing_whatsapp' },
];

export function getGuestLifecycleState(guest: GuestListItem): GuestLinkLifecycleState {
  if (guest.link_lifecycle_state) {
    return guest.link_lifecycle_state;
  }

  if (guest.link_state === 'active') {
    return 'active_recoverable';
  }

  return guest.link_state;
}

export function isActiveGuestLifecycle(state: GuestLinkLifecycleState) {
  return state === 'active_recoverable' || state === 'active_legacy';
}

export function canBatchPrepareGuestLink(state: GuestLinkLifecycleState) {
  return state === 'not_created' || state === 'revoked' || state === 'expired';
}

export function matchesGuestLifecycleFilter(guest: GuestListItem, filter: GuestLifecycleFilter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'missing_whatsapp') {
    return !guest.whatsapp_phone_e164;
  }

  return getGuestLifecycleState(guest) === filter;
}

export function createGuestLifecycleSummary(guests: readonly GuestListItem[]) {
  let manageableLinkCount = 0;
  let missingLinkCount = 0;
  let needsUpdateCount = 0;

  for (const guest of guests) {
    const state = getGuestLifecycleState(guest);

    if (state === 'active_recoverable') {
      manageableLinkCount += 1;
    } else if (state === 'not_created') {
      missingLinkCount += 1;
    } else {
      needsUpdateCount += 1;
    }
  }

  return {
    activeGuestCount: guests.length,
    manageableLinkCount,
    missingLinkCount,
    needsUpdateCount,
  };
}

export function getGuestLifecycleActionLabel(state: GuestLinkLifecycleState) {
  if (state === 'active_recoverable') {
    return 'Ganti tautan';
  }

  if (state === 'active_legacy') {
    return 'Perbarui tautan';
  }

  if (state === 'not_created') {
    return 'Buat Undangan Pribadi';
  }

  return 'Buat tautan baru';
}

export function getGuestLifecycleDialogCopy(state: GuestLinkLifecycleState) {
  if (state === 'active_recoverable') {
    return {
      buttonLabel: 'Ganti tautan',
      description:
        'Link saat ini masih aktif dan dapat dikelola. Ganti hanya jika akses tamu memang perlu diubah.',
      notice:
        'URL lama akan langsung dinonaktifkan ketika URL baru dibuat. Perubahan isi undangan tidak memerlukan penggantian link.',
      title: 'Ganti tautan pribadi?',
    };
  }

  if (state === 'active_legacy') {
    return {
      buttonLabel: 'Perbarui tautan',
      description:
        'Link lama masih aktif untuk tamu, tetapi Seraya tidak dapat menampilkan kembali URL tersebut.',
      notice:
        'Memperbarui link akan langsung menonaktifkan URL lama. Pastikan tamu menerima URL pengganti.',
      title: 'Perbarui tautan lama?',
    };
  }

  if (state === 'revoked') {
    return {
      buttonLabel: 'Buat tautan baru',
      description: 'Link sebelumnya sudah dinonaktifkan dan tidak dapat digunakan.',
      notice: 'URL baru akan menjadi akses aktif untuk tamu ini.',
      title: 'Buat tautan baru?',
    };
  }

  if (state === 'expired') {
    return {
      buttonLabel: 'Buat tautan baru',
      description: 'Link sebelumnya sudah kedaluwarsa dan tidak dapat digunakan.',
      notice: 'URL baru akan menjadi akses aktif untuk tamu ini.',
      title: 'Buat tautan baru?',
    };
  }

  return {
    buttonLabel: 'Buat tautan',
    description: 'Tamu ini belum mempunyai Undangan Pribadi.',
    notice: 'URL baru akan ditampilkan sekali setelah berhasil dibuat.',
    title: 'Buat tautan pribadi?',
  };
}

const rsvpStatusLabels: Record<GuestRsvpStatus, string> = {
  attending: 'Hadir',
  declined: 'Tidak hadir',
  pending: 'Belum merespons',
};

export function getRsvpDisplay(guest: GuestListItem): string {
  if (guest.rsvp_status !== 'attending') {
    return rsvpStatusLabels[guest.rsvp_status];
  }

  if (guest.rsvp_attendee_count === null) {
    return 'Hadir — jumlah belum dikonfirmasi';
  }

  return `Hadir — ${guest.rsvp_attendee_count} dari ${guest.party_size} orang`;
}

function getLifecycleTone(state: GuestLinkLifecycleState) {
  if (state === 'active_recoverable') {
    return 'bg-seraya-status-success-soft text-seraya-status-success';
  }

  if (state === 'not_created') {
    return 'bg-seraya-soft text-seraya-text-secondary';
  }

  return 'bg-seraya-status-warning-soft text-seraya-status-warning';
}

export function GuestLinkStatus({
  guest,
  showDescription = true,
}: {
  guest: GuestListItem;
  showDescription?: boolean;
}) {
  const state = getGuestLifecycleState(guest);
  const copy = getGuestLinkLifecycleCopy(state);

  return (
    <div className="min-w-0">
      <span
        className={`${getLifecycleTone(state)} inline-flex max-w-full rounded-full px-2.5 py-1 text-xs leading-5 font-semibold`}
      >
        {copy.label}
      </span>
      {showDescription ? (
        <p className="text-seraya-text-muted mt-1.5 max-w-[19rem] text-xs leading-5">
          {copy.description}
        </p>
      ) : null}
    </div>
  );
}

