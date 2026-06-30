import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import type { InvitationReadinessState } from './wedding-readiness.types';

export type InvitationConfidenceItem = {
  key: 'couple' | 'schedule' | 'template' | 'location';
  label: string;
  complete: boolean;
  optional?: boolean;
};

export type InvitationConfidenceStatus = {
  badge: string;
  description: string;
  primaryAction: 'preview' | 'publish' | 'republish';
  title: string;
};

export function getInvitationConfidenceStatus(
  state: InvitationReadinessState,
): InvitationConfidenceStatus {
  if (state === 'published_with_unpublished_changes') {
    return {
      badge: 'Perubahan belum diterbitkan',
      description:
        'Ada perubahan yang belum diterbitkan. Tamu masih melihat versi undangan sebelumnya sampai Anda menerbitkan ulang.',
      primaryAction: 'republish',
      title: 'Ada perubahan yang belum diterbitkan.',
    };
  }

  if (state === 'published') {
    return {
      badge: 'Sudah dipublikasikan',
      description:
        'Undangan sudah dipublikasikan. Tamu sedang melihat versi terakhir yang Anda terbitkan.',
      primaryAction: 'preview',
      title: 'Undangan sudah dipublikasikan.',
    };
  }

  return {
    badge: 'Belum dipublikasikan',
    description:
      'Undangan belum dipublikasikan. Perubahan Anda hanya terlihat di preview pribadi sampai undangan diterbitkan.',
    primaryAction: state === 'ready_to_publish' ? 'publish' : 'preview',
    title: 'Undangan belum dipublikasikan.',
  };
}

export function getInvitationConfidenceChecklist(
  draft: InvitationDraft,
): readonly InvitationConfidenceItem[] {
  const content = draft.content;
  const firstEvent = content.eventSchedule.events[0];
  const hasLocation = Boolean(
    firstEvent?.venueName?.trim() ||
    firstEvent?.venueAddress?.trim() ||
    firstEvent?.mapsUrl?.trim(),
  );

  return [
    {
      key: 'couple',
      label: 'Nama pasangan',
      complete: Boolean(
        content.couple.personOne.displayName && content.couple.personTwo.displayName,
      ),
    },
    {
      key: 'schedule',
      label: 'Jadwal acara',
      complete: Boolean(firstEvent?.title && firstEvent.date && firstEvent.startTime),
    },
    { key: 'template', label: 'Template undangan', complete: Boolean(content.templateKey) },
    {
      key: 'location',
      label: 'Lokasi',
      complete: hasLocation,
      optional: true,
    },
  ];
}
