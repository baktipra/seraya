'use client';

import type { InvitationEditorActionState } from '@/modules/invitations/invitation-editor.action-state';
import type { InvitationRendererProjectMetadata } from '@/modules/invitation-templates/invitation-view-model';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

import { getError, InvitationTemplatePicker } from './invitation-editor-fields';
import { useInvitationStudioState } from './invitation-studio-provider';
import styles from './invitation-studio-design-mode.module.css';

type InvitationStudioDesignTruth = {
  description: string;
  label: string;
  state: 'error' | 'saved' | 'unsaved';
  variant: 'brand' | 'success' | 'warning';
};

export function getInvitationStudioDesignTruth({
  actionStatus,
  isDirty,
}: {
  actionStatus: InvitationEditorActionState['status'];
  isDirty: boolean;
}): InvitationStudioDesignTruth {
  if (actionStatus === 'error') {
    return {
      description:
        'Pilihan lokal tetap aman. Periksa pesan kesalahan lalu gunakan tombol simpan di header Studio.',
      label: 'Gagal menyimpan',
      state: 'error',
      variant: 'warning',
    };
  }

  if (isDirty) {
    return {
      description: 'Template dan palet baru hanya berada di browser ini sampai draf disimpan.',
      label: 'Perubahan lokal',
      state: 'unsaved',
      variant: 'warning',
    };
  }

  return {
    description: 'Preview membaca draf privat terakhir yang berhasil disimpan.',
    label: 'Draf tersimpan',
    state: 'saved',
    variant: 'success',
  };
}

export type InvitationStudioDesignModeProps = {
  galleryImages?: InvitationGalleryImage[];
  project?: InvitationRendererProjectMetadata;
  projectId: string;
};

export function InvitationStudioDesignMode(_props: InvitationStudioDesignModeProps) {
  const { actionState, content, updateLocalContent } = useInvitationStudioState();

  return (
    <section
      aria-label="Tema undangan"
      className={styles.mode}
      data-invitation-studio-design-mode="canonical"
    >
      {actionState.status === 'error' && actionState.message ? (
        <div className={styles.errorSummary} role="alert">
          <strong>{actionState.message}</strong>
          <span>Perubahan desain lokal belum dibuang.</span>
        </div>
      ) : null}

      <InvitationTemplatePicker
        error={getError(actionState.fieldErrors, 'templateKey')}
        onPaletteSelect={(paletteKey) => {
          updateLocalContent({ paletteKey, type: 'palette' });
        }}
        onSelect={(templateKey) => {
          updateLocalContent({ templateKey, type: 'template' });
        }}
        paletteError={getError(actionState.fieldErrors, 'paletteKey')}
        selectedPaletteKey={content.paletteKey}
        selectedTemplateKey={content.templateKey}
      />
    </section>
  );
}
