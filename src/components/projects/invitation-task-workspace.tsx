'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

import { InvitationEditorActivePanel } from './invitation-editor';
import {
  getInvitationEditorErrorSections,
  getInvitationEditorSectionStatuses,
  invitationEditorSections,
  type InvitationEditorSectionKey,
  type InvitationEditorSectionStatus,
} from './invitation-editor-workspace';
import { useInvitationStudioState } from './invitation-studio-provider';
import type { InvitationStudioStatusTone } from './invitation-studio-shell';
import {
  getInvitationWorkspaceEditorialSectionFromUrl,
  isInvitationWorkspaceContentTask,
  type InvitationWorkspaceContentTask,
  type InvitationWorkspaceEditorialSection,
  type InvitationWorkspaceTask,
} from './invitation-task-workspace.types';
import styles from './invitation-task-workspace.module.css';

type InvitationTaskWorkspaceProps = {
  design: ReactNode;
  draft: InvitationDraft;
  gallery: ReactNode;
  initialSection: InvitationWorkspaceEditorialSection;
  initialTask: InvitationWorkspaceTask | null;
  music: ReactNode;
  preview: ReactNode;
  projectId: string;
  publish: ReactNode;
  readiness: Pick<WeddingReadinessV1, 'identity' | 'invitation'>;
  statusLabel: string;
  statusTone: InvitationStudioStatusTone;
};

type SectionDefinition = {
  description: string;
  group: 'content' | 'display';
  icon: string;
  key: InvitationWorkspaceEditorialSection;
  label: string;
};

const sectionDefinitions: readonly SectionDefinition[] = [
  {
    description: 'Pilih karakter visual Roselle, Aruna, atau Laras.',
    group: 'display',
    icon: '☼',
    key: 'theme',
    label: 'Tema',
  },
  {
    description: 'Nama dan identitas kedua mempelai.',
    group: 'content',
    icon: '♙',
    key: 'couple',
    label: 'Pasangan',
  },
  {
    description: 'Sapaan, judul, dan suasana pembuka undangan.',
    group: 'content',
    icon: '▤',
    key: 'opening',
    label: 'Pembuka',
  },
  {
    description: 'Susun akad, resepsi, dan acara lain.',
    group: 'content',
    icon: '□',
    key: 'schedule',
    label: 'Acara',
  },
  {
    description: 'Venue dan petunjuk lokasi tersimpan pada setiap acara.',
    group: 'content',
    icon: '⌖',
    key: 'location',
    label: 'Lokasi & Peta',
  },
  {
    description: 'Cerita singkat perjalanan kalian.',
    group: 'content',
    icon: '♡',
    key: 'story',
    label: 'Cerita',
  },
  {
    description: 'Kelola foto dan visibilitas galeri.',
    group: 'content',
    icon: '▧',
    key: 'gallery',
    label: 'Galeri',
  },
  {
    description: 'Kelola musik yang mengiringi undangan.',
    group: 'content',
    icon: '♫',
    key: 'music',
    label: 'Musik',
  },
  {
    description: 'Informasi rekening atau e-wallet untuk hadiah.',
    group: 'content',
    icon: '◇',
    key: 'gift',
    label: 'Amplop Digital',
  },
  {
    description: 'Atur teks konfirmasi kehadiran pada undangan personal.',
    group: 'content',
    icon: '✓',
    key: 'rsvp',
    label: 'RSVP',
  },
  {
    description: 'Pesan terakhir dan tanda tangan pasangan.',
    group: 'content',
    icon: '⌑',
    key: 'closing',
    label: 'Penutup',
  },
] as const;

const contentSectionMap: Partial<
  Record<InvitationWorkspaceEditorialSection, InvitationWorkspaceContentTask>
> = {
  closing: 'closing',
  couple: 'couple',
  gift: 'gift',
  opening: 'opening',
  rsvp: 'rsvp',
  schedule: 'schedule',
  story: 'story',
};

function getSectionDefinition(section: InvitationWorkspaceEditorialSection) {
  return (
    sectionDefinitions.find((candidate) => candidate.key === section) ?? sectionDefinitions[0]!
  );
}

function getSectionStatus(
  section: InvitationWorkspaceEditorialSection,
  statuses: ReturnType<typeof getInvitationEditorSectionStatuses>,
  content: InvitationDraft['content'],
): InvitationEditorSectionStatus {
  switch (section) {
    case 'theme':
      return statuses.style;
    case 'location':
      return statuses.schedule;
    case 'gallery':
      return statuses.gallery;
    case 'music':
      return content.audio.assetId ? 'complete' : 'optional_off';
    case 'couple':
    case 'opening':
    case 'schedule':
    case 'story':
    case 'gift':
    case 'rsvp':
    case 'closing':
      return statuses[section];
  }
}

function getStatusLabel(status: InvitationEditorSectionStatus) {
  switch (status) {
    case 'complete':
      return 'Siap';
    case 'error':
      return 'Perlu diperbaiki';
    case 'incomplete':
      return 'Belum lengkap';
    case 'optional_off':
      return 'Opsional';
  }
}

function getPublishActionLabel(readiness: InvitationTaskWorkspaceProps['readiness']) {
  switch (readiness.invitation.state) {
    case 'published_with_unpublished_changes':
      return 'Terbitkan perubahan';
    case 'published':
      return 'Versi terbit';
    default:
      return 'Terbitkan undangan';
  }
}

function SaveAuthority() {
  const studioState = useInvitationStudioState();

  return (
    <div className={styles.saveAuthority} data-invitation-task-save-authority>
      <div
        aria-atomic="true"
        aria-live="polite"
        className={styles.saveCopy}
        data-save-state={studioState.savePresentation.state}
        id="invitation-task-save-description"
        role="status"
      >
        <span className={styles.saveStateDot} aria-hidden="true" />
        <span>
          <strong>{studioState.savePresentation.label}</strong>
          <small>{studioState.savePresentation.description}</small>
        </span>
      </div>
      {studioState.canSave || studioState.isPending ? (
        <button
          aria-describedby="invitation-task-save-description"
          className={styles.saveButton}
          data-invitation-task-save-action
          disabled={!studioState.canSave || studioState.isPending}
          form={studioState.formId}
          type="submit"
        >
          {studioState.savePresentation.actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function StudioSaveFormBridge({ projectId }: { projectId: string }) {
  const studioState = useInvitationStudioState();

  return (
    <form
      action={studioState.formAction}
      className={styles.saveFormBridge}
      id={studioState.formId}
      noValidate
    >
      <input name="projectId" type="hidden" value={projectId} />
      <input name="editorPayload" type="hidden" value={studioState.submissionPayload} />
    </form>
  );
}

function SingleTaskEditor({
  activeSection,
  onSectionChange,
  projectId,
}: {
  activeSection: InvitationWorkspaceContentTask;
  onSectionChange: (section: InvitationWorkspaceEditorialSection) => void;
  projectId: string;
}) {
  const { actionState, content, updateLocalContent } = useInvitationStudioState();
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const errorSections = useMemo(
    () => getInvitationEditorErrorSections(actionState.fieldErrors),
    [actionState.fieldErrors],
  );

  useEffect(() => {
    if (actionState.status !== 'error') return;
    const frame = window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [actionState.status]);

  return (
    <div className={styles.singleTaskForm} data-invitation-single-task-form>
      {actionState.status === 'error' && actionState.message ? (
        <div className={styles.errorSummary} ref={errorSummaryRef} role="alert" tabIndex={-1}>
          <p>{actionState.message}</p>
          {errorSections.length > 0 ? (
            <div className={styles.errorActions}>
              {errorSections.map((sectionKey) => {
                const section = invitationEditorSections.find(
                  (candidate) => candidate.key === sectionKey,
                );
                const editorialSection =
                  sectionKey === 'style'
                    ? 'theme'
                    : sectionKey === 'gallery'
                      ? 'gallery'
                      : isInvitationWorkspaceContentTask(sectionKey as InvitationWorkspaceTask)
                        ? (sectionKey as InvitationWorkspaceEditorialSection)
                        : null;

                return section && editorialSection ? (
                  <button
                    key={section.key}
                    onClick={() => onSectionChange(editorialSection)}
                    type="button"
                  >
                    Periksa {section.studioLabel}
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
        fieldErrors={actionState.fieldErrors}
        projectId={projectId}
        updateLocalContent={updateLocalContent}
      />
    </div>
  );
}

export function InvitationTaskWorkspace({
  design,
  draft,
  gallery,
  initialSection,
  initialTask,
  music,
  preview,
  projectId,
  publish,
  readiness,
  statusLabel,
  statusTone,
}: InvitationTaskWorkspaceProps) {
  const studioState = useInvitationStudioState();
  const [activeSection, setActiveSection] =
    useState<InvitationWorkspaceEditorialSection>(initialSection);
  const [utility, setUtility] = useState<'publish' | null>(
    initialTask === 'publish' ? 'publish' : null,
  );
  const [announcement, setAnnouncement] = useState('');
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const sectionStatuses = useMemo(
    () =>
      getInvitationEditorSectionStatuses(
        { ...draft, content: studioState.content },
        studioState.actionState.fieldErrors,
      ),
    [draft, studioState.actionState.fieldErrors, studioState.content],
  );
  const activeDefinition = getSectionDefinition(activeSection);
  const breadcrumbLabel = utility === 'publish' ? 'Terbitkan' : activeDefinition.label;
  const unpublished = readiness.invitation.state === 'published_with_unpublished_changes';

  useEffect(() => {
    const syncFromLocation = () => {
      const url = new URL(window.location.href);
      setActiveSection(getInvitationWorkspaceEditorialSectionFromUrl(url));
      setUtility(
        url.searchParams.get('task') === 'publish' || url.searchParams.get('mode') === 'publish'
          ? 'publish'
          : null,
      );
    };

    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      headingRef.current?.focus({ preventScroll: true }),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [activeSection, utility]);

  function selectSection(section: InvitationWorkspaceEditorialSection) {
    setActiveSection(section);
    setUtility(null);
    setAnnouncement(`${getSectionDefinition(section).label} dibuka.`);

    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    url.searchParams.delete('task');
    url.searchParams.delete('mode');
    url.hash = '';
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}`);
  }

  function openPublish() {
    setUtility('publish');
    setAnnouncement('Panel penerbitan dibuka.');
    const url = new URL(window.location.href);
    url.searchParams.set('section', activeSection);
    url.searchParams.set('task', 'publish');
    url.searchParams.delete('mode');
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}`);
  }

  function focusPreview() {
    previewRef.current?.focus({ preventScroll: true });
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setAnnouncement('Pratinjau undangan difokuskan.');
  }

  function renderEditor() {
    if (utility === 'publish') {
      return <div className={styles.utilityPanel}>{publish}</div>;
    }

    if (activeSection === 'theme') {
      return <div className={styles.modePanel}>{design}</div>;
    }

    if (activeSection === 'gallery') {
      return <div className={styles.modePanel}>{gallery}</div>;
    }

    if (activeSection === 'music') {
      return <div className={styles.modePanel}>{music}</div>;
    }

    if (activeSection === 'location') {
      return (
        <div className={styles.locationEditor}>
          <div className={styles.contextNote}>
            <span aria-hidden="true">⌖</span>
            <p>
              <strong>Lokasi mengikuti setiap acara.</strong> Venue, alamat, dan petunjuk peta tetap
              menggunakan data acara yang sama agar tidak ada sumber lokasi kedua.
            </p>
          </div>
          <SingleTaskEditor
            activeSection="schedule"
            onSectionChange={selectSection}
            projectId={projectId}
          />
        </div>
      );
    }

    const editorSection = contentSectionMap[activeSection];
    if (!editorSection) return null;

    return (
      <SingleTaskEditor
        activeSection={editorSection}
        onSectionChange={selectSection}
        projectId={projectId}
      />
    );
  }

  return (
    <section
      className={styles.workspace}
      data-invitation-task-workspace
      data-invitation-task-workspace-active={utility ?? activeSection}
      data-invitation-workspace-editorial="v1"
    >
      <StudioSaveFormBridge projectId={projectId} />

      <header className={styles.commandHeader}>
        <div className={styles.breadcrumb}>
          <span>Undangan</span>
          <span aria-hidden="true">/</span>
          <h1 ref={headingRef} tabIndex={-1}>
            {breadcrumbLabel}
          </h1>
        </div>

        <div className={styles.commandActions}>
          <span className={styles.invitationStatus} data-status-tone={statusTone}>
            <span aria-hidden="true" />
            {statusLabel}
          </span>
          <SaveAuthority />
          <button className={styles.previewButton} onClick={focusPreview} type="button">
            <span aria-hidden="true">◉</span>
            Lihat pratinjau
          </button>
          <button className={styles.publishButton} onClick={openPublish} type="button">
            {getPublishActionLabel(readiness)}
          </button>
        </div>
      </header>

      {unpublished ? (
        <div className={styles.unpublishedBanner} role="status">
          <span aria-hidden="true">△</span>
          <p>
            <strong>Ada perubahan yang belum diterbitkan.</strong>{' '}
            <span>Tamu masih melihat versi terbit sebelumnya sampai kalian menerbitkan ulang.</span>
          </p>
        </div>
      ) : null}

      <div className={styles.editorialGrid}>
        <nav aria-label="Bagian undangan" className={styles.sectionRail}>
          <div className={styles.railGroup}>
            <p className={styles.railLabel}>Tampilan</p>
            {sectionDefinitions
              .filter((section) => section.group === 'display')
              .map((section) => {
                const state = getSectionStatus(section.key, sectionStatuses, studioState.content);
                const active = utility === null && activeSection === section.key;
                return (
                  <button
                    aria-current={active ? 'page' : undefined}
                    className={styles.railItem}
                    data-active={active || undefined}
                    data-section-state={state}
                    key={section.key}
                    onClick={() => selectSection(section.key)}
                    title={`${section.label} · ${getStatusLabel(state)}`}
                    type="button"
                  >
                    <span className={styles.railIcon} aria-hidden="true">
                      {section.icon}
                    </span>
                    <span>{section.label}</span>
                    {state === 'error' || state === 'incomplete' ? (
                      <span className={styles.railState} aria-label={getStatusLabel(state)} />
                    ) : null}
                  </button>
                );
              })}
          </div>

          <div className={styles.railGroup}>
            <p className={styles.railLabel}>Konten</p>
            {sectionDefinitions
              .filter((section) => section.group === 'content')
              .map((section) => {
                const state = getSectionStatus(section.key, sectionStatuses, studioState.content);
                const active = utility === null && activeSection === section.key;
                return (
                  <button
                    aria-current={active ? 'page' : undefined}
                    className={styles.railItem}
                    data-active={active || undefined}
                    data-section-state={state}
                    key={section.key}
                    onClick={() => selectSection(section.key)}
                    title={`${section.label} · ${getStatusLabel(state)}`}
                    type="button"
                  >
                    <span className={styles.railIcon} aria-hidden="true">
                      {section.icon}
                    </span>
                    <span>{section.label}</span>
                    {state === 'error' || state === 'incomplete' ? (
                      <span className={styles.railState} aria-label={getStatusLabel(state)} />
                    ) : null}
                  </button>
                );
              })}
          </div>
        </nav>

        <main className={styles.editorColumn} data-invitation-editorial-editor>
          {utility === null ? (
            <div className={styles.editorContext}>
              <div>
                <p>{activeDefinition.description}</p>
              </div>
              <span>
                {getStatusLabel(
                  getSectionStatus(activeSection, sectionStatuses, studioState.content),
                )}
              </span>
            </div>
          ) : null}
          {renderEditor()}
        </main>

        <aside
          aria-label="Pratinjau undangan"
          className={styles.previewRail}
          data-invitation-editorial-preview
          ref={previewRef}
          tabIndex={-1}
        >
          {preview}
        </aside>
      </div>

      <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </section>
  );
}
