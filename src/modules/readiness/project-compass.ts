import type { Route } from 'next';

import type { WeddingReadinessV1 } from './wedding-readiness.types';

export type ProjectCompassNextStep = {
  description: string;
  href: Route;
  key: string;
  label: string;
};

/** Single owner-safe priority engine for the Ringkasan primary CTA. */
export function deriveProjectCompassNextStep(
  readiness: WeddingReadinessV1,
  projectId: string,
): ProjectCompassNextStep {
  const base = `/dashboard/${projectId}`;
  const target = (key: string, label: string, description: string, path: string) => ({
    description,
    href: `${base}${path}` as Route,
    key,
    label,
  });

  if (!readiness.invitation.hasPublishedSnapshot) {
    return target(
      'complete_invitation',
      'Lengkapi undangan',
      'Lengkapi dan tinjau undangan sebelum membagikannya kepada tamu.',
      '/invitation',
    );
  }
  if (readiness.invitation.hasUnpublishedChanges) {
    return target(
      'review_changes',
      'Tinjau dan terbitkan ulang',
      'Tamu masih melihat versi sebelumnya sampai perubahan diterbitkan ulang.',
      '/invitation',
    );
  }
  if (readiness.guests.activeGuestCount === 0) {
    return target(
      'add_guests',
      'Tambahkan tamu',
      'Tambahkan daftar tamu saat Anda siap membagikan Undangan Pribadi.',
      '/guests',
    );
  }
  if ((readiness.guests.noPersonalInvitationCount ?? 0) > 0) {
    return target(
      'prepare_personal_invitations',
      'Siapkan Undangan Pribadi',
      'Siapkan Undangan Pribadi untuk tamu yang belum memilikinya.',
      '/delivery',
    );
  }
  if ((readiness.guests.readyToDistributeCount ?? 0) > 0) {
    return target(
      'open_delivery_center',
      'Mulai bagikan',
      'Undangan Pribadi yang siap dapat dibagikan secara manual.',
      '/delivery',
    );
  }
  return target(
    'view_guest_responses',
    'Lihat Respons Tamu',
    'Pantau RSVP, jumlah rombongan hadir, dan ucapan dari tamu Anda.',
    '/rsvp',
  );
}
