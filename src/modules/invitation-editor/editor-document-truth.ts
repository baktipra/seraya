export type InvitationDocumentTruth =
  | 'local_unsaved'
  | 'saved_draft'
  | 'published_current'
  | 'published_with_saved_changes'
  | 'published_with_local_changes';

export type InvitationDocumentTruthInput = {
  hasPublishedSnapshot: boolean;
  hasSavedUnpublishedChanges: boolean;
  isDirty: boolean;
  isSaving: boolean;
  saveFailed: boolean;
};

export type InvitationDocumentTruthPresentation = {
  description: string;
  label: string;
  truth: InvitationDocumentTruth;
  tone: 'brand' | 'success' | 'warning' | 'error';
};

export function getInvitationDocumentTruth({
  hasPublishedSnapshot,
  hasSavedUnpublishedChanges,
  isDirty,
  isSaving,
  saveFailed,
}: InvitationDocumentTruthInput): InvitationDocumentTruthPresentation {
  if (saveFailed) {
    return {
      description:
        'Perubahan lokal tetap aman di editor, tetapi belum berhasil disimpan sebagai draf pribadi.',
      label: 'Gagal menyimpan',
      tone: 'error',
      truth: 'local_unsaved',
    };
  }

  if (isSaving) {
    return {
      description:
        'Perubahan sedang dikirim ke draf pribadi. Undangan yang dilihat tamu belum berubah.',
      label: 'Menyimpan perubahan…',
      tone: 'warning',
      truth: 'local_unsaved',
    };
  }

  if (isDirty && hasPublishedSnapshot) {
    return {
      description:
        'Pratinjau langsung mengikuti perubahan lokal. Tamu masih melihat versi terbit terakhir.',
      label: 'Perubahan lokal',
      tone: 'warning',
      truth: 'published_with_local_changes',
    };
  }

  if (isDirty) {
    return {
      description:
        'Pratinjau langsung mengikuti perubahan lokal. Simpan agar perubahan menjadi draf pribadi.',
      label: 'Perubahan lokal',
      tone: 'warning',
      truth: 'local_unsaved',
    };
  }

  if (hasPublishedSnapshot && hasSavedUnpublishedChanges) {
    return {
      description:
        'Draf terbaru sudah tersimpan. Tamu tetap melihat versi terbit sampai perubahan diterbitkan kembali.',
      label: 'Draf lebih baru dari versi terbit',
      tone: 'warning',
      truth: 'published_with_saved_changes',
    };
  }

  if (hasPublishedSnapshot) {
    return {
      description: 'Draf tersimpan sama dengan versi undangan yang sedang dilihat tamu.',
      label: 'Versi terbit saat ini',
      tone: 'success',
      truth: 'published_current',
    };
  }

  return {
    description:
      'Perubahan sudah tersimpan sebagai draf pribadi dan belum dapat dilihat oleh tamu.',
    label: 'Draf tersimpan',
    tone: 'brand',
    truth: 'saved_draft',
  };
}
