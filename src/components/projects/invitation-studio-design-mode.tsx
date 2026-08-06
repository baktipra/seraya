'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/design-system';
import {
  getInvitationThemePalette,
  invitationThemePackages,
} from '@/modules/invitation-templates/core/theme-package.registry';
import { InvitationTemplateRenderer } from '@/modules/invitation-templates';
import type { InvitationRendererProjectMetadata } from '@/modules/invitation-templates/invitation-view-model';
import { createInvitationEditorPreviewViewModel } from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationEditorActionState } from '@/modules/invitations/invitation-editor.action-state';
import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

import { getError, InvitationTemplatePicker } from './invitation-editor-fields';
import { useInvitationStudioState } from './invitation-studio-provider';
import styles from './invitation-studio-design-mode.module.css';

type InvitationStudioDesignViewport = 'desktop' | 'mobile';

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

function getTemplateName(templateKey: string) {
  return (
    invitationThemePackages.find((themePackage) => themePackage.manifest.key === templateKey)
      ?.manifest.name ?? templateKey
  );
}

export type InvitationStudioDesignModeProps = {
  galleryImages?: InvitationGalleryImage[];
  project?: InvitationRendererProjectMetadata;
  projectId: string;
};

export function InvitationStudioDesignMode({
  galleryImages = [],
  project = { event_date_primary: null },
  projectId,
}: InvitationStudioDesignModeProps) {
  const { actionState, content, isDirty, updateLocalContent } = useInvitationStudioState();
  const [viewport, setViewport] = useState<InvitationStudioDesignViewport>('mobile');
  const invitation = useMemo(
    () =>
      createInvitationEditorPreviewViewModel({
        content,
        galleryImages,
        project,
      }),
    [content, galleryImages, project],
  );
  const truth = getInvitationStudioDesignTruth({
    actionStatus: actionState.status,
    isDirty,
  });
  const selectedPalette = getInvitationThemePalette(content.templateKey, content.paletteKey);
  const selectedTemplateName = getTemplateName(content.templateKey);

  return (
    <section
      aria-labelledby="invitation-studio-design-title"
      className={styles.mode}
      data-invitation-studio-design-mode="canonical"
    >
      <div className={styles.intro}>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>Mode Desain</p>
          <h2 className={styles.title} id="invitation-studio-design-title">
            Tentukan suasana undangan kalian.
          </h2>
          <p className={styles.description}>
            Pilih satu template dan satu palet. Preview exact di samping langsung membaca perubahan
            lokal yang sama dengan editor Isi.
          </p>
        </div>
        <div className={styles.selectionSummary} data-design-selection-summary>
          <span className={styles.selectionLabel}>Pilihan saat ini</span>
          <strong className={styles.selectionValue}>{selectedTemplateName}</strong>
          <span className={styles.selectionMeta}>
            {selectedPalette?.name ?? content.paletteKey}
          </span>
        </div>
      </div>

      <div className={styles.workspace}>
        <div className={styles.controls} data-invitation-studio-design-controls>
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

          <section className={styles.commandNote} aria-label="Cara menyimpan desain">
            <div>
              <p className={styles.commandTitle}>Satu tombol simpan untuk seluruh Studio</p>
              <p className={styles.commandDescription}>
                Template, palet, dan perubahan dari mode lain disimpan bersama melalui tombol utama
                di header. Mode Desain tidak memiliki save action kedua.
              </p>
            </div>
            <Badge variant={truth.variant}>{truth.label}</Badge>
          </section>
        </div>

        <aside
          aria-labelledby="invitation-studio-design-preview-title"
          className={styles.previewCard}
          data-invitation-studio-design-preview
          data-preview-palette={content.paletteKey}
          data-preview-template={content.templateKey}
          data-preview-viewport={viewport}
        >
          <div className={styles.previewHeader}>
            <div>
              <p className={styles.previewEyebrow}>Preview exact</p>
              <h3 className={styles.previewTitle} id="invitation-studio-design-preview-title">
                Tampilan undangan saat ini
              </h3>
              <p className={styles.previewDescription}>{truth.description}</p>
            </div>
            <div aria-label="Ukuran preview desain" className={styles.viewportSwitch} role="group">
              <button
                aria-pressed={viewport === 'mobile'}
                className={styles.viewportButton}
                data-selected={viewport === 'mobile' || undefined}
                onClick={() => setViewport('mobile')}
                type="button"
              >
                Ponsel
              </button>
              <button
                aria-pressed={viewport === 'desktop'}
                className={styles.viewportButton}
                data-selected={viewport === 'desktop' || undefined}
                onClick={() => setViewport('desktop')}
                type="button"
              >
                Desktop
              </button>
            </div>
          </div>

          <div className={styles.previewStage} data-preview-stage={viewport}>
            <div className={styles.deviceShell} data-preview-device={viewport}>
              <span aria-hidden="true" className={styles.deviceSpeaker} />
              <div
                aria-label={`Preview undangan ${viewport === 'mobile' ? 'ponsel' : 'desktop'} yang dapat digulir`}
                className={styles.deviceScreen}
                data-preview-screen
                role="region"
                tabIndex={0}
              >
                <InvitationTemplateRenderer
                  audioPlayback={createInvitationAudioPlaybackCapability({
                    configuration: content.audio,
                    requestUrl: `/api/projects/${encodeURIComponent(projectId)}/audio/playback`,
                  })}
                  invitation={invitation}
                  paletteKey={content.paletteKey}
                  surface="preview"
                  templateKey={content.templateKey}
                />
              </div>
              <span aria-hidden="true" className={styles.deviceHomeIndicator} />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
