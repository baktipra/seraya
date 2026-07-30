'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useCallback, useEffect, useReducer, useRef, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useToast,
} from '@/design-system';
import {
  initialInvitationEditorActionState,
  type InvitationEditorActionState,
} from '@/modules/invitations/invitation-editor.action-state';
import { saveInvitationEditorAction } from '@/modules/invitations/invitation-editor.actions';
import {
  invitationEditorLocalContentReducer,
  type InvitationEditorLocalAction,
} from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationRendererProjectMetadata } from '@/modules/invitation-templates/invitation-view-model';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
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
import { InvitationEditorLivePreview } from './invitation-editor-live-preview';
import { PublishInvitationControls } from './publish-invitation-controls';
import {
  getInvitationEditorErrorSections,
  getInvitationEditorSectionStatuses,
  invitationEditorSections,
  InvitationWorkspaceNavigation,
  InvitationWorkspacePanel,
  type InvitationEditorSectionKey,
} from './invitation-editor-workspace';

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
export const invitationEditorDirtyNavigationMessage =
  'Perubahan undangan belum disimpan. Yakin ingin meninggalkan halaman ini?';
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

export function shouldConfirmInvitationEditorNavigation(currentHref: string, nextHref: string) {
  const currentUrl = new URL(currentHref);
  const nextUrl = new URL(nextHref, currentUrl);
  const isSameDocumentHash =
    nextUrl.pathname === currentUrl.pathname &&
    nextUrl.search === currentUrl.search &&
    nextUrl.hash.length > 0;

  return !isSameDocumentHash;
}

export function InvitationEditor({
  draft,
  galleryImages = [],
  project = { event_date_primary: null },
  projectId,
  readiness,
}: InvitationEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(
    saveInvitationEditorAction,
    initialInvitationEditorActionState,
  );
  const [content, dispatchLocalContent] = useReducer(
    invitationEditorLocalContentReducer,
    draft.content,
  );
  const workspaceReadiness = readiness ?? fallbackWorkspaceReadiness;
  const confidenceStatus = getInvitationConfidenceStatus(workspaceReadiness.invitation.state);
  const confidenceChecklist = getInvitationConfidenceChecklist(draft);
  const shouldShowPublishControl =
    workspaceReadiness.invitation.state === 'ready_to_publish' ||
    workspaceReadiness.invitation.state === 'published_with_unpublished_changes';
  const [isDirty, setIsDirty] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isLocalPreviewOpen, setIsLocalPreviewOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<InvitationEditorSectionKey>('style');
  const lastHandledSuccessState = useRef<InvitationEditorActionState | null>(null);
  const lastSyncedDraftUpdatedAt = useRef(draft.updated_at);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const workspaceStartRef = useRef<HTMLDivElement | null>(null);
  const sectionStatuses = getInvitationEditorSectionStatuses(draft, state.fieldErrors);
  const errorSections = getInvitationEditorErrorSections(state.fieldErrors);
  const saveStatus = getInvitationEditorSaveStatus({
    actionStatus: state.status,
    hasSaved,
    isDirty,
    isPending,
  });

  const updateLocalContent = useCallback((action: InvitationEditorLocalAction) => {
    dispatchLocalContent(action);
    setIsDirty(true);
  }, []);

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
    if (draft.updated_at === lastSyncedDraftUpdatedAt.current || isDirty) {
      return;
    }

    lastSyncedDraftUpdatedAt.current = draft.updated_at;
    dispatchLocalContent({ content: draft.content, type: 'replace' });
  }, [draft.content, draft.updated_at, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const message = invitationEditorDirtyNavigationMessage;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
    };
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>('a[href]');

      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }

      if (
        !shouldConfirmInvitationEditorNavigation(window.location.href, anchor.href) ||
        window.confirm(message)
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isDirty]);

  useEffect(() => {
    if (state.status !== 'success' || !state.message || lastHandledSuccessState.current === state) {
      return;
    }

    lastHandledSuccessState.current = state;
    setHasSaved(true);
    setIsDirty(false);
    toast({
      description: 'Draft terbaru siap dibuka di preview tersimpan.',
      title: 'Tersimpan',
      variant: 'success',
    });
    router.refresh();
  }, [router, state, toast]);

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
    <div data-dashboard-width="wide">
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
            <form action={formAction} className="max-w-full min-w-0 space-y-5 pb-28 sm:pb-0">
              <input name="projectId" type="hidden" value={projectId} />

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

              <InvitationWorkspacePanel active={activeSection === 'style'} section="style">
                <InvitationTemplatePicker
                  error={getError(state.fieldErrors, 'templateKey')}
                  onSelect={(templateKey) => {
                    updateLocalContent({ templateKey, type: 'template' });
                  }}
                  selectedTemplateKey={content.templateKey}
                />
              </InvitationWorkspacePanel>

              <InvitationWorkspacePanel active={activeSection === 'opening'} section="opening">
                <EditorSection
                  description="Sapaan dan judul pertama yang menyambut tamu."
                  number="02"
                  title="Pembuka"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <EditorTextField
                      error={getError(state.fieldErrors, 'hero.eyebrow')}
                      label="Sapaan kecil"
                      name="hero.eyebrow"
                      onValueChange={(value) =>
                        updateLocalContent({ field: 'eyebrow', type: 'hero', value })
                      }
                      value={content.hero.eyebrow}
                    />
                    <EditorTextField
                      error={getError(state.fieldErrors, 'hero.title')}
                      label="Judul utama undangan"
                      name="hero.title"
                      onValueChange={(value) =>
                        updateLocalContent({ field: 'title', type: 'hero', value })
                      }
                      value={content.hero.title}
                    />
                    <div className="sm:col-span-2">
                      <EditorTextField
                        error={getError(state.fieldErrors, 'hero.subtitle')}
                        label="Kalimat pendamping"
                        name="hero.subtitle"
                        onValueChange={(value) =>
                          updateLocalContent({ field: 'subtitle', type: 'hero', value })
                        }
                        value={content.hero.subtitle}
                      />
                    </div>
                  </div>
                </EditorSection>
              </InvitationWorkspacePanel>

              <InvitationWorkspacePanel active={activeSection === 'couple'} section="couple">
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
                        error={getError(state.fieldErrors, 'couple.personOne.displayName')}
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
                        error={getError(state.fieldErrors, 'couple.personOne.fullName')}
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
                        error={getError(state.fieldErrors, 'couple.personOne.parentLine')}
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
                        error={getError(state.fieldErrors, 'couple.personTwo.displayName')}
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
                        error={getError(state.fieldErrors, 'couple.personTwo.fullName')}
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
                        error={getError(state.fieldErrors, 'couple.personTwo.parentLine')}
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
                </EditorSection>
              </InvitationWorkspacePanel>

              <InvitationWorkspacePanel active={activeSection === 'story'} section="story">
                <EditorSection
                  description="Bagian opsional untuk membagikan sedikit cerita."
                  number="04"
                  title="Cerita kalian"
                >
                  <div className="space-y-5">
                    <EditorToggle
                      checked={content.story.enabled}
                      error={getError(state.fieldErrors, 'story.enabled')}
                      help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                      label="Tampilkan cerita kalian"
                      name="story.enabled"
                      onToggle={(value) =>
                        updateLocalContent({ field: 'enabled', type: 'story', value })
                      }
                    />
                    <div className="space-y-5" hidden={!content.story.enabled}>
                      <EditorTextField
                        error={getError(state.fieldErrors, 'story.heading')}
                        label="Judul cerita"
                        name="story.heading"
                        onValueChange={(value) =>
                          updateLocalContent({ field: 'heading', type: 'story', value })
                        }
                        value={content.story.heading}
                      />
                      <EditorTextAreaField
                        error={getError(state.fieldErrors, 'story.body')}
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

              <InvitationWorkspacePanel active={activeSection === 'schedule'} section="schedule">
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
                          errors={state.fieldErrors}
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
                            [events[index], events[index + 1]] = [
                              events[index + 1]!,
                              events[index]!,
                            ];
                            updateLocalContent({ events, type: 'schedule' });
                          }}
                          onMoveUp={() => {
                            if (index === 0) {
                              return;
                            }

                            const events = [...content.eventSchedule.events];
                            [events[index - 1], events[index]] = [
                              events[index]!,
                              events[index - 1]!,
                            ];
                            updateLocalContent({ events, type: 'schedule' });
                          }}
                          onRemove={() => {
                            if (content.eventSchedule.events.length === 1) {
                              return;
                            }

                            updateLocalContent({
                              events: content.eventSchedule.events.filter(
                                (item) => item.id !== event.id,
                              ),
                              type: 'schedule',
                            });
                          }}
                          removable={content.eventSchedule.events.length > 1}
                          total={content.eventSchedule.events.length}
                        />
                      ))}
                    </div>
                    <FieldError
                      message={getError(state.fieldErrors, 'eventSchedule.events')}
                      name="eventSchedule.events"
                    />
                  </div>
                </EditorSection>
              </InvitationWorkspacePanel>

              <InvitationWorkspacePanel active={activeSection === 'gallery'} section="gallery">
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
                      Tambah, hapus, dan atur foto dari pengelola galeri. Kalian akan kembali ke
                      bagian ini tanpa mengubah draft undangan.
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

              <InvitationWorkspacePanel active={activeSection === 'rsvp'} section="rsvp">
                <EditorSection
                  description="Atur teks RSVP yang akan dilihat tamu."
                  number="07"
                  title="Konfirmasi kehadiran"
                >
                  <div className="space-y-5">
                    <EditorToggle
                      checked={content.rsvp.enabled}
                      error={getError(state.fieldErrors, 'rsvp.enabled')}
                      help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                      label="Tampilkan konfirmasi kehadiran"
                      name="rsvp.enabled"
                      onToggle={(value) =>
                        updateLocalContent({ field: 'enabled', type: 'rsvp', value })
                      }
                    />
                    <div className="space-y-5" hidden={!content.rsvp.enabled}>
                      <EditorTextField
                        error={getError(state.fieldErrors, 'rsvp.heading')}
                        label="Judul bagian RSVP"
                        name="rsvp.heading"
                        onValueChange={(value) =>
                          updateLocalContent({ field: 'heading', type: 'rsvp', value })
                        }
                        value={content.rsvp.heading}
                      />
                      <EditorTextAreaField
                        error={getError(state.fieldErrors, 'rsvp.lead')}
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

              <InvitationWorkspacePanel active={activeSection === 'gift'} section="gift">
                <EditorSection
                  description="Bagikan informasi rekening atau e-wallet untuk hadiah pernikahan. Informasi ini akan tampil pada undangan setelah dipublikasikan."
                  number="08"
                  title="Amplop Digital"
                >
                  <div className="space-y-5">
                    <EditorToggle
                      checked={content.digitalGift.enabled}
                      error={getError(state.fieldErrors, 'digitalGift.enabled')}
                      help="Tampilkan informasi transfer ini pada undangan setelah diterbitkan."
                      label="Tampilkan Amplop Digital"
                      name="digitalGift.enabled"
                      onToggle={(value) =>
                        updateLocalContent({ field: 'enabled', type: 'digital-gift', value })
                      }
                    />
                    <div className="space-y-5" hidden={!content.digitalGift.enabled}>
                      <EditorTextField
                        error={getError(state.fieldErrors, 'digitalGift.heading')}
                        label="Judul Amplop Digital (opsional)"
                        name="digitalGift.heading"
                        onValueChange={(value) =>
                          updateLocalContent({ field: 'heading', type: 'digital-gift', value })
                        }
                        value={content.digitalGift.heading}
                      />
                      <EditorTextAreaField
                        error={getError(state.fieldErrors, 'digitalGift.lead')}
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
                            Tambahkan setidaknya satu rekening atau e-wallet sebelum menampilkan
                            Amplop Digital.
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
                                  <input
                                    name={`${accountPrefix}.id`}
                                    type="hidden"
                                    value={account.id}
                                  />
                                  <div className="mt-4 grid gap-4">
                                    <EditorTextField
                                      error={getError(
                                        state.fieldErrors,
                                        `${accountPrefix}.providerName`,
                                      )}
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
                                      error={getError(
                                        state.fieldErrors,
                                        `${accountPrefix}.accountHolder`,
                                      )}
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
                                      error={getError(
                                        state.fieldErrors,
                                        `${accountPrefix}.accountNumber`,
                                      )}
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
                          message={getError(state.fieldErrors, 'digitalGift.accounts')}
                          name="digitalGift.accounts"
                        />
                      </div>
                    </div>
                  </div>
                </EditorSection>
              </InvitationWorkspacePanel>

              <InvitationWorkspacePanel active={activeSection === 'closing'} section="closing">
                <EditorSection
                  description="Pesan terakhir yang tampil di akhir undangan."
                  number="09"
                  title="Penutup"
                >
                  <div className="space-y-5">
                    <EditorToggle
                      checked={content.closing.enabled}
                      error={getError(state.fieldErrors, 'closing.enabled')}
                      help="Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan."
                      label="Tampilkan penutup"
                      name="closing.enabled"
                      onToggle={(value) =>
                        updateLocalContent({ field: 'enabled', type: 'closing', value })
                      }
                    />
                    <div className="space-y-5" hidden={!content.closing.enabled}>
                      <EditorTextAreaField
                        error={getError(state.fieldErrors, 'closing.message')}
                        label="Pesan penutup"
                        name="closing.message"
                        onValueChange={(value) =>
                          updateLocalContent({ field: 'message', type: 'closing', value })
                        }
                        value={content.closing.message}
                      />
                      <EditorTextField
                        error={getError(state.fieldErrors, 'closing.signature')}
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

              <div className="border-seraya-border-default bg-seraya-surface sticky bottom-0 z-10 -mx-5 border-t px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-10px_20px_rgb(62_42_34_/_0.08)] sm:bottom-4 sm:mx-0 sm:rounded-[var(--seraya-radius-md)] sm:border sm:p-4 sm:shadow-[var(--seraya-shadow-float)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div
                    aria-live="polite"
                    className="min-w-0"
                    data-testid="invitation-editor-save-status"
                    role="status"
                  >
                    <p className="text-seraya-text-primary text-sm font-semibold">
                      {saveStatus.label}
                    </p>
                    <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                      {saveStatus.description}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-56">
                    <div className="grid grid-cols-2 gap-2 2xl:grid-cols-1">
                      <Button
                        aria-haspopup="dialog"
                        className="2xl:hidden"
                        data-local-preview-trigger
                        onClick={() => setIsLocalPreviewOpen(true)}
                        size="lg"
                        type="button"
                        variant="secondary"
                      >
                        Preview lokal
                      </Button>
                      <Button loading={isPending} size="lg" type="submit">
                        Simpan perubahan
                      </Button>
                    </div>
                    <Link
                      className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center justify-center rounded-[var(--seraya-radius-sm)] px-3 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                      href={`/dashboard/${projectId}/preview`}
                    >
                      Buka preview tersimpan
                    </Link>
                    <p className="text-seraya-text-muted text-center text-xs leading-5">
                      Preview tersimpan tetap mengikuti draft dari server.
                    </p>
                  </div>
                </div>
              </div>
            </form>
            <InvitationEditorLivePreview
              content={content}
              galleryImages={galleryImages}
              isDirty={isDirty}
              isOpen={isLocalPreviewOpen}
              onOpenChange={setIsLocalPreviewOpen}
              project={project}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
