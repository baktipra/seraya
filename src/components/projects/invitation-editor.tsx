'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system';
import type { InvitationEditorActionState } from '@/modules/invitations/invitation-editor.action-state';
import type { InvitationEditorLocalAction } from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationRendererProjectMetadata } from '@/modules/invitation-templates/invitation-view-model';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import type { InvitationEditorFieldErrors } from '@/modules/invitations/invitation-editor.schema';
import {
  INVITATION_AUDIO_CHANGED_EVENT,
  type InvitationAudioChangedEventDetail,
} from '@/modules/media/invitation-audio-playback.types';
import type { InvitationAudioConfiguration } from '@/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import type { ProjectPublishEligibility } from '@/modules/payments/payment.types';
import {
  getInvitationConfidenceChecklist,
  getInvitationConfidenceStatus,
} from '@/modules/readiness/invitation-confidence';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

import {
  createDigitalGiftAccountId,
  createEventScheduleItem,
  EditorScheduleEventCard,
  EditorSection,
  EditorTextAreaField,
  EditorTextField,
  EditorToggle,
  FieldError,
  getError,
  InvitationTemplatePicker,
} from './invitation-editor-fields';
import {
  invitationStudioDirtyNavigationMessage,
  shouldConfirmInvitationStudioNavigation,
  useInvitationStudioState,
} from './invitation-studio-provider';
import { PublishInvitationControls } from './publish-invitation-controls';
import {
  getInvitationEditorErrorSections,
  getInvitationEditorSectionStatuses,
  invitationEditorSections,
  InvitationWorkspaceNavigation,
  InvitationWorkspacePanel,
  type InvitationEditorSectionKey,
} from './invitation-editor-workspace';

const fallbackProjectMetadata: InvitationRendererProjectMetadata = {
  event_date_primary: null,
};

function InvitationEditorPreviewLoading() {
  return (
    <>
      <aside
        aria-label="Pratinjau langsung sedang disiapkan"
        className="bg-seraya-canvas fixed inset-0 z-[60] flex min-h-0 flex-col px-3 py-3 outline-none sm:px-5 sm:py-5 2xl:hidden"
        data-local-preview-loading
      >
        <div className="border-seraya-border-default bg-seraya-surface mx-auto flex h-full w-full max-w-[30rem] items-center justify-center rounded-[var(--seraya-radius-lg)] border px-6 text-center shadow-[var(--seraya-shadow-float)]">
          <div>
            <p className="text-seraya-text-primary text-sm font-semibold">
              Menyiapkan preview lokal…
            </p>
            <p className="text-seraya-text-muted mt-2 text-sm leading-6">
              Editor tetap aman. Preview akan tampil setelah komponennya selesai dimuat.
            </p>
          </div>
        </div>
      </aside>
      <aside
        aria-label="Pratinjau langsung sedang disiapkan"
        className="border-seraya-border-default bg-seraya-surface sticky top-24 hidden min-h-64 min-w-0 self-start rounded-[var(--seraya-radius-lg)] border p-5 shadow-[var(--seraya-shadow-soft)] 2xl:block"
        data-local-preview-desktop
        data-local-preview-loading
      >
        <p className="text-seraya-text-primary text-sm font-semibold">Menyiapkan preview lokal…</p>
        <p className="text-seraya-text-muted mt-2 text-sm leading-6">
          Preview dimuat setelah editor utama siap digunakan.
        </p>
      </aside>
    </>
  );
}

function InvitationEditorDesktopPreviewPlaceholder() {
  return (
    <aside
      aria-label="Pratinjau langsung belum dimuat"
      className="border-seraya-border-default bg-seraya-surface sticky top-24 hidden min-h-64 min-w-0 self-start rounded-[var(--seraya-radius-lg)] border p-5 shadow-[var(--seraya-shadow-soft)] 2xl:block"
      data-local-preview-deferred
      data-local-preview-desktop
    >
      <p className="text-seraya-text-primary text-sm font-semibold">
        Preview lokal akan segera siap
      </p>
      <p className="text-seraya-text-muted mt-2 text-sm leading-6">
        Editor utama diprioritaskan terlebih dahulu agar kalian dapat langsung mulai mengubah
        undangan.
      </p>
    </aside>
  );
}

const DeferredInvitationEditorLivePreview = dynamic(
  () =>
    import('./invitation-editor-live-preview').then((module) => module.InvitationEditorLivePreview),
  {
    loading: InvitationEditorPreviewLoading,
    ssr: false,
  },
);

export type InvitationEditorProps = {
  draft: InvitationDraft;
  galleryImages?: InvitationGalleryImage[];
  project?: InvitationRendererProjectMetadata;
  projectId: string;
  readiness?: Pick<WeddingReadinessV1, 'identity' | 'invitation'>;
};

type InvitationEditorSaveStatusInput = {
  hasSaved: boolean;
  isDirty: boolean;
  isPending: boolean;
  actionStatus: InvitationEditorActionState['status'];
};

type InvitationEditorSaveStatus = {
  description: string;
  label: string;
};

type InvitationEditorDocumentTruthState = 'error' | 'neutral' | 'pending' | 'success' | 'warning';

type InvitationEditorDocumentTruthItem = {
  description: string;
  label: string;
  state: InvitationEditorDocumentTruthState;
};

type InvitationEditorDocumentTruthInput = InvitationEditorSaveStatusInput & {
  hasPublishedSnapshot: boolean;
  hasUnpublishedChanges: boolean;
};

type InvitationEditorDocumentTruth = {
  browser: InvitationEditorDocumentTruthItem;
  draft: InvitationEditorDocumentTruthItem;
  published: InvitationEditorDocumentTruthItem;
  saveActionLabel: string;
};

export const invitationEditorDirtyNavigationMessage = invitationStudioDirtyNavigationMessage;
const fallbackWorkspaceReadiness: Pick<WeddingReadinessV1, 'identity' | 'invitation'> = {
  identity: { coupleLabel: 'Undangan kalian', templateKey: null },
  invitation: {
    hasPublishedSnapshot: false,
    hasUnpublishedChanges: false,
    hasVerifiedActivation: false,
    publishedSlug: null,
    state: 'draft_incomplete',
  },
};

/**
 * Local-only presentation state for the explicit draft save flow. It never
 * changes server behavior and never treats browser edits as persisted data.
 */
export function getInvitationWorkspaceStatus(readiness?: InvitationEditorProps['readiness']) {
  const workspaceReadiness = readiness ?? fallbackWorkspaceReadiness;

  switch (workspaceReadiness.invitation.state) {
    case 'published_with_unpublished_changes':
      return {
        badge: 'Perubahan belum diterbitkan',
        description:
          'Perubahan draft tidak langsung terlihat oleh tamu. Tamu melihat perubahan setelah kalian menerbitkan ulang.',
        title: 'Ada perubahan yang belum diterbitkan.',
      };
    case 'published':
      return {
        badge: 'Sudah dipublikasikan',
        description:
          'Undangan sudah live. Perubahan baru akan tetap menjadi draft sampai kalian menerbitkan ulang.',
        title: 'Undangan sudah dipublikasikan.',
      };
    case 'ready_to_publish':
      return {
        badge: 'Siap diterbitkan',
        description:
          'Perubahan draft tidak langsung terlihat oleh tamu. Tinjau lalu terbitkan saat undangan sudah kalian setujui.',
        title: 'Undangan siap diterbitkan.',
      };
    case 'draft_ready_unactivated':
      return {
        badge: 'Draft siap ditinjau',
        description: 'Perubahan draft tetap privat sampai undangan dapat diterbitkan.',
        title: 'Undangan siap ditinjau.',
      };
    case 'draft_incomplete':
      return {
        badge: 'Draft belum siap',
        description:
          'Lengkapi informasi utama lalu simpan untuk melihat hasil undangan secara privat.',
        title: 'Undangan masih disusun.',
      };
  }
}

function getInvitationPublishEligibility(
  readiness?: InvitationEditorProps['readiness'],
): ProjectPublishEligibility {
  return (readiness ?? fallbackWorkspaceReadiness).invitation.hasVerifiedActivation
    ? { allowed: true, reason: 'verified_payment' }
    : { allowed: false, reason: 'payment_not_verified' };
}

export function getInvitationEditorSaveStatus({
  actionStatus,
  hasSaved,
  isDirty,
  isPending,
}: InvitationEditorSaveStatusInput): InvitationEditorSaveStatus {
  if (isPending) {
    return {
      description: 'Mohon tunggu sebentar. Perubahan sedang disimpan ke draft pribadi.',
      label: 'Menyimpan perubahan…',
    };
  }

  if (actionStatus === 'error' || isDirty) {
    return {
      description:
        'Pratinjau lokal sudah diperbarui. Simpan agar perubahan menjadi bagian dari draf tersimpan.',
      label: 'Belum disimpan',
    };
  }

  if (actionStatus === 'success' && hasSaved) {
    return {
      description: 'Perubahan sudah tersimpan dan siap diperiksa di preview tersimpan.',
      label: 'Tersimpan',
    };
  }

  return {
    description: 'Mulai lengkapi detail undangan kalian di bawah ini.',
    label: 'Belum ada perubahan',
  };
}

export function getInvitationEditorDocumentTruth({
  actionStatus,
  hasPublishedSnapshot,
  hasSaved,
  hasUnpublishedChanges,
  isDirty,
  isPending,
}: InvitationEditorDocumentTruthInput): InvitationEditorDocumentTruth {
  const browser: InvitationEditorDocumentTruthItem = isPending
    ? {
        description: 'Perubahan sedang dikirim ke draf privat. Jangan tutup halaman ini dulu.',
        label: 'Sedang menyimpan',
        state: 'pending',
      }
    : actionStatus === 'error'
      ? {
          description:
            'Perubahan lokal tetap aman di browser ini. Periksa pesan kesalahan lalu coba simpan lagi.',
          label: 'Gagal menyimpan',
          state: 'error',
        }
      : isDirty
        ? {
            description:
              'Perubahan baru hanya ada di browser dan preview lokal sampai kalian menyimpannya.',
            label: 'Perubahan lokal',
            state: 'warning',
          }
        : {
            description: 'Belum ada perubahan lokal yang berbeda dari draf privat.',
            label: 'Draf tersimpan',
            state: 'success',
          };

  const draft: InvitationEditorDocumentTruthItem = isPending
    ? {
        description:
          'Versi tersimpan sebelumnya tetap aman sampai proses penyimpanan terbaru selesai.',
        label: 'Draf tersimpan tetap aman',
        state: 'pending',
      }
    : actionStatus === 'error'
      ? {
          description:
            'Kegagalan simpan tidak menimpa draf privat yang sebelumnya sudah tersimpan.',
          label: 'Draf tersimpan tetap aman',
          state: 'warning',
        }
      : isDirty
        ? {
            description: 'Draf privat masih memakai versi terakhir yang berhasil disimpan.',
            label: 'Draf tersimpan belum berubah',
            state: 'neutral',
          }
        : {
            description: 'Preview tersimpan membaca versi privat ini dari server.',
            label: 'Draf tersimpan',
            state: 'success',
          };

  let published: InvitationEditorDocumentTruthItem;

  if (!hasPublishedSnapshot) {
    published = {
      description: 'Belum ada versi undangan yang dapat dilihat tamu.',
      label: 'Belum diterbitkan',
      state: 'neutral',
    };
  } else if (hasUnpublishedChanges || (actionStatus === 'success' && hasSaved && !isDirty)) {
    published = {
      description:
        'Tamu masih melihat versi terbit sebelumnya sampai kalian menerbitkan perubahan.',
      label: 'Draf lebih baru dari versi terbit',
      state: 'warning',
    };
  } else if (isDirty || isPending || actionStatus === 'error') {
    published = {
      description:
        'Perubahan di browser atau proses simpan tidak mengubah versi yang sedang dilihat tamu.',
      label: 'Versi terbit tetap saat ini',
      state: 'neutral',
    };
  } else {
    published = {
      description: 'Inilah versi undangan yang sedang dilihat tamu.',
      label: 'Versi terbit saat ini',
      state: 'success',
    };
  }

  return {
    browser,
    draft,
    published,
    saveActionLabel: isPending
      ? 'Menyimpan…'
      : actionStatus === 'error'
        ? 'Coba simpan lagi'
        : 'Simpan perubahan',
  };
}

function InvitationEditorDocumentTruthMark({
  state,
}: {
  state: InvitationEditorDocumentTruthState;
}) {
  const symbol =
    state === 'error'
      ? '!'
      : state === 'pending'
        ? '…'
        : state === 'success'
          ? '✓'
          : state === 'warning'
            ? '•'
            : '○';

  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        state === 'error'
          ? 'bg-seraya-status-error-soft text-seraya-status-error'
          : state === 'success'
            ? 'bg-seraya-status-success-soft text-seraya-status-success'
            : 'bg-seraya-brand-soft text-seraya-action-primary',
      ].join(' ')}
    >
      {symbol}
    </span>
  );
}

function InvitationEditorDocumentTruthPanel({ truth }: { truth: InvitationEditorDocumentTruth }) {
  const layers = [
    { item: truth.browser, key: 'browser', label: 'Di browser ini' },
    { item: truth.draft, key: 'draft', label: 'Draf privat' },
    { item: truth.published, key: 'published', label: 'Untuk tamu' },
  ] as const;

  return (
    <section
      aria-labelledby="invitation-document-truth-title"
      className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4 sm:p-5"
      data-release-b-document-truth="rb2"
    >
      <div className="max-w-2xl">
        <p className="text-seraya-text-muted text-[0.68rem] font-bold tracking-[0.08em] uppercase">
          Status dokumen
        </p>
        <h2
          className="text-seraya-text-primary mt-1 text-base font-semibold"
          id="invitation-document-truth-title"
        >
          Ketahui versi mana yang sedang kalian ubah
        </h2>
        <p className="text-seraya-text-muted mt-1.5 text-sm leading-6">
          Perubahan browser, draf privat, dan undangan yang dilihat tamu adalah tiga lapisan yang
          berbeda.
        </p>
      </div>

      <dl className="mt-4 grid gap-3 lg:grid-cols-3">
        {layers.map((layer) => (
          <div
            className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border p-4"
            data-document-truth-layer={layer.key}
            key={layer.key}
          >
            <div className="flex items-start gap-3">
              <InvitationEditorDocumentTruthMark state={layer.item.state} />
              <div className="min-w-0">
                <dt className="text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                  {layer.label}
                </dt>
                <dd className="text-seraya-text-primary mt-1 text-sm font-semibold">
                  {layer.item.label}
                </dd>
                <dd className="text-seraya-text-muted mt-1 text-xs leading-5">
                  {layer.item.description}
                </dd>
              </div>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export const shouldConfirmInvitationEditorNavigation = shouldConfirmInvitationStudioNavigation;

export type InvitationEditorActivePanelProps = {
  activeSection: InvitationEditorSectionKey;
  content: InvitationDraft['content'];
  fieldErrors?: InvitationEditorFieldErrors;
  projectId: string;
  updateLocalContent: (action: InvitationEditorLocalAction) => void;
};

export function InvitationEditorActivePanel({
  activeSection,
  content,
  fieldErrors,
  projectId,
  updateLocalContent,
}: InvitationEditorActivePanelProps) {
  switch (activeSection) {
    case 'style':
      return (
        <InvitationWorkspacePanel active section="style">
          <InvitationTemplatePicker
            error={getError(fieldErrors, 'templateKey')}
            onPaletteSelect={(paletteKey) => {
              updateLocalContent({ paletteKey, type: 'palette' });
            }}
            onSelect={(templateKey) => {
              updateLocalContent({ templateKey, type: 'template' });
            }}
            paletteError={getError(fieldErrors, 'paletteKey')}
            selectedPaletteKey={content.paletteKey}
            selectedTemplateKey={content.templateKey}
          />
        </InvitationWorkspacePanel>
      );
    case 'opening':
      return (
        <InvitationWorkspacePanel active section="opening">
          <EditorSection
            description="Sapaan dan judul pertama yang menyambut tamu."
            number="02"
            title="Pembuka"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <EditorTextField
                error={getError(fieldErrors, 'hero.eyebrow')}
                label="Sapaan kecil"
                name="hero.eyebrow"
                onValueChange={(value) =>
                  updateLocalContent({ field: 'eyebrow', type: 'hero', value })
                }
                value={content.hero.eyebrow}
              />
              <EditorTextField
                error={getError(fieldErrors, 'hero.title')}
                label="Judul utama undangan"
                name="hero.title"
                onValueChange={(value) =>
                  updateLocalContent({ field: 'title', type: 'hero', value })
                }
                value={content.hero.title}
              />
              <div className="sm:col-span-2">
                <EditorTextField
                  error={getError(fieldErrors, 'hero.subtitle')}
                  label="Kalimat pendamping"
                  name="hero.subtitle"
                  onValueChange={(value) =>
                    updateLocalContent({ field: 'subtitle', type: 'hero', value })
                  }
                  value={content.hero.subtitle}
                />
              </div>
            </div>

            <div className="border-seraya-border-default mt-7 space-y-5 border-t pt-6">
              <div>
                <h3 className="text-seraya-text-primary text-base font-semibold">
                  Suasana pembuka
                </h3>
                <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                  Atur pesan dan ritme pembuka tanpa mengubah identitas visual template.
                </p>
              </div>
              <label className="grid gap-2 text-sm font-semibold">
                Treatment pembuka
                <select
                  className="border-seraya-border-default bg-seraya-surface focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-md)] border px-3.5"
                  name="opening.treatment"
                  onChange={(event) =>
                    updateLocalContent({
                      field: 'treatment',
                      type: 'opening-atmosphere',
                      value: event.currentTarget.value,
                    })
                  }
                  value={content.opening.treatment}
                >
                  <option value="soft">Lembut</option>
                  <option value="editorial">Editorial</option>
                  <option value="ceremonial">Seremonial</option>
                </select>
                <FieldError
                  message={getError(fieldErrors, 'opening.treatment')}
                  name="opening.treatment"
                />
              </label>
              <EditorTextAreaField
                error={getError(fieldErrors, 'opening.message')}
                help="Muncul setelah sampul dan sebelum tamu memasuki isi undangan."
                label="Pesan pembuka (opsional)"
                name="opening.message"
                onValueChange={(value) =>
                  updateLocalContent({
                    field: 'message',
                    type: 'opening-atmosphere',
                    value,
                  })
                }
                value={content.opening.message}
              />
              <EditorTextAreaField
                error={getError(fieldErrors, 'opening.quote')}
                help="Gunakan satu kutipan singkat. Jangan menempelkan HTML atau lirik panjang."
                label="Kutipan pembuka (opsional)"
                name="opening.quote"
                onValueChange={(value) =>
                  updateLocalContent({
                    field: 'quote',
                    type: 'opening-atmosphere',
                    value,
                  })
                }
                value={content.opening.quote}
              />
            </div>
          </EditorSection>
        </InvitationWorkspacePanel>
      );
    case 'couple':
      return (
        <InvitationWorkspacePanel active section="couple">
          <EditorSection
            description="Nama yang ingin kalian tampilkan di undangan."
            number="03"
            title="Mempelai"
          >
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-7">
              <fieldset className="space-y-4">
                <legend className="text-seraya-text-primary text-base font-semibold">
                  Mempelai pertama
                </legend>
                <EditorTextField
                  error={getError(fieldErrors, 'couple.personOne.displayName')}
                  label="Nama yang tampil di undangan"
                  name="couple.personOne.displayName"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'displayName',
                      person: 'personOne',
                      type: 'person',
                      value,
                    })
                  }
                  required
                  value={content.couple.personOne.displayName}
                />
                <EditorTextField
                  error={getError(fieldErrors, 'couple.personOne.fullName')}
                  label="Nama lengkap (opsional)"
                  name="couple.personOne.fullName"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'fullName',
                      person: 'personOne',
                      type: 'person',
                      value,
                    })
                  }
                  value={content.couple.personOne.fullName}
                />
                <EditorTextField
                  error={getError(fieldErrors, 'couple.personOne.parentLine')}
                  label="Orang tua atau keluarga (opsional)"
                  name="couple.personOne.parentLine"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'parentLine',
                      person: 'personOne',
                      type: 'person',
                      value,
                    })
                  }
                  value={content.couple.personOne.parentLine}
                />
              </fieldset>
              <fieldset className="border-seraya-border-default space-y-4 border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
                <legend className="text-seraya-text-primary text-base font-semibold">
                  Mempelai kedua
                </legend>
                <EditorTextField
                  error={getError(fieldErrors, 'couple.personTwo.displayName')}
                  label="Nama yang tampil di undangan"
                  name="couple.personTwo.displayName"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'displayName',
                      person: 'personTwo',
                      type: 'person',
                      value,
                    })
                  }
                  required
                  value={content.couple.personTwo.displayName}
                />
                <EditorTextField
                  error={getError(fieldErrors, 'couple.personTwo.fullName')}
                  label="Nama lengkap (opsional)"
                  name="couple.personTwo.fullName"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'fullName',
                      person: 'personTwo',
                      type: 'person',
                      value,
                    })
                  }
                  value={content.couple.personTwo.fullName}
                />
                <EditorTextField
                  error={getError(fieldErrors, 'couple.personTwo.parentLine')}
                  label="Orang tua atau keluarga (opsional)"
                  name="couple.personTwo.parentLine"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'parentLine',
                      person: 'personTwo',
                      type: 'person',
                      value,
                    })
                  }
                  value={content.couple.personTwo.parentLine}
                />
              </fieldset>
            </div>

            <div className="border-seraya-border-default mt-7 space-y-5 border-t pt-6">
              <div>
                <h3 className="text-seraya-text-primary text-base font-semibold">
                  Identitas pasangan
                </h3>
                <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                  Identitas ini bersifat publik dan konsisten pada undangan generik maupun personal.
                </p>
              </div>
              <EditorToggle
                checked={content.coupleIdentity.monogram.enabled}
                error={getError(fieldErrors, 'coupleIdentity.monogram.enabled')}
                help="Bila teks dikosongkan, Seraya menurunkan monogram dari nama pasangan."
                label="Tampilkan monogram pasangan"
                name="coupleIdentity.monogram.enabled"
                onToggle={(value) =>
                  updateLocalContent({
                    field: 'enabled',
                    type: 'couple-monogram',
                    value,
                  })
                }
              />
              <div
                className="grid gap-5 sm:grid-cols-2"
                hidden={!content.coupleIdentity.monogram.enabled}
              >
                <label className="grid gap-2 text-sm font-semibold">
                  Gaya monogram
                  <select
                    className="border-seraya-border-default bg-seraya-surface focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-md)] border px-3.5"
                    name="coupleIdentity.monogram.style"
                    onChange={(event) =>
                      updateLocalContent({
                        field: 'style',
                        type: 'couple-monogram',
                        value: event.currentTarget.value,
                      })
                    }
                    value={content.coupleIdentity.monogram.style}
                  >
                    <option value="initials">Inisial dengan ampersand</option>
                    <option value="joined_initials">Inisial menyatu</option>
                    <option value="wordmark">Wordmark</option>
                  </select>
                  <FieldError
                    message={getError(fieldErrors, 'coupleIdentity.monogram.style')}
                    name="coupleIdentity.monogram.style"
                  />
                </label>
                <EditorTextField
                  error={getError(fieldErrors, 'coupleIdentity.monogram.text')}
                  help="Kosongkan untuk memakai hasil otomatis dari nama pasangan."
                  label="Teks monogram (opsional)"
                  name="coupleIdentity.monogram.text"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'text',
                      type: 'couple-monogram',
                      value,
                    })
                  }
                  value={content.coupleIdentity.monogram.text}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <EditorTextField
                  error={getError(fieldErrors, 'coupleIdentity.shortName')}
                  label="Nama singkat pasangan (opsional)"
                  name="coupleIdentity.shortName"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'shortName',
                      type: 'couple-identity',
                      value,
                    })
                  }
                  placeholder="Raka dan Nadia"
                  value={content.coupleIdentity.shortName}
                />
                <EditorTextField
                  error={getError(fieldErrors, 'coupleIdentity.weddingHashtag')}
                  help="Contoh: #RakaNadia2027"
                  label="Wedding hashtag (opsional)"
                  name="coupleIdentity.weddingHashtag"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'weddingHashtag',
                      type: 'couple-identity',
                      value,
                    })
                  }
                  value={content.coupleIdentity.weddingHashtag}
                />
                <EditorTextField
                  error={getError(fieldErrors, 'coupleIdentity.socialLinks.instagram')}
                  label="Profil Instagram (opsional)"
                  name="coupleIdentity.socialLinks.instagram"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'instagram',
                      type: 'couple-social',
                      value,
                    })
                  }
                  placeholder="https://www.instagram.com/..."
                  type="url"
                  value={content.coupleIdentity.socialLinks.instagram}
                />
                <EditorTextField
                  error={getError(fieldErrors, 'coupleIdentity.socialLinks.tiktok')}
                  label="Profil TikTok (opsional)"
                  name="coupleIdentity.socialLinks.tiktok"
                  onValueChange={(value) =>
                    updateLocalContent({
                      field: 'tiktok',
                      type: 'couple-social',
                      value,
                    })
                  }
                  placeholder="https://www.tiktok.com/@..."
                  type="url"
                  value={content.coupleIdentity.socialLinks.tiktok}
                />
                <div className="sm:col-span-2">
                  <EditorTextField
                    error={getError(fieldErrors, 'coupleIdentity.socialLinks.website')}
                    label="Website pasangan (opsional)"
                    name="coupleIdentity.socialLinks.website"
                    onValueChange={(value) =>
                      updateLocalContent({
                        field: 'website',
                        type: 'couple-social',
                        value,
                      })
                    }
                    placeholder="https://..."
                    type="url"
                    value={content.coupleIdentity.socialLinks.website}
                  />
                </div>
              </div>
            </div>
          </EditorSection>
        </InvitationWorkspacePanel>
      );
    case 'story':
      return (
        <InvitationWorkspacePanel active section="story">
          <EditorSection
            description="Bagian opsional untuk membagikan sedikit cerita."
            number="04"
            title="Cerita kalian"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.story.enabled}
                error={getError(fieldErrors, 'story.enabled')}
                help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                label="Tampilkan cerita kalian"
                name="story.enabled"
                onToggle={(value) => updateLocalContent({ field: 'enabled', type: 'story', value })}
              />
              <div className="space-y-5" hidden={!content.story.enabled}>
                <EditorTextField
                  error={getError(fieldErrors, 'story.heading')}
                  label="Judul cerita"
                  name="story.heading"
                  onValueChange={(value) =>
                    updateLocalContent({ field: 'heading', type: 'story', value })
                  }
                  value={content.story.heading}
                />
                <EditorTextAreaField
                  error={getError(fieldErrors, 'story.body')}
                  label="Cerita kalian"
                  name="story.body"
                  onValueChange={(value) =>
                    updateLocalContent({ field: 'body', type: 'story', value })
                  }
                  value={content.story.body}
                />
              </div>
            </div>
          </EditorSection>
        </InvitationWorkspacePanel>
      );
    case 'schedule':
      return (
        <InvitationWorkspacePanel active section="schedule">
          <EditorSection
            description="Tambahkan akad, resepsi, atau acara lain dalam satu undangan."
            number="05"
            title="Rangkaian Acara"
          >
            <div className="space-y-5">
              <div className="border-seraya-border-default bg-seraya-brand-soft/45 flex flex-col gap-4 rounded-[var(--seraya-radius-md)] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <p className="text-seraya-text-primary text-sm font-semibold">
                    Susun acara kalian
                  </p>
                  <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                    Acara pertama menjadi acara utama yang digunakan pada ringkasan undangan.
                  </p>
                </div>
                <Button
                  disabled={content.eventSchedule.events.length >= 4}
                  onClick={() => {
                    updateLocalContent({
                      events: [...content.eventSchedule.events, createEventScheduleItem()],
                      type: 'schedule',
                    });
                  }}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Tambah acara
                </Button>
              </div>

              <div className="space-y-4">
                {content.eventSchedule.events.map((event, index) => (
                  <EditorScheduleEventCard
                    errors={fieldErrors}
                    event={event}
                    index={index}
                    key={event.id}
                    onChange={(nextEvent) => {
                      updateLocalContent({
                        events: content.eventSchedule.events.map((candidate) =>
                          candidate.id === nextEvent.id ? nextEvent : candidate,
                        ),
                        type: 'schedule',
                      });
                    }}
                    onMoveDown={() => {
                      if (index === content.eventSchedule.events.length - 1) {
                        return;
                      }

                      const events = [...content.eventSchedule.events];
                      [events[index], events[index + 1]] = [events[index + 1]!, events[index]!];
                      updateLocalContent({ events, type: 'schedule' });
                    }}
                    onMoveUp={() => {
                      if (index === 0) {
                        return;
                      }

                      const events = [...content.eventSchedule.events];
                      [events[index - 1], events[index]] = [events[index]!, events[index - 1]!];
                      updateLocalContent({ events, type: 'schedule' });
                    }}
                    onRemove={() => {
                      if (content.eventSchedule.events.length === 1) {
                        return;
                      }

                      updateLocalContent({
                        events: content.eventSchedule.events.filter((item) => item.id !== event.id),
                        type: 'schedule',
                      });
                    }}
                    removable={content.eventSchedule.events.length > 1}
                    total={content.eventSchedule.events.length}
                  />
                ))}
              </div>
              <FieldError
                message={getError(fieldErrors, 'eventSchedule.events')}
                name="eventSchedule.events"
              />
            </div>
          </EditorSection>
        </InvitationWorkspacePanel>
      );
    case 'gallery':
      return (
        <InvitationWorkspacePanel active section="gallery">
          <EditorSection
            description="Foto undangan dikelola di ruang galeri agar urutan dan proses upload tetap aman."
            number="06"
            title="Galeri"
          >
            <div className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border p-4 sm:p-5">
              <p className="text-seraya-text-primary font-semibold">
                {content.gallery.imageIds.length > 0
                  ? `${content.gallery.imageIds.length} foto tersimpan`
                  : 'Belum ada foto tersimpan'}
              </p>
              <p className="text-seraya-text-muted mt-1.5 max-w-xl text-sm leading-6">
                Tambah, hapus, dan atur foto dari pengelola galeri. Kalian akan kembali ke bagian
                ini tanpa mengubah draft undangan.
              </p>
              <Link
                className="border-seraya-border-default bg-seraya-canvas text-seraya-text-primary hover:border-seraya-border-strong focus-visible:outline-seraya-focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2"
                href={`/dashboard/${projectId}/gallery`}
              >
                Kelola galeri
              </Link>
            </div>
          </EditorSection>
        </InvitationWorkspacePanel>
      );
    case 'rsvp':
      return (
        <InvitationWorkspacePanel active section="rsvp">
          <EditorSection
            description="Atur teks RSVP yang akan dilihat tamu."
            number="07"
            title="Konfirmasi kehadiran"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.rsvp.enabled}
                error={getError(fieldErrors, 'rsvp.enabled')}
                help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                label="Tampilkan konfirmasi kehadiran"
                name="rsvp.enabled"
                onToggle={(value) => updateLocalContent({ field: 'enabled', type: 'rsvp', value })}
              />
              <div className="space-y-5" hidden={!content.rsvp.enabled}>
                <EditorTextField
                  error={getError(fieldErrors, 'rsvp.heading')}
                  label="Judul bagian RSVP"
                  name="rsvp.heading"
                  onValueChange={(value) =>
                    updateLocalContent({ field: 'heading', type: 'rsvp', value })
                  }
                  value={content.rsvp.heading}
                />
                <EditorTextAreaField
                  error={getError(fieldErrors, 'rsvp.lead')}
                  label="Pesan untuk tamu"
                  name="rsvp.lead"
                  onValueChange={(value) =>
                    updateLocalContent({ field: 'lead', type: 'rsvp', value })
                  }
                  value={content.rsvp.lead}
                />
              </div>
            </div>
          </EditorSection>
        </InvitationWorkspacePanel>
      );
    case 'gift':
      return (
        <InvitationWorkspacePanel active section="gift">
          <EditorSection
            description="Bagikan informasi rekening atau e-wallet untuk hadiah pernikahan. Informasi ini akan tampil pada undangan setelah dipublikasikan."
            number="08"
            title="Amplop Digital"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.digitalGift.enabled}
                error={getError(fieldErrors, 'digitalGift.enabled')}
                help="Tampilkan informasi transfer ini pada undangan setelah diterbitkan."
                label="Tampilkan Amplop Digital"
                name="digitalGift.enabled"
                onToggle={(value) =>
                  updateLocalContent({ field: 'enabled', type: 'digital-gift', value })
                }
              />
              <div className="space-y-5" hidden={!content.digitalGift.enabled}>
                <EditorTextField
                  error={getError(fieldErrors, 'digitalGift.heading')}
                  label="Judul Amplop Digital (opsional)"
                  name="digitalGift.heading"
                  onValueChange={(value) =>
                    updateLocalContent({ field: 'heading', type: 'digital-gift', value })
                  }
                  value={content.digitalGift.heading}
                />
                <EditorTextAreaField
                  error={getError(fieldErrors, 'digitalGift.lead')}
                  label="Pesan pengantar (opsional)"
                  name="digitalGift.lead"
                  onValueChange={(value) =>
                    updateLocalContent({ field: 'lead', type: 'digital-gift', value })
                  }
                  value={content.digitalGift.lead}
                />

                <div className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-seraya-text-primary text-base font-semibold">
                        Rekening atau e-wallet
                      </h3>
                      <p className="text-seraya-text-muted mt-1 max-w-xl text-sm leading-6">
                        Nomor hanya akan ditampilkan setelah undangan dipublikasikan.
                      </p>
                    </div>
                    <Button
                      disabled={content.digitalGift.accounts.length >= 3}
                      onClick={() => {
                        updateLocalContent({
                          accounts: [
                            ...content.digitalGift.accounts,
                            {
                              accountHolder: '',
                              accountNumber: '',
                              id: createDigitalGiftAccountId(),
                              providerName: '',
                            },
                          ],
                          type: 'digital-gift-accounts',
                        });
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Tambah rekening
                    </Button>
                  </div>

                  {content.digitalGift.accounts.length === 0 ? (
                    <p className="text-seraya-text-muted bg-seraya-canvas mt-5 rounded-[var(--seraya-radius-sm)] px-3.5 py-3 text-sm leading-6">
                      Tambahkan setidaknya satu rekening atau e-wallet sebelum menampilkan Amplop
                      Digital.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {content.digitalGift.accounts.map((account, index) => {
                        const accountPrefix = `digitalGift.accounts.${index}`;

                        return (
                          <fieldset
                            className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border p-4 sm:p-5"
                            key={account.id}
                          >
                            <legend className="text-seraya-text-primary px-1 text-base font-semibold">
                              Rekening {index + 1}
                            </legend>
                            <div className="mt-2 flex justify-end">
                              <Button
                                onClick={() => {
                                  updateLocalContent({
                                    accounts: content.digitalGift.accounts.filter(
                                      (item) => item.id !== account.id,
                                    ),
                                    type: 'digital-gift-accounts',
                                  });
                                }}
                                size="sm"
                                type="button"
                                variant="text"
                              >
                                Hapus rekening
                              </Button>
                            </div>
                            <input name={`${accountPrefix}.id`} type="hidden" value={account.id} />
                            <div className="mt-4 grid gap-4">
                              <EditorTextField
                                error={getError(fieldErrors, `${accountPrefix}.providerName`)}
                                label="Penyedia / Bank / E-wallet"
                                name={`${accountPrefix}.providerName`}
                                onValueChange={(value) =>
                                  updateLocalContent({
                                    accounts: content.digitalGift.accounts.map((candidate) =>
                                      candidate.id === account.id
                                        ? { ...candidate, providerName: value }
                                        : candidate,
                                    ),
                                    type: 'digital-gift-accounts',
                                  })
                                }
                                required
                                value={account.providerName}
                              />
                              <EditorTextField
                                autoComplete="name"
                                error={getError(fieldErrors, `${accountPrefix}.accountHolder`)}
                                label="Nama pemilik rekening"
                                name={`${accountPrefix}.accountHolder`}
                                onValueChange={(value) =>
                                  updateLocalContent({
                                    accounts: content.digitalGift.accounts.map((candidate) =>
                                      candidate.id === account.id
                                        ? { ...candidate, accountHolder: value }
                                        : candidate,
                                    ),
                                    type: 'digital-gift-accounts',
                                  })
                                }
                                required
                                value={account.accountHolder}
                              />
                              <EditorTextField
                                autoComplete="off"
                                error={getError(fieldErrors, `${accountPrefix}.accountNumber`)}
                                help="Nomor hanya akan ditampilkan setelah undangan dipublikasikan."
                                inputMode="numeric"
                                label="Nomor rekening / nomor e-wallet"
                                name={`${accountPrefix}.accountNumber`}
                                onValueChange={(value) =>
                                  updateLocalContent({
                                    accounts: content.digitalGift.accounts.map((candidate) =>
                                      candidate.id === account.id
                                        ? { ...candidate, accountNumber: value }
                                        : candidate,
                                    ),
                                    type: 'digital-gift-accounts',
                                  })
                                }
                                required
                                value={account.accountNumber}
                              />
                            </div>
                          </fieldset>
                        );
                      })}
                    </div>
                  )}
                  <FieldError
                    message={getError(fieldErrors, 'digitalGift.accounts')}
                    name="digitalGift.accounts"
                  />
                </div>
              </div>
            </div>
          </EditorSection>
        </InvitationWorkspacePanel>
      );
    case 'closing':
      return (
        <InvitationWorkspacePanel active section="closing">
          <EditorSection
            description="Pesan terakhir yang tampil di akhir undangan."
            number="09"
            title="Penutup"
          >
            <div className="space-y-5">
              <EditorToggle
                checked={content.closing.enabled}
                error={getError(fieldErrors, 'closing.enabled')}
                help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                label="Tampilkan penutup"
                name="closing.enabled"
                onToggle={(value) =>
                  updateLocalContent({ field: 'enabled', type: 'closing', value })
                }
              />
              <div className="space-y-5" hidden={!content.closing.enabled}>
                <EditorTextAreaField
                  error={getError(fieldErrors, 'closing.message')}
                  label="Pesan penutup"
                  name="closing.message"
                  onValueChange={(value) =>
                    updateLocalContent({ field: 'message', type: 'closing', value })
                  }
                  value={content.closing.message}
                />
                <EditorTextField
                  error={getError(fieldErrors, 'closing.signature')}
                  label="Nama penutup"
                  name="closing.signature"
                  onValueChange={(value) =>
                    updateLocalContent({ field: 'signature', type: 'closing', value })
                  }
                  value={content.closing.signature}
                />
              </div>
            </div>
          </EditorSection>
        </InvitationWorkspacePanel>
      );
    default:
      return null;
  }
}

export function InvitationEditor({
  draft,
  galleryImages = [],
  project = fallbackProjectMetadata,
  projectId,
  readiness,
}: InvitationEditorProps) {
  const {
    actionState: state,
    content,
    formAction,
    formId,
    hasSaved,
    isDirty,
    isPending,
    submissionPayload,
    updateLocalContent,
  } = useInvitationStudioState();
  const workspaceReadiness = readiness ?? fallbackWorkspaceReadiness;
  const confidenceStatus = getInvitationConfidenceStatus(workspaceReadiness.invitation.state);
  const confidenceChecklist = useMemo(() => getInvitationConfidenceChecklist(draft), [draft]);
  const shouldShowPublishControl =
    workspaceReadiness.invitation.state === 'ready_to_publish' ||
    workspaceReadiness.invitation.state === 'published_with_unpublished_changes';
  const [isLocalPreviewOpen, setIsLocalPreviewOpen] = useState(false);
  const [shouldMountDesktopPreview, setShouldMountDesktopPreview] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<InvitationAudioConfiguration>(
    draft.content.audio,
  );
  const [previewContent, setPreviewContent] = useState(content);
  const [isEditorInteractive, setIsEditorInteractive] = useState(false);
  const [activeSection, setActiveSection] = useState<InvitationEditorSectionKey>('style');
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const workspaceStartRef = useRef<HTMLDivElement | null>(null);
  const sectionStatuses = useMemo(
    () => getInvitationEditorSectionStatuses({ ...draft, content }, state.fieldErrors),
    [content, draft, state.fieldErrors],
  );
  const errorSections = useMemo(
    () => getInvitationEditorErrorSections(state.fieldErrors),
    [state.fieldErrors],
  );
  const documentTruth = useMemo(
    () =>
      getInvitationEditorDocumentTruth({
        actionStatus: state.status,
        hasPublishedSnapshot: workspaceReadiness.invitation.hasPublishedSnapshot,
        hasSaved,
        hasUnpublishedChanges: workspaceReadiness.invitation.hasUnpublishedChanges,
        isDirty,
        isPending,
      }),
    [
      hasSaved,
      isDirty,
      isPending,
      state.status,
      workspaceReadiness.invitation.hasPublishedSnapshot,
      workspaceReadiness.invitation.hasUnpublishedChanges,
    ],
  );
  const shouldMountPreview = isLocalPreviewOpen || shouldMountDesktopPreview;

  const handleOpenLocalPreview = useCallback(() => {
    setPreviewContent(content);
    setIsLocalPreviewOpen(true);
  }, [content]);

  const handleSectionSelect = useCallback((section: InvitationEditorSectionKey) => {
    setActiveSection(section);

    if (typeof window !== 'undefined') {
      const nextUrl = `${window.location.pathname}${window.location.search}#bagian-${section}`;
      window.history.replaceState(window.history.state, '', nextUrl);
      window.requestAnimationFrame(() =>
        workspaceStartRef.current?.scrollIntoView({ block: 'start' }),
      );
    }
  }, []);

  useEffect(() => {
    const requestedSection = window.location.hash.replace('#bagian-', '');
    const sectionExists = invitationEditorSections.some(
      (section) => section.key === requestedSection,
    );

    if (sectionExists) {
      const frame = window.requestAnimationFrame(() => {
        setActiveSection(requestedSection as InvitationEditorSectionKey);
      });

      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => {
    const root = editorRootRef.current;
    const shellMetric = {
      dom_node_count: root?.querySelectorAll('*').length ?? 0,
      event: 'invitation_editor_shell_ready',
      mounted_panel_count: root?.querySelectorAll('[data-invitation-editor-panel]').length ?? 0,
      total_ms: Math.round(performance.now()),
    };

    console.info(
      JSON.stringify({
        level: 'info',
        source: 'invitation-editor-performance',
        ...shellMetric,
      }),
    );
    window.dispatchEvent(
      new CustomEvent('seraya:invitation-editor-performance', { detail: shellMetric }),
    );

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setIsEditorInteractive(true);
        const interactiveMetric = {
          dom_node_count: root?.querySelectorAll('*').length ?? 0,
          event: 'invitation_editor_interactive_ready',
          mounted_panel_count: root?.querySelectorAll('[data-invitation-editor-panel]').length ?? 0,
          total_ms: Math.round(performance.now()),
        };

        performance.mark('seraya:invitation-editor:interactive-ready');
        console.info(
          JSON.stringify({
            level: 'info',
            source: 'invitation-editor-performance',
            ...interactiveMetric,
          }),
        );
        window.dispatchEvent(
          new CustomEvent('seraya:invitation-editor-performance', {
            detail: interactiveMetric,
          }),
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  useEffect(() => {
    const desktopPreview = window.matchMedia('(min-width: 96rem)');
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const cancelScheduledMount = () => {
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        globalThis.clearTimeout(timeoutHandle);
      }
      idleHandle = null;
      timeoutHandle = null;
    };

    const scheduleMount = () => {
      cancelScheduledMount();

      if (!desktopPreview.matches) {
        setShouldMountDesktopPreview(false);
        return;
      }

      if ('requestIdleCallback' in window) {
        idleHandle = window.requestIdleCallback(() => setShouldMountDesktopPreview(true), {
          timeout: 1_200,
        });
      } else {
        timeoutHandle = globalThis.setTimeout(() => setShouldMountDesktopPreview(true), 450);
      }
    };

    scheduleMount();
    desktopPreview.addEventListener('change', scheduleMount);

    return () => {
      cancelScheduledMount();
      desktopPreview.removeEventListener('change', scheduleMount);
    };
  }, []);

  useEffect(() => {
    if (!shouldMountPreview) {
      return;
    }

    const timeout = window.setTimeout(
      () => setPreviewContent(content),
      isLocalPreviewOpen ? 80 : 180,
    );

    return () => window.clearTimeout(timeout);
  }, [content, isLocalPreviewOpen, shouldMountPreview]);

  useEffect(() => {
    const handleAudioChanged = (event: Event) => {
      const detail = (event as CustomEvent<InvitationAudioChangedEventDetail>).detail;

      setPreviewAudio(
        detail.enabled && detail.durationSeconds
          ? {
              assetId: 'persisted-owner-audio',
              durationSeconds: detail.durationSeconds,
              originalFileName: 'Audio undangan',
              rightsAcknowledged: true,
            }
          : {
              assetId: null,
              durationSeconds: null,
              originalFileName: null,
              rightsAcknowledged: false,
            },
      );
    };

    window.addEventListener(INVITATION_AUDIO_CHANGED_EVENT, handleAudioChanged);
    return () => window.removeEventListener(INVITATION_AUDIO_CHANGED_EVENT, handleAudioChanged);
  }, []);

  useEffect(() => {
    if (state.status !== 'error') {
      return;
    }

    const firstErrorSection = getInvitationEditorErrorSections(state.fieldErrors)[0];

    const frame = window.requestAnimationFrame(() => {
      if (firstErrorSection) {
        setActiveSection(firstErrorSection);
      }

      errorSummaryRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  return (
    <div
      data-dashboard-width="wide"
      data-invitation-editor-runtime-ready={isEditorInteractive ? 'true' : 'false'}
      ref={editorRootRef}
    >
      <Card aria-labelledby="invitation-editor-title" className="w-full overflow-visible">
        <div className="bg-seraya-brand-soft rounded-t-[var(--seraya-radius-lg)] px-5 py-8 sm:px-8 sm:py-10">
          <Badge variant={workspaceReadiness.invitation.hasPublishedSnapshot ? 'success' : 'brand'}>
            {confidenceStatus.badge}
          </Badge>
          <p className="text-seraya-text-secondary mt-5 text-sm font-semibold">
            {workspaceReadiness.identity.coupleLabel}
          </p>
          <h1
            className="seraya-display-md mt-3 max-w-2xl text-[clamp(2.25rem,5vw,3.5rem)]"
            id="invitation-editor-title"
          >
            {confidenceStatus.title}
          </h1>
          <p className="text-seraya-text-secondary mt-4 max-w-2xl text-base leading-7">
            {confidenceStatus.description}
          </p>
        </div>

        <CardHeader className="border-seraya-border-default gap-5 border-b pb-5 sm:pb-6">
          <section
            aria-label="Ringkasan undangan"
            className="bg-seraya-canvas rounded-[var(--seraya-radius-md)] px-4 py-3.5"
          >
            <dl className="grid gap-2 text-sm sm:grid-cols-3 sm:gap-4">
              <div>
                <dt className="text-seraya-text-muted">Pasangan</dt>
                <dd className="text-seraya-text-primary mt-0.5 font-semibold">
                  {workspaceReadiness.identity.coupleLabel}
                </dd>
              </div>
              <div>
                <dt className="text-seraya-text-muted">Template</dt>
                <dd className="text-seraya-text-primary mt-0.5 font-semibold">
                  {workspaceReadiness.identity.templateKey ?? 'Belum dipilih'}
                </dd>
              </div>
              <div>
                <dt className="text-seraya-text-muted">Status</dt>
                <dd className="text-seraya-text-primary mt-0.5 font-semibold">
                  {confidenceStatus.badge}
                </dd>
              </div>
            </dl>
          </section>
          <section
            aria-labelledby="invitation-readiness-title"
            className="bg-seraya-surface rounded-[var(--seraya-radius-md)] px-4 py-4"
          >
            <h2
              className="text-seraya-text-primary text-base font-semibold"
              id="invitation-readiness-title"
            >
              Siap ditinjau
            </h2>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {confidenceChecklist.map((item) => (
                <li className="text-seraya-text-secondary flex items-center gap-2" key={item.key}>
                  <span aria-hidden="true">{item.complete ? '✓' : '○'}</span>
                  <span>
                    {item.label}
                    {item.optional && !item.complete
                      ? ' — Opsional, dapat ditambahkan bila diperlukan'
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <InvitationEditorDocumentTruthPanel truth={documentTruth} />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="font-sans text-lg font-semibold tracking-[-0.02em]">
                Edit undangan
              </CardTitle>
              <CardDescription className="mt-1.5 max-w-2xl">
                Template, detail pasangan, jadwal, lokasi, galeri, Amplop Digital, dan penutup
                semuanya dikelola di sini.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-start">
              <Link
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                href={`/dashboard/${projectId}/preview`}
              >
                Preview tersimpan
              </Link>
              {shouldShowPublishControl ? (
                <PublishInvitationControls
                  hasActiveDraft
                  intent={
                    workspaceReadiness.invitation.state === 'published_with_unpublished_changes'
                      ? 'republish'
                      : 'initial'
                  }
                  presentation="readiness"
                  projectId={projectId}
                  publishedSlug={workspaceReadiness.invitation.publishedSlug}
                  publishEligibility={getInvitationPublishEligibility(workspaceReadiness)}
                />
              ) : null}
            </div>
          </div>

          <ol
            aria-label="Alur melengkapi undangan"
            className="grid gap-2.5 sm:grid-cols-3 sm:gap-3"
          >
            {[
              ['1', 'Lengkapi detail'],
              ['2', 'Simpan perubahan'],
              ['3', 'Lihat hasil undangan'],
            ].map(([number, label]) => (
              <li
                className="border-seraya-border-default bg-seraya-canvas flex min-h-12 items-center gap-3 rounded-[var(--seraya-radius-md)] border px-3.5 py-3"
                key={number}
              >
                <span
                  aria-hidden="true"
                  className="bg-seraya-brand-soft text-seraya-action-primary inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                >
                  {number}
                </span>
                <span className="text-seraya-text-primary text-sm font-semibold">{label}</span>
              </li>
            ))}
          </ol>
        </CardHeader>

        <CardContent className="max-w-full min-w-0 overflow-x-clip pt-5 sm:pt-6">
          <div
            className="grid max-w-full min-w-0 scroll-mt-24 gap-4 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:items-start xl:gap-6 2xl:grid-cols-[14.5rem_minmax(26rem,1fr)_minmax(21rem,24.5rem)]"
            ref={workspaceStartRef}
          >
            <InvitationWorkspaceNavigation
              activeSection={activeSection}
              onSelect={handleSectionSelect}
              statuses={sectionStatuses}
            />
            <form action={formAction} className="max-w-full min-w-0 space-y-5" id={formId}>
              <input name="projectId" type="hidden" value={projectId} />
              <input name="editorPayload" type="hidden" value={submissionPayload} />

              {state.status === 'error' && state.message ? (
                <div
                  className="border-seraya-status-error/25 bg-seraya-status-error-soft text-seraya-text-primary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6"
                  ref={errorSummaryRef}
                  role="alert"
                  tabIndex={-1}
                >
                  <p className="font-semibold">{state.message}</p>
                  {errorSections.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {errorSections.map((sectionKey) => {
                        const section = invitationEditorSections.find(
                          (candidate) => candidate.key === sectionKey,
                        );

                        return section ? (
                          <button
                            className="border-seraya-status-error/30 bg-seraya-surface text-seraya-status-error min-h-10 rounded-[var(--seraya-radius-sm)] border px-3 text-sm font-semibold"
                            key={section.key}
                            onClick={() => handleSectionSelect(section.key)}
                            type="button"
                          >
                            Periksa {section.label}
                          </button>
                        ) : null;
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <InvitationEditorActivePanel
                activeSection={activeSection}
                content={content}
                fieldErrors={state.fieldErrors}
                projectId={projectId}
                updateLocalContent={updateLocalContent}
              />

              <div
                className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border p-4"
                data-invitation-editor-local-command-bridge
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div
                    aria-live="polite"
                    className="min-w-0"
                    data-testid="invitation-editor-save-status"
                    role="status"
                  >
                    <p className="text-seraya-text-primary text-sm font-semibold">
                      {documentTruth.browser.label}
                    </p>
                    <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                      {documentTruth.browser.description}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-56">
                    <Button
                      aria-haspopup="dialog"
                      className="2xl:hidden"
                      data-local-preview-trigger
                      onClick={handleOpenLocalPreview}
                      size="lg"
                      type="button"
                      variant="secondary"
                    >
                      Preview lokal
                    </Button>
                    <p className="text-seraya-text-muted text-center text-xs leading-5">
                      Simpan perubahan melalui satu kontrol utama di header Studio.
                    </p>
                  </div>
                </div>
              </div>
            </form>
            {shouldMountPreview ? (
              <DeferredInvitationEditorLivePreview
                audio={previewAudio}
                content={previewContent}
                galleryImages={galleryImages}
                isDirty={isDirty}
                isOpen={isLocalPreviewOpen}
                onOpenChange={setIsLocalPreviewOpen}
                project={project}
                projectId={projectId}
              />
            ) : (
              <InvitationEditorDesktopPreviewPlaceholder />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
