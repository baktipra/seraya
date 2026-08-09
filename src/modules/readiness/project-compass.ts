import type { Route } from 'next';

import type {
  WeddingReadinessPrimaryActionKey,
  WeddingReadinessV1,
} from './wedding-readiness.types';

export type ProjectCompassNextStep = {
  description: string;
  href: Route;
  key: WeddingReadinessPrimaryActionKey;
  label: string;
};

/** Single owner-safe priority engine for the Ringkasan primary CTA. */
export function deriveProjectCompassNextStep(
  readiness: WeddingReadinessV1,
  projectId: string,
): ProjectCompassNextStep {
  const base = `/dashboard/${projectId}`;
  const target = (
    key: WeddingReadinessPrimaryActionKey,
    label: string,
    description: string,
    path: string,
  ) => ({
    description,
    href: `${base}${path}` as Route,
    key,
    label,
  });

  switch (readiness.invitation.state) {
    case 'draft_incomplete':
      return target(
        'complete_invitation',
        'Lengkapi isi undangan',
        'Selesaikan bagian yang masih belum lengkap sebelum memikirkan publikasi atau pembagian.',
        '/invitation',
      );
    case 'draft_ready_unactivated':
      return target(
        'activate_for_publish',
        'Aktifkan dan terbitkan undangan',
        'Isi utama sudah siap. Selesaikan aktivasi agar versi tamu dapat diterbitkan.',
        '/invitation?task=publish',
      );
    case 'ready_to_publish':
      return target(
        'publish_invitation',
        'Terbitkan undangan',
        'Draf sudah melewati kesiapan dasar dan siap menjadi versi yang dilihat tamu.',
        '/invitation?task=publish',
      );
    case 'published_with_unpublished_changes':
      return target(
        'review_changes',
        'Terbitkan ulang perubahan',
        'Tamu masih melihat versi terbit sebelumnya sampai perubahan terbaru diterbitkan ulang.',
        '/invitation?task=publish',
      );
    case 'published':
      break;
  }

  if (readiness.guests.activeGuestCount === 0) {
    return target(
      'add_guests',
      'Tambahkan daftar tamu',
      'Undangan sudah aktif. Langkah berikutnya adalah menyiapkan siapa yang akan menerimanya.',
      '/guests',
    );
  }

  if ((readiness.guests.needsLinkUpdateCount ?? 0) > 0) {
    return target(
      'repair_guest_links',
      'Perbaiki akses Undangan Pribadi',
      `${readiness.guests.needsLinkUpdateCount ?? 0} tamu memiliki tautan yang perlu diperbarui sebelum pembagian dilanjutkan.`,
      '/guests',
    );
  }

  if ((readiness.guests.needsWhatsAppCount ?? 0) > 0) {
    return target(
      'complete_guest_whatsapp',
      'Lengkapi nomor WhatsApp tamu',
      `${readiness.guests.needsWhatsAppCount ?? 0} tamu belum memiliki nomor WhatsApp yang siap dipakai untuk handoff manual.`,
      '/guests',
    );
  }

  if ((readiness.guests.noPersonalInvitationCount ?? 0) > 0) {
    return target(
      'prepare_personal_invitations',
      'Siapkan Undangan Pribadi',
      `${readiness.guests.noPersonalInvitationCount ?? 0} tamu belum memiliki Undangan Pribadi yang siap dikelola.`,
      '/delivery',
    );
  }

  if (!readiness.followUp && (readiness.guests.readyToDistributeCount ?? 0) > 0) {
    return target(
      'open_delivery_center',
      'Mulai bagikan',
      'Undangan Pribadi yang siap dapat dibagikan secara manual.',
      '/delivery',
    );
  }

  const noFollowUpRecordedCount = readiness.followUp?.noFollowUpRecordedCount ?? 0;
  if (noFollowUpRecordedCount > 0) {
    return target(
      'open_delivery_center',
      'Bagikan ke tamu yang sudah siap',
      `${noFollowUpRecordedCount} tamu siap masuk ke handoff manual dari Bagikan.`,
      '/delivery',
    );
  }

  const awaitingRsvpCount = readiness.followUp?.awaitingRsvpCount ?? 0;
  if (awaitingRsvpCount > 0) {
    return target(
      'follow_up_pending_rsvp',
      'Tindak lanjuti RSVP yang masih pending',
      `${awaitingRsvpCount} tamu sudah masuk tahap handoff tetapi masih menunggu RSVP.`,
      '/delivery?view=follow-up&filter=awaiting_rsvp',
    );
  }

  return target(
    'view_guest_responses',
    'Pantau respons tamu',
    readiness.responses.nonPendingRsvpCount > 0 || readiness.responses.activeGuestbookCount > 0
      ? 'Respons atau ucapan sudah masuk dan siap ditinjau dari satu tempat.'
      : 'Pantau RSVP dan ucapan setelah tamu mulai merespons Undangan Pribadi.',
    '/rsvp',
  );
}
