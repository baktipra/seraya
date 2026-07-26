import type { InvitationEditorActionState } from '@/modules/invitations/invitation-editor.action-state';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

export type InvitationEditorTruthState = {
  local: {
    description: string;
    label: string;
    state: 'clean' | 'dirty' | 'saving' | 'error';
  };
  published: {
    description: string;
    label: string;
    state: 'live' | 'not_published' | 'outdated';
  };
  saved: {
    description: string;
    label: string;
    state: 'saved' | 'not_saved' | 'unknown';
  };
};

export function getInvitationEditorTruthState({
  actionStatus,
  hasSaved,
  isDirty,
  isPending,
  readiness,
}: {
  actionStatus: InvitationEditorActionState['status'];
  hasSaved: boolean;
  isDirty: boolean;
  isPending: boolean;
  readiness: Pick<WeddingReadinessV1, 'invitation'>;
}): InvitationEditorTruthState {
  const local: InvitationEditorTruthState['local'] = isPending
    ? {
        description: 'Perubahan sedang dikirim ke draf pribadi.',
        label: 'Menyimpan',
        state: 'saving',
      }
    : actionStatus === 'error'
      ? {
          description: 'Perubahan tetap aman di editor dan dapat dicoba disimpan kembali.',
          label: 'Gagal menyimpan',
          state: 'error',
        }
      : isDirty
        ? {
            description: 'Pratinjau langsung sudah berubah, tetapi server belum menyimpannya.',
            label: 'Ada perubahan',
            state: 'dirty',
          }
        : {
            description: 'Tidak ada perubahan lokal yang menunggu disimpan.',
            label: 'Tidak ada perubahan',
            state: 'clean',
          };

  const saved: InvitationEditorTruthState['saved'] = isPending
    ? {
        description: 'Menunggu konfirmasi penyimpanan dari server.',
        label: 'Sedang diperbarui',
        state: 'unknown',
      }
    : isDirty || actionStatus === 'error'
      ? {
          description: 'Draf server masih menggunakan versi terakhir yang berhasil disimpan.',
          label: 'Versi sebelumnya',
          state: 'not_saved',
        }
      : hasSaved || actionStatus === 'success'
        ? {
            description: 'Draf pribadi terbaru sudah dikonfirmasi oleh server.',
            label: 'Tersimpan',
            state: 'saved',
          }
        : {
            description: 'Draf pribadi berasal dari penyimpanan terakhir yang dimuat.',
            label: 'Draf tersimpan',
            state: 'saved',
          };

  const invitationState = readiness.invitation.state;
  const published: InvitationEditorTruthState['published'] =
    invitationState === 'published_with_unpublished_changes'
      ? {
          description: 'Tamu masih melihat snapshot terbit sebelumnya sampai diterbitkan ulang.',
          label: 'Perlu diterbitkan ulang',
          state: 'outdated',
        }
      : readiness.invitation.hasPublishedSnapshot
        ? {
            description: 'Snapshot terakhir sedang digunakan oleh undangan tamu.',
            label: 'Sedang dilihat tamu',
            state: 'live',
          }
        : {
            description: 'Belum ada snapshot yang dapat dilihat tamu.',
            label: 'Belum diterbitkan',
            state: 'not_published',
          };

  return { local, published, saved };
}
