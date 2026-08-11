'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

import { InvitationEditorActivePanel } from './invitation-editor';
import {
  getInvitationEditorErrorSections,
  getInvitationEditorSectionStatuses,
  invitationEditorSections,
  type InvitationEditorSectionStatus,
} from './invitation-editor-workspace';
import dashboardStyles from './invitation-editor-dashboard.module.css';
import { useInvitationStudioState } from './invitation-studio-provider';
import type { InvitationStudioStatusTone } from './invitation-studio-shell';
import {
  getInvitationWorkspaceTaskFromUrl,
  isInvitationWorkspaceContentTask,
  invitationWorkspaceContentTasks,
  type InvitationWorkspaceContentTask,
  type InvitationWorkspaceTask,
} from './invitation-task-workspace.types';
import styles from './invitation-task-workspace.module.css';
import { InvitationTaskGlyph } from './owner-workspace-visuals';

type InvitationTaskWorkspaceProps = {
  coupleLabel: string;
  design: ReactNode;
  draft: InvitationDraft;
  initialTask: InvitationWorkspaceTask | null;
  media: ReactNode;
  preview: ReactNode;
  projectId: string;
  publish: ReactNode;
  readiness: Pick<WeddingReadinessV1, 'identity' | 'invitation'>;
  statusLabel: string;
  statusTone: InvitationStudioStatusTone;
};

type RailGroup = 'content' | 'display' | 'media';

type RailTaskDefinition = {
  description: string;
  group: RailGroup;
  key: Exclude<InvitationWorkspaceTask, 'preview' | 'publish'>;
  title: string;
};

type TaskCopy = {
  description: string;
  title: string;
};

const railTaskDefinitions: readonly RailTaskDefinition[] = [
  {
    description: 'Pilih template, palet, dan karakter visual undangan.',
    group: 'display',
    key: 'design',
    title: 'Tema',
  },
  {
    description: 'Nama, identitas, dan keluarga kedua mempelai.',
    group: 'content',
    key: 'couple',
    title: 'Pasangan',
  },
  {
    description: 'Judul, sapaan, dan pesan pertama untuk tamu.',
    group: 'content',
    key: 'opening',
    title: 'Pembuka',
  },
  {
    description: 'Akad, resepsi, lokasi, waktu, peta, dan petunjuk acara.',
    group: 'content',
    key: 'schedule',
    title: 'Acara & lokasi',
  },
  {
    description: 'Cerita singkat tentang perjalanan kalian.',
    group: 'content',
    key: 'story',
    title: 'Cerita',
  },
  {
    description: 'Informasi rekening atau e-wallet untuk hadiah.',
    group: 'content',
    key: 'gift',
    title: 'Amplop Digital',
  },
  {
    description: 'Teks konfirmasi kehadiran pada undangan personal.',
    group: 'content',
    key: 'rsvp',
    title: 'RSVP',
  },
  {
    description: 'Pesan terakhir dan tanda tangan penutup.',
    group: 'content',
    key: 'closing',
    title: 'Penutup',
  },
  {
    description: 'Atur cover, potret mempelai, Wedding Film, galeri, dan musik.',
    group: 'media',
    key: 'media',
    title: 'Foto & media',
  },
] as const;

const railGroupLabels: Record<RailGroup, string> = {
  content: 'Konten',
  display: 'Tampilan',
  media: 'Media',
};

const sectionTaskKeys = new Set<string>(invitationWorkspaceContentTasks);

function getTaskCopy(task: InvitationWorkspaceTask): TaskCopy {
  const railTask = railTaskDefinitions.find((candidate) => candidate.key === task);
  if (railTask) {
    return railTask;
  }

  if (task === 'preview') {
    return {
      description: 'Periksa draf, simulasi personal, dan versi yang sudah dilihat tamu.',
      title: 'Pratinjau',
    };
  }

  return {
    description: 'Periksa kesiapan lalu terbitkan atau terbitkan ulang undangan.',
    title: 'Terbitkan',
  };
}

function getTaskUrl(task: InvitationWorkspaceTask) {
  const url = new URL(window.location.href);
  url.searchParams.delete('mode');
  url.hash = '';
  url.searchParams.set('task', task);

  if (task !== 'preview') {
    url.searchParams.delete('surface');
    url.searchParams.delete('version');
    url.searchParams.delete('viewport');
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function getSectionStateLabel(status: InvitationEditorSectionStatus) {
  switch (status) {
    case 'complete':
      return 'Lengkap';
    case 'error':
      return 'Perlu diperbaiki';
    case 'incomplete':
      return 'Belum lengkap';
    case 'optional_off':
      return 'Tidak ditampilkan';
  }
}

function getRailTaskStatus(
  task: RailTaskDefinition['key'],
  sectionStatuses: ReturnType<typeof getInvitationEditorSectionStatuses>,
  hasMedia: boolean,
): InvitationEditorSectionStatus {
  if (isInvitationWorkspaceContentTask(task)) {
    return sectionStatuses[task];
  }

  if (task === 'design') {
    return sectionStatuses.style;
  }

  return hasMedia ? 'complete' : 'incomplete';
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
        <span className={styles.saveLabel}>{studioState.savePresentation.label}</span>
        <span className={styles.saveDescription}>{studioState.savePresentation.description}</span>
      </div>
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
    </div>
  );
}

function SingleTaskEditor({
  activeSection,
  onTaskChange,
  projectId,
}: {
  activeSection: InvitationWorkspaceContentTask;
  onTaskChange: (task: InvitationWorkspaceTask) => void;
  projectId: string;
}) {
  const {
    actionState,
    content,
    formAction,
    formId,
    submissionPayload,
    updateLocalContent,
  } = useInvitationStudioState();
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
    <form
      action={formAction}
      className={styles.singleTaskForm}
      data-invitation-single-task-form
      id={formId}
      noValidate
    >
      <input name="projectId" type="hidden" value={projectId} />
      <input name="editorPayload" type="hidden" value={submissionPayload} />

      {actionState.status === 'error' && actionState.message ? (
        <div className={styles.errorSummary} ref={errorSummaryRef} role="alert" tabIndex={-1}>
          <p>{actionState.message}</p>
          {errorSections.length > 0 ? (
            <div className={styles.errorActions}>
              {errorSections.map((sectionKey) => {
                const section = invitationEditorSections.find(
                  (candidate) => candidate.key === sectionKey,
                );

                return section && sectionTaskKeys.has(section.key) ? (
                  <button
                    key={section.key}
                    onClick={() => onTaskChange(section.key as InvitationWorkspaceTask)}
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

      <div className={styles.editorFooter}>
        <span>Perubahan tetap berada di draf pribadi sampai kalian menerbitkannya.</span>
      </div>
    </form>
  );
}

export function InvitationTaskWorkspace({
  coupleLabel,
  design,
  draft,
  initialTask,
  media,
  preview,
  projectId,
  publish,
  readiness,
  statusLabel,
  statusTone,
}: InvitationTaskWorkspaceProps) {
  const studioState = useInvitationStudioState();
  const initialResolvedTask = initialTask ?? 'design';
  const [activeTask, setActiveTask] = useState<InvitationWorkspaceTask>(initialResolvedTask);
  const [activeContentTask, setActiveContentTask] = useState<InvitationWorkspaceContentTask>(
    isInvitationWorkspaceContentTask(initialResolvedTask) ? initialResolvedTask : 'couple',
  );
  const [announcement, setAnnouncement] = useState('');
  const taskHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const sectionStatuses = useMemo(
    () =>
      getInvitationEditorSectionStatuses(
        { ...draft, content: studioState.content },
        studioState.actionState.fieldErrors,
      ),
    [draft, studioState.actionState.fieldErrors, studioState.content],
  );
  const premiumMedia = studioState.content.premiumMedia;
  const hasMedia = Boolean(
    studioState.content.gallery.imageIds.length > 0 ||
      studioState.content.audio.assetId ||
      premiumMedia.coverImageId ||
      premiumMedia.personOne.imageId ||
      premiumMedia.personTwo.imageId ||
      premiumMedia.storyImageId ||
      premiumMedia.weddingFilm.enabled,
  );
  const activeCopy = getTaskCopy(activeTask);
  const railGroups = ['display', 'content', 'media'] as const;
  const showUnpublishedBanner =
    readiness.invitation.state === 'published_with_unpublished_changes';

  useEffect(() => {
    const syncFromLocation = () => {
      const nextTask = getInvitationWorkspaceTaskFromUrl(new URL(window.location.href)) ?? 'design';
      setActiveTask(nextTask);
      if (isInvitationWorkspaceContentTask(nextTask)) setActiveContentTask(nextTask);
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      taskHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTask]);

  const activateTask = (task: InvitationWorkspaceTask) => {
    setActiveTask(task);
    if (isInvitationWorkspaceContentTask(task)) setActiveContentTask(task);
    setAnnouncement(`${getTaskCopy(task).title} dibuka.`);
    window.history.pushState(window.history.state, '', getTaskUrl(task));
  };

  return (
    <section
      className={dashboardStyles.workspace}
      data-invitation-editor-dashboard="v1"
      data-invitation-task-workspace
      data-invitation-task-workspace-active={activeTask}
      data-owner-workspace-radical-simplicity="v2"
    >
      <header className={dashboardStyles.pageHeader}>
        <div className={dashboardStyles.headerCopy}>
          <p className={dashboardStyles.eyebrow}>{coupleLabel}</p>
          <div className={dashboardStyles.titleRow}>
            <h1 className={dashboardStyles.pageTitle}>Undangan</h1>
            <span className={dashboardStyles.status} data-status-tone={statusTone}>
              <span aria-hidden="true" />
              {statusLabel}
            </span>
          </div>
          <p className={dashboardStyles.pageDescription}>
            Isi konten, pilih tema, dan kelola media. Semua perubahan tersimpan sebagai draf privat sampai
            kalian menerbitkannya.
          </p>
        </div>

        <div className={dashboardStyles.headerActions}>
          <button
            className={dashboardStyles.previewAction}
            onClick={() => activateTask('preview')}
            type="button"
          >
            Lihat hasil
          </button>
          <SaveAuthority />
          <button
            className={dashboardStyles.publishAction}
            onClick={() => activateTask('publish')}
            type="button"
          >
            Terbitkan
          </button>
        </div>
      </header>

      {showUnpublishedBanner ? (
        <div className={dashboardStyles.unpublishedBanner} role="status">
          <span aria-hidden="true" className={dashboardStyles.bannerDot} />
          <span>
            <strong>Ada perubahan yang belum diterbitkan.</strong> Tamu masih melihat versi terbit
            sebelumnya sampai kalian menerbitkan ulang.
          </span>
        </div>
      ) : null}

      <div className={dashboardStyles.editorShell}>
        <nav aria-label="Bagian editor undangan" className={dashboardStyles.rail}>
          {railGroups.map((group) => (
            <div className={dashboardStyles.railGroup} key={group}>
              <p className={dashboardStyles.railGroupLabel}>{railGroupLabels[group]}</p>
              {railTaskDefinitions
                .filter((task) => task.group === group)
                .map((task) => {
                  const taskStatus = getRailTaskStatus(task.key, sectionStatuses, hasMedia);
                  const active = activeTask === task.key;
                  const needsAttention = taskStatus === 'error' || taskStatus === 'incomplete';

                  return (
                    <button
                      aria-current={active ? 'page' : undefined}
                      className={dashboardStyles.railItem}
                      data-active={active || undefined}
                      data-task-status={taskStatus}
                      key={task.key}
                      onClick={() => activateTask(task.key)}
                      title={`${task.title} — ${getSectionStateLabel(taskStatus)}`}
                      type="button"
                    >
                      <InvitationTaskGlyph className={dashboardStyles.railGlyph} task={task.key} />
                      <span>{task.title}</span>
                      {needsAttention ? (
                        <span
                          aria-label={getSectionStateLabel(taskStatus)}
                          className={dashboardStyles.attentionDot}
                          role="img"
                        />
                      ) : null}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className={dashboardStyles.editorColumn}>
          {isInvitationWorkspaceContentTask(activeTask) ? (
            <header className={dashboardStyles.sectionHeader}>
              <p className={dashboardStyles.sectionEyebrow}>Bagian aktif</p>
              <h2 className={dashboardStyles.sectionTitle} ref={taskHeadingRef} tabIndex={-1}>
                {activeCopy.title}
              </h2>
              <p className={dashboardStyles.sectionDescription}>{activeCopy.description}</p>
            </header>
          ) : (
            <h2 className="sr-only" ref={taskHeadingRef} tabIndex={-1}>
              {activeCopy.title}
            </h2>
          )}

          <div className={dashboardStyles.editorSurface}>
            <section hidden={!isInvitationWorkspaceContentTask(activeTask)}>
              <SingleTaskEditor
                activeSection={activeContentTask}
                onTaskChange={activateTask}
                projectId={projectId}
              />
            </section>
            <section hidden={activeTask !== 'design'}>{design}</section>
            <section hidden={activeTask !== 'media'}>{media}</section>
            {activeTask === 'preview' ? <section>{preview}</section> : null}
            <section hidden={activeTask !== 'publish'}>{publish}</section>
          </div>
        </div>

        {activeTask !== 'preview' ? (
          <aside aria-label="Pratinjau undangan langsung" className={dashboardStyles.previewColumn}>
            <div className={dashboardStyles.previewHeader}>
              <div>
                <p>Pratinjau</p>
                <span>{studioState.isDirty ? 'Perubahan lokal' : 'Draf tersimpan'}</span>
              </div>
              <button onClick={() => activateTask('preview')} type="button">
                Perbesar
              </button>
            </div>
            <div className={dashboardStyles.previewBody}>{preview}</div>
          </aside>
        ) : null}
      </div>

      <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </section>
  );
}
