'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { CanonicalInvitationThumbnail } from '@/components/marketing/canonical-invitation-thumbnail';
import { featuredThemes } from '@/components/marketing/theme-catalog';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

import { InvitationEditorActivePanel } from './invitation-editor';
import {
  getInvitationEditorErrorSections,
  getInvitationEditorSectionStatuses,
  invitationEditorSections,
  type InvitationEditorSectionStatus,
} from './invitation-editor-workspace';
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

type TaskDefinition = {
  description: string;
  group: 'content' | 'experience' | 'release';
  key: InvitationWorkspaceTask;
  number: string;
  title: string;
};

type LauncherTaskState = 'attention' | 'complete' | 'neutral' | 'warning';

const taskDefinitions: readonly TaskDefinition[] = [
  {
    description: 'Nama, identitas, dan keluarga kedua mempelai.',
    group: 'content',
    key: 'couple',
    number: '01',
    title: 'Mempelai',
  },
  {
    description: 'Judul, sapaan, dan pesan pertama untuk tamu.',
    group: 'content',
    key: 'opening',
    number: '02',
    title: 'Sampul & pembuka',
  },
  {
    description: 'Akad, resepsi, lokasi, waktu, dan petunjuk acara.',
    group: 'content',
    key: 'schedule',
    number: '03',
    title: 'Acara',
  },
  {
    description: 'Cerita singkat tentang perjalanan kalian.',
    group: 'content',
    key: 'story',
    number: '04',
    title: 'Cerita',
  },
  {
    description: 'Foto galeri dan musik yang mengiringi undangan.',
    group: 'experience',
    key: 'media',
    number: '05',
    title: 'Galeri & musik',
  },
  {
    description: 'Informasi rekening atau e-wallet untuk hadiah.',
    group: 'content',
    key: 'gift',
    number: '06',
    title: 'Amplop Digital',
  },
  {
    description: 'Teks konfirmasi kehadiran pada undangan personal.',
    group: 'content',
    key: 'rsvp',
    number: '07',
    title: 'RSVP',
  },
  {
    description: 'Pesan terakhir dan tanda tangan penutup.',
    group: 'content',
    key: 'closing',
    number: '08',
    title: 'Penutup',
  },
  {
    description: 'Pilih template, palet, dan karakter visual undangan.',
    group: 'experience',
    key: 'design',
    number: '09',
    title: 'Tema & warna',
  },
  {
    description: 'Periksa tampilan undangan sebelum dibagikan.',
    group: 'release',
    key: 'preview',
    number: '10',
    title: 'Preview',
  },
  {
    description: 'Periksa kesiapan lalu terbitkan atau terbitkan ulang.',
    group: 'release',
    key: 'publish',
    number: '11',
    title: 'Terbitkan',
  },
] as const;

const groupCopy = {
  content: {
    description: 'Informasi yang dibaca tamu.',
    title: 'Isi undangan',
  },
  experience: {
    description: 'Tampilan, foto, dan suasana.',
    title: 'Tampilan & media',
  },
  release: {
    description: 'Periksa hasil lalu tayangkan.',
    title: 'Selesaikan',
  },
} as const;

const sectionTaskKeys = new Set<string>(invitationWorkspaceContentTasks);

function getTaskDefinition(task: InvitationWorkspaceTask) {
  return taskDefinitions.find((candidate) => candidate.key === task)!;
}

function getTaskUrl(task: InvitationWorkspaceTask | null) {
  const url = new URL(window.location.href);
  url.searchParams.delete('mode');
  url.hash = '';

  if (task) {
    url.searchParams.set('task', task);
  } else {
    url.searchParams.delete('task');
  }

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

function getLauncherTaskState(status: InvitationEditorSectionStatus): LauncherTaskState {
  switch (status) {
    case 'complete':
      return 'complete';
    case 'error':
      return 'warning';
    case 'incomplete':
      return 'attention';
    case 'optional_off':
      return 'neutral';
  }
}

function getPublishState(readiness: InvitationTaskWorkspaceProps['readiness']): {
  label: string;
  state: LauncherTaskState;
} {
  switch (readiness.invitation.state) {
    case 'published':
      return { label: 'Sudah terbit', state: 'complete' };
    case 'published_with_unpublished_changes':
      return { label: 'Terbitkan perubahan', state: 'warning' };
    case 'ready_to_publish':
      return { label: 'Siap diterbitkan', state: 'complete' };
    case 'draft_ready_unactivated':
      return { label: 'Menunggu aktivasi', state: 'attention' };
    case 'draft_incomplete':
      return { label: 'Belum siap', state: 'attention' };
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
  const [activeTask, setActiveTask] = useState<InvitationWorkspaceTask | null>(initialTask);
  const [activeContentTask, setActiveContentTask] = useState<InvitationWorkspaceContentTask>(
    isInvitationWorkspaceContentTask(initialTask) ? initialTask : 'couple',
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
  const publishState = getPublishState(readiness);
  const readyCount = Object.values(sectionStatuses).filter(
    (status) => status === 'complete' || status === 'optional_off',
  ).length;
  const attentionCount = Object.values(sectionStatuses).filter(
    (status) => status === 'error' || status === 'incomplete',
  ).length;
  const hasMedia =
    studioState.content.gallery.imageIds.length > 0 || Boolean(studioState.content.audio.assetId);
  const selectedTheme =
    featuredThemes.find((theme) => theme.key === studioState.content.templateKey) ??
    featuredThemes[0]!;
  const selectedPalette =
    selectedTheme.palettes.find((palette) => palette.key === studioState.content.paletteKey) ??
    selectedTheme.palettes[0]!;
  const recommendedTask =
    invitationWorkspaceContentTasks.find((task) => {
      const state = sectionStatuses[task];
      return state === 'error' || state === 'incomplete';
    }) ??
    (sectionStatuses.style === 'error' || sectionStatuses.style === 'incomplete'
      ? 'design'
      : !hasMedia
        ? 'media'
        : readiness.invitation.state === 'published'
          ? 'preview'
          : 'publish');
  const recommendedDefinition = getTaskDefinition(recommendedTask);

  useEffect(() => {
    const syncFromLocation = () => {
      const nextTask = getInvitationWorkspaceTaskFromUrl(new URL(window.location.href));
      setActiveTask(nextTask);
      if (isInvitationWorkspaceContentTask(nextTask)) setActiveContentTask(nextTask);
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  useEffect(() => {
    if (!activeTask) return;
    const frame = window.requestAnimationFrame(() => {
      taskHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTask]);

  const activateTask = (
    task: InvitationWorkspaceTask | null,
    historyMode: 'push' | 'replace' = 'push',
  ) => {
    setActiveTask(task);
    if (isInvitationWorkspaceContentTask(task)) setActiveContentTask(task);
    setAnnouncement(task ? `${getTaskDefinition(task).title} dibuka.` : 'Daftar pekerjaan dibuka.');

    const nextUrl = getTaskUrl(task);
    if (historyMode === 'replace') {
      window.history.replaceState(window.history.state, '', nextUrl);
    } else {
      window.history.pushState(window.history.state, '', nextUrl);
    }
  };

  const getTaskCardState = (task: InvitationWorkspaceTask) => {
    if (isInvitationWorkspaceContentTask(task)) {
      const status = sectionStatuses[task];
      return {
        label: getSectionStateLabel(status),
        state: getLauncherTaskState(status),
      };
    }

    if (task === 'design') {
      const status = sectionStatuses.style;
      return {
        label: getSectionStateLabel(status),
        state: getLauncherTaskState(status),
      };
    }

    if (task === 'media') {
      return {
        label: hasMedia ? 'Media siap' : 'Belum ada media',
        state: hasMedia ? ('complete' as const) : ('neutral' as const),
      };
    }

    if (task === 'preview') {
      return {
        label: readiness.invitation.hasPublishedSnapshot
          ? 'Versi terbit tersedia'
          : 'Siap diperiksa',
        state: readiness.invitation.hasPublishedSnapshot
          ? ('complete' as const)
          : ('neutral' as const),
      };
    }

    return publishState;
  };

  const getTaskSummary = (task: InvitationWorkspaceTask) => {
    const content = studioState.content;

    switch (task) {
      case 'couple':
        return `${content.couple.personOne.displayName || 'Mempelai pertama'} & ${
          content.couple.personTwo.displayName || 'mempelai kedua'
        }`;
      case 'opening':
        return content.hero.title || 'Judul utama belum diisi';
      case 'schedule':
        return `${content.eventSchedule.events.length} acara tersusun`;
      case 'story':
        return content.story.enabled ? 'Ditampilkan pada undangan' : 'Tidak ditampilkan';
      case 'media': {
        const photoCount = content.gallery.imageIds.length;
        const audioLabel = content.audio.assetId ? 'musik siap' : 'tanpa musik';
        return `${photoCount} foto · ${audioLabel}`;
      }
      case 'gift':
        return content.digitalGift.enabled
          ? `${content.digitalGift.accounts.length} rekening atau e-wallet`
          : 'Tidak ditampilkan';
      case 'rsvp':
        return content.rsvp.enabled ? 'Aktif pada undangan personal' : 'Tidak ditampilkan';
      case 'closing':
        return content.closing.enabled ? 'Ditampilkan di akhir undangan' : 'Tidak ditampilkan';
      case 'design':
        return `${selectedTheme.name} · ${selectedPalette.name}`;
      case 'preview':
        return 'Periksa tampilan untuk tamu';
      case 'publish':
        return statusLabel;
    }
  };

  const activeDefinition = activeTask ? getTaskDefinition(activeTask) : null;
  const groups = ['content', 'experience', 'release'] as const;

  return (
    <section
      className={styles.workspace}
      data-invitation-task-workspace
      data-invitation-task-workspace-active={activeTask ?? 'launcher'}
      data-owner-workspace-radical-simplicity="v2"
    >
      <header className={styles.commandHeader}>
        <div className={styles.commandIdentity}>
          {activeTask ? (
            <button className={styles.backButton} onClick={() => activateTask(null)} type="button">
              <span aria-hidden="true">←</span>
              Semua bagian
            </button>
          ) : (
            <p className={styles.eyebrow}>Undangan</p>
          )}
          <h1 className={styles.title} ref={taskHeadingRef} tabIndex={activeTask ? -1 : undefined}>
            {activeDefinition?.title ?? coupleLabel}
          </h1>
          <p className={styles.description}>
            {activeDefinition?.description ?? 'Pilih satu bagian untuk dikerjakan sekarang.'}
          </p>
        </div>

        <div className={styles.commandActions}>
          <span className={styles.status} data-status-tone={statusTone}>
            <span aria-hidden="true" />
            {statusLabel}
          </span>
          {activeTask !== 'preview' ? (
            <button
              className={styles.previewButton}
              onClick={() => activateTask('preview')}
              type="button"
            >
              Preview
            </button>
          ) : null}
          <SaveAuthority />
        </div>
      </header>

      <section className={styles.launcher} hidden={activeTask !== null}>
        <div className={styles.launcherHero}>
          <div className={styles.thumbnailPanel}>
            <CanonicalInvitationThumbnail
              className={styles.thumbnail}
              paletteCanvas={selectedPalette.canvas}
              paletteKey={selectedPalette.key}
              paletteName={selectedPalette.name}
              priority
              templateKey={selectedTheme.key}
              variant="showcase"
            />
            <div className={styles.thumbnailCaption}>
              <strong>{selectedTheme.name}</strong>
              <span>{selectedPalette.name}</span>
            </div>
          </div>

          <div className={styles.startPanel}>
            <p className={styles.summaryEyebrow}>Lanjutkan di sini</p>
            <span className={styles.recommendedIcon}>
              <InvitationTaskGlyph className={styles.recommendedGlyph} task={recommendedTask} />
            </span>
            <h2>{recommendedDefinition.title}</h2>
            <p>{recommendedDefinition.description}</p>
            <button
              className={styles.startButton}
              data-recommended-task={recommendedTask}
              onClick={() => activateTask(recommendedTask)}
              type="button"
            >
              Buka {recommendedDefinition.title}
              <span aria-hidden="true">→</span>
            </button>
            <div className={styles.progressBlock}>
              <div className={styles.progressCopy}>
                <span>{readyCount}/9 bagian siap</span>
                <span>{attentionCount > 0 ? `${attentionCount} perlu perhatian` : 'Isi utama lengkap'}</span>
              </div>
              <span className={styles.progressTrack} aria-hidden="true">
                <span style={{ width: `${Math.min(100, Math.round((readyCount / 9) * 100))}%` }} />
              </span>
            </div>
          </div>
        </div>

        {groups.map((group) => (
          <section className={styles.taskGroup} key={group}>
            <div className={styles.groupHeading}>
              <h2>{groupCopy[group].title}</h2>
              <p>{groupCopy[group].description}</p>
            </div>
            <div className={styles.taskGrid}>
              {taskDefinitions
                .filter((task) => task.group === group)
                .map((task) => {
                  const taskState = getTaskCardState(task.key);

                  return (
                    <button
                      className={styles.taskCard}
                      data-task-state={taskState.state}
                      data-workspace-task={task.key}
                      key={task.key}
                      onClick={() => activateTask(task.key)}
                      type="button"
                    >
                      <span className={styles.taskIcon} data-task={task.key}>
                        <InvitationTaskGlyph className={styles.taskGlyph} task={task.key} />
                      </span>
                      <span className={styles.taskBody}>
                        <span className={styles.taskTitle}>{task.title}</span>
                        <span className={styles.taskSummary}>{getTaskSummary(task.key)}</span>
                      </span>
                      <span className={styles.taskState}>{taskState.label}</span>
                      <span className={styles.taskArrow} aria-hidden="true">
                        →
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </section>

      <div className={styles.taskCanvas} hidden={activeTask === null}>
        <section hidden={!activeTask || !isInvitationWorkspaceContentTask(activeTask)}>
          <SingleTaskEditor
            activeSection={activeContentTask}
            onTaskChange={(task) => activateTask(task)}
            projectId={projectId}
          />
        </section>
        <section hidden={activeTask !== 'design'}>{design}</section>
        <section hidden={activeTask !== 'media'}>{media}</section>
        <section hidden={activeTask !== 'preview'}>{preview}</section>
        <section hidden={activeTask !== 'publish'}>{publish}</section>
      </div>

      <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </section>
  );
}
