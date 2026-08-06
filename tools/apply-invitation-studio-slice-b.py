from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


write("vercel.json", '{\n  "$schema": "https://openapi.vercel.sh/vercel.json",\n  "git": {\n    "deploymentEnabled": {\n      "feature/invitation-studio-slice-b-unified-state-command-authority": false\n    }\n  }\n}\n')
write("src/components/projects/invitation-studio-provider.tsx", """'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useToast } from '@/design-system';
import {
  initialInvitationEditorActionState,
  type InvitationEditorActionState,
} from '@/modules/invitations/invitation-editor.action-state';
import { saveInvitationEditorAction } from '@/modules/invitations/invitation-editor.actions';
import {
  createInvitationEditorSubmissionPayload,
  invitationEditorLocalContentReducer,
  type InvitationEditorLocalAction,
} from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

export type InvitationStudioSaveAction = (
  previousState: InvitationEditorActionState,
  formData: FormData,
) => Promise<InvitationEditorActionState>;

export type InvitationStudioSaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export type InvitationStudioSaveTone = 'error' | 'neutral' | 'success' | 'warning';

export type InvitationStudioSavePresentation = {
  actionLabel: string;
  description: string;
  label: string;
  state: InvitationStudioSaveState;
  tone: InvitationStudioSaveTone;
};

export type InvitationStudioSavePresentationInput = {
  actionStatus: InvitationEditorActionState['status'];
  hasSaved: boolean;
  isDirty: boolean;
  isPending: boolean;
};

export const invitationStudioDirtyNavigationMessage =
  'Perubahan undangan belum disimpan. Yakin ingin meninggalkan halaman ini?';

export function getInvitationStudioSavePresentation({
  actionStatus,
  hasSaved,
  isDirty,
  isPending,
}: InvitationStudioSavePresentationInput): InvitationStudioSavePresentation {
  if (isPending) {
    return {
      actionLabel: 'Menyimpan…',
      description: 'Perubahan sedang disimpan ke draf pribadi.',
      label: 'Menyimpan perubahan…',
      state: 'saving',
      tone: 'neutral',
    };
  }

  if (actionStatus === 'error') {
    return {
      actionLabel: 'Coba simpan lagi',
      description: 'Perubahan lokal tetap aman. Periksa bagian yang bermasalah lalu coba lagi.',
      label: 'Gagal menyimpan',
      state: 'error',
      tone: 'error',
    };
  }

  if (isDirty) {
    return {
      actionLabel: 'Simpan perubahan',
      description: 'Perubahan baru masih berada di browser ini.',
      label: 'Belum tersimpan',
      state: 'dirty',
      tone: 'warning',
    };
  }

  if (hasSaved || actionStatus === 'success') {
    return {
      actionLabel: 'Simpan perubahan',
      description: 'Draf pribadi sudah memuat perubahan terbaru.',
      label: 'Semua perubahan tersimpan',
      state: 'saved',
      tone: 'success',
    };
  }

  return {
    actionLabel: 'Simpan perubahan',
    description: 'Belum ada perubahan lokal yang berbeda dari draf pribadi.',
    label: 'Belum ada perubahan',
    state: 'clean',
    tone: 'neutral',
  };
}

export function shouldConfirmInvitationStudioNavigation(currentHref: string, nextHref: string) {
  const currentUrl = new URL(currentHref);
  const nextUrl = new URL(nextHref, currentUrl);
  const isSameDocumentHash =
    nextUrl.pathname === currentUrl.pathname &&
    nextUrl.search === currentUrl.search &&
    nextUrl.hash.length > 0;

  return !isSameDocumentHash;
}

type InvitationStudioContextValue = {
  actionState: InvitationEditorActionState;
  canSave: boolean;
  content: InvitationDraft['content'];
  formAction: (payload: FormData) => void;
  formId: string;
  hasSaved: boolean;
  isDirty: boolean;
  isPending: boolean;
  savePresentation: InvitationStudioSavePresentation;
  submissionPayload: string;
  updateLocalContent: (action: InvitationEditorLocalAction) => void;
};

const InvitationStudioContext = createContext<InvitationStudioContextValue | null>(null);

export type InvitationStudioProviderProps = {
  children: ReactNode;
  initialDraft: InvitationDraft;
  projectId: string;
  refreshOnSuccess?: boolean;
  saveAction?: InvitationStudioSaveAction;
};

export function InvitationStudioProvider({
  children,
  initialDraft,
  projectId,
  refreshOnSuccess = true,
  saveAction = saveInvitationEditorAction,
}: InvitationStudioProviderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, dispatchLocalContent] = useReducer(
    invitationEditorLocalContentReducer,
    initialDraft.content,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const lastSyncedDraftUpdatedAt = useRef(initialDraft.updated_at);

  const saveWithLifecycle = useCallback(
    async (previousState: InvitationEditorActionState, formData: FormData) => {
      const result = await saveAction(previousState, formData);

      if (result.status === 'success') {
        setHasSaved(true);
        setIsDirty(false);
        toast({
          description: 'Draf terbaru siap dibuka di preview tersimpan.',
          title: 'Tersimpan',
          variant: 'success',
        });

        if (refreshOnSuccess) {
          router.refresh();
        }
      }

      return result;
    },
    [refreshOnSuccess, router, saveAction, toast],
  );

  const [actionState, formAction, isPending] = useActionState(
    saveWithLifecycle,
    initialInvitationEditorActionState,
  );

  const updateLocalContent = useCallback((action: InvitationEditorLocalAction) => {
    dispatchLocalContent(action);
    setIsDirty(true);
  }, []);

  const submissionPayload = useMemo(
    () => JSON.stringify(createInvitationEditorSubmissionPayload(content)),
    [content],
  );
  const savePresentation = useMemo(
    () =>
      getInvitationStudioSavePresentation({
        actionStatus: actionState.status,
        hasSaved,
        isDirty,
        isPending,
      }),
    [actionState.status, hasSaved, isDirty, isPending],
  );
  const canSave = isDirty || actionState.status === 'error';
  const formId = `invitation-studio-save-${projectId}`;

  useEffect(() => {
    if (initialDraft.updated_at === lastSyncedDraftUpdatedAt.current || isDirty) {
      return;
    }

    lastSyncedDraftUpdatedAt.current = initialDraft.updated_at;
    dispatchLocalContent({ content: initialDraft.content, type: 'replace' });
  }, [initialDraft.content, initialDraft.updated_at, isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const message = invitationStudioDirtyNavigationMessage;
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
        !shouldConfirmInvitationStudioNavigation(window.location.href, anchor.href) ||
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

  const value = useMemo<InvitationStudioContextValue>(
    () => ({
      actionState,
      canSave,
      content,
      formAction,
      formId,
      hasSaved,
      isDirty,
      isPending,
      savePresentation,
      submissionPayload,
      updateLocalContent,
    }),
    [
      actionState,
      canSave,
      content,
      formAction,
      formId,
      hasSaved,
      isDirty,
      isPending,
      savePresentation,
      submissionPayload,
      updateLocalContent,
    ],
  );

  return (
    <InvitationStudioContext.Provider value={value}>{children}</InvitationStudioContext.Provider>
  );
}

export function useInvitationStudioState() {
  const context = useContext(InvitationStudioContext);

  if (!context) {
    throw new Error('useInvitationStudioState harus digunakan di dalam InvitationStudioProvider.');
  }

  return context;
}

export function useOptionalInvitationStudioState() {
  return useContext(InvitationStudioContext);
}
""")
write("src/components/projects/invitation-studio-shell.tsx", """'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { InvitationStudioModePlaceholder } from './invitation-studio-mode-placeholder';
import { useOptionalInvitationStudioState } from './invitation-studio-provider';
import {
  getInvitationStudioModeLabel,
  invitationStudioModes,
  parseInvitationStudioMode,
  type InvitationStudioMode,
} from './invitation-studio.types';
import styles from './invitation-studio-shell.module.css';

export type InvitationStudioStatusTone = 'brand' | 'neutral' | 'success' | 'warning';

export interface InvitationStudioShellProps {
  children?: ReactNode;
  content?: ReactNode;
  coupleLabel?: string;
  design?: ReactNode;
  initialMode?: InvitationStudioMode;
  media?: ReactNode;
  preview?: ReactNode;
  previewHref?: Route;
  publish?: ReactNode;
  statusLabel?: string;
  statusTone?: InvitationStudioStatusTone;
}

type HistoryMode = 'push' | 'replace';

function getModeUrl(mode: InvitationStudioMode) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', mode);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Structural owner for the invitation workspace.
 *
 * Named mode slots stay mounted so local draft state survives mode changes.
 * Slice B adds one optional save authority supplied by InvitationStudioProvider.
 */
export function InvitationStudioShell({
  children,
  content,
  coupleLabel = 'Undangan kalian',
  design,
  initialMode = 'content',
  media,
  preview,
  previewHref,
  publish,
  statusLabel = 'Draf pribadi',
  statusTone = 'neutral',
}: InvitationStudioShellProps) {
  const studioState = useOptionalInvitationStudioState();
  const [activeMode, setActiveMode] = useState<InvitationStudioMode>(initialMode);
  const [announcement, setAnnouncement] = useState('');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const handlePopState = () => {
      const mode = parseInvitationStudioMode(
        new URL(window.location.href).searchParams.get('mode'),
      );
      setActiveMode(mode);
      setAnnouncement(`Mode ${getInvitationStudioModeLabel(mode)} dibuka.`);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const activateMode = (mode: InvitationStudioMode, historyMode: HistoryMode) => {
    setActiveMode(mode);
    setAnnouncement(`Mode ${getInvitationStudioModeLabel(mode)} dibuka.`);

    const nextUrl = getModeUrl(mode);
    if (historyMode === 'replace') {
      window.history.replaceState(window.history.state, '', nextUrl);
    } else {
      window.history.pushState(window.history.state, '', nextUrl);
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % invitationStudioModes.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + invitationStudioModes.length) % invitationStudioModes.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = invitationStudioModes.length - 1;
    }

    if (nextIndex === null) return;

    const nextMode = invitationStudioModes[nextIndex];
    if (!nextMode) return;

    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    activateMode(nextMode.key, 'replace');
  };

  const contentNode = content ?? children ?? (
    <InvitationStudioModePlaceholder
      description="Belum ada editor yang tersedia untuk undangan ini."
      eyebrow="Isi undangan"
      title="Mulai susun undangan kalian."
    />
  );
  const designNode = design ?? (
    <InvitationStudioModePlaceholder
      description="Template dan palet tetap dapat diubah dari editor Isi selama kontrol desain dipindahkan ke ruang ini pada tahap berikutnya."
      eyebrow="Fondasi mode Desain"
      title="Ruang desain sudah memiliki tempat yang jelas."
    />
  );
  const mediaNode = media ?? (
    <InvitationStudioModePlaceholder
      description="Galeri dan audio tetap aman pada alur lama sampai keduanya dipindahkan ke workspace media khusus."
      eyebrow="Fondasi mode Media"
      title="Foto dan audio akan dikelola tanpa bercampur dengan form teks."
    />
  );
  const previewNode = preview ?? (
    <InvitationStudioModePlaceholder
      action={
        previewHref ? (
          <Link className={styles.placeholderAction} href={previewHref}>
            Buka preview tersimpan
          </Link>
        ) : undefined
      }
      description="Preview khusus akan menyatukan tampilan umum, simulasi personal, serta perangkat mobile dan desktop."
      eyebrow="Fondasi mode Preview"
      title="Periksa hasil tanpa gangguan form editor."
    />
  );
  const publishNode = publish ?? (
    <InvitationStudioModePlaceholder
      description="Kesiapan, pembayaran, status versi, dan kontrol terbit tetap menggunakan authority lama sampai mode ini diaktifkan penuh."
      eyebrow="Fondasi mode Terbitkan"
      title="Keputusan publikasi akan mempunyai ruang tersendiri."
    />
  );

  const panels: ReadonlyArray<{ mode: InvitationStudioMode; node: ReactNode }> = [
    { mode: 'content', node: contentNode },
    { mode: 'design', node: designNode },
    { mode: 'media', node: mediaNode },
    { mode: 'preview', node: previewNode },
    { mode: 'publish', node: publishNode },
  ];

  return (
    <section
      aria-labelledby="invitation-studio-title"
      className={styles.studio}
      data-invitation-studio
      data-invitation-studio-active-mode={activeMode}
      data-invitation-studio-slice="unified-state-command-b"
    >
      <header className={styles.header} data-invitation-studio-header>
        <div className={styles.headerIdentity}>
          <p className={styles.eyebrow}>Studio undangan</p>
          <h1 className={styles.title} id="invitation-studio-title">
            {coupleLabel}
          </h1>
          <p className={styles.modeContext}>Mode {getInvitationStudioModeLabel(activeMode)}</p>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.status} data-invitation-studio-status-tone={statusTone}>
            <span aria-hidden="true" className={styles.statusDot} />
            {statusLabel}
          </span>

          {studioState ? (
            <div className={styles.saveAuthority} data-invitation-studio-save-authority>
              <div
                aria-atomic="true"
                aria-live="polite"
                className={styles.saveCopy}
                data-invitation-studio-save-state={studioState.savePresentation.state}
                id="invitation-studio-save-description"
                role="status"
              >
                <span
                  className={styles.saveLabel}
                  data-invitation-studio-save-tone={studioState.savePresentation.tone}
                >
                  <span aria-hidden="true" className={styles.saveDot} />
                  {studioState.savePresentation.label}
                </span>
                <span className={styles.saveDescription}>
                  {studioState.savePresentation.description}
                </span>
              </div>
              <button
                aria-describedby="invitation-studio-save-description"
                className={styles.saveButton}
                data-invitation-studio-save-action
                disabled={!studioState.canSave || studioState.isPending}
                form={studioState.formId}
                type="submit"
              >
                {studioState.savePresentation.actionLabel}
              </button>
            </div>
          ) : null}

          {previewHref ? (
            <Link className={styles.previewLink} href={previewHref}>
              Preview tersimpan
            </Link>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Mode Studio Undangan"
        className={styles.modeNavigation}
        data-invitation-studio-mode-navigation
      >
        <div className={styles.tabList} role="tablist">
          {invitationStudioModes.map((mode, index) => {
            const selected = mode.key === activeMode;

            return (
              <button
                aria-controls={`invitation-studio-panel-${mode.key}`}
                aria-selected={selected}
                className={styles.tab}
                data-invitation-studio-mode={mode.key}
                id={`invitation-studio-tab-${mode.key}`}
                key={mode.key}
                onClick={() => activateMode(mode.key, 'push')}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                <span className={styles.tabLabel}>{mode.label}</span>
                <span className={styles.tabDescription}>{mode.description}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className={styles.canvas} data-invitation-studio-canvas>
        {panels.map(({ mode, node }) => (
          <section
            aria-labelledby={`invitation-studio-tab-${mode}`}
            className={styles.panel}
            data-invitation-studio-panel={mode}
            hidden={mode !== activeMode}
            id={`invitation-studio-panel-${mode}`}
            key={mode}
            role="tabpanel"
          >
            {node}
          </section>
        ))}
      </div>

      <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </section>
  );
}
""")
write("src/components/projects/invitation-studio-shell.module.css", """.studio {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  border: 1px solid var(--seraya-border-default);
  border-radius: var(--seraya-radius-lg);
  background: var(--seraya-surface);
  box-shadow: var(--seraya-shadow-soft);
}

.header {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: clamp(1rem, 2vw, 1.5rem);
  border-bottom: 1px solid var(--seraya-border-default);
  background: color-mix(in srgb, var(--seraya-surface) 92%, var(--seraya-brand-soft));
  border-radius: var(--seraya-radius-lg) var(--seraya-radius-lg) 0 0;
}

.headerIdentity {
  min-width: 0;
}

.eyebrow {
  margin: 0;
  color: var(--seraya-text-muted);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.title {
  margin: 0.4rem 0 0;
  color: var(--seraya-text-primary);
  font-family: var(--font-editorial);
  font-size: clamp(1.8rem, 4vw, 2.7rem);
  font-weight: 500;
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.modeContext {
  margin: 0.55rem 0 0;
  color: var(--seraya-text-secondary);
  font-size: 0.8125rem;
  line-height: 1.25rem;
}

.headerActions {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
}

.status {
  min-height: 2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--seraya-border-default);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  color: var(--seraya-text-secondary);
  background: var(--seraya-canvas);
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1rem;
}

.statusDot,
.saveDot {
  width: 0.45rem;
  height: 0.45rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--seraya-text-muted);
}

.status[data-invitation-studio-status-tone='brand'] .statusDot {
  background: var(--seraya-action-primary);
}

.status[data-invitation-studio-status-tone='success'] .statusDot {
  background: var(--seraya-status-success);
}

.status[data-invitation-studio-status-tone='warning'] .statusDot {
  background: var(--seraya-status-warning, var(--seraya-action-primary));
}

.saveAuthority {
  min-width: min(100%, 20rem);
  display: flex;
  flex: 1 1 20rem;
  align-items: center;
  justify-content: flex-end;
  gap: 0.625rem;
}

.saveCopy {
  min-width: 0;
  display: grid;
  justify-items: end;
  gap: 0.15rem;
  text-align: right;
}

.saveLabel {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--seraya-text-primary);
  font-size: 0.8125rem;
  font-weight: 750;
  line-height: 1.1rem;
}

.saveLabel[data-invitation-studio-save-tone='success'] .saveDot {
  background: var(--seraya-status-success);
}

.saveLabel[data-invitation-studio-save-tone='warning'] .saveDot {
  background: var(--seraya-status-warning, var(--seraya-action-primary));
}

.saveLabel[data-invitation-studio-save-tone='error'] {
  color: var(--seraya-status-error);
}

.saveLabel[data-invitation-studio-save-tone='error'] .saveDot {
  background: var(--seraya-status-error);
}

.saveDescription {
  max-width: 22rem;
  color: var(--seraya-text-muted);
  font-size: 0.6875rem;
  line-height: 1rem;
}

.saveButton {
  min-height: 2.75rem;
  flex: 0 0 auto;
  border: 1px solid var(--seraya-action-primary);
  border-radius: var(--seraya-radius-sm);
  padding: 0.55rem 1rem;
  color: var(--seraya-text-inverse);
  background: var(--seraya-action-primary);
  font-size: 0.8125rem;
  font-weight: 750;
  cursor: pointer;
  transition:
    border-color var(--seraya-motion-default) var(--seraya-ease-standard),
    background-color var(--seraya-motion-default) var(--seraya-ease-standard),
    opacity var(--seraya-motion-default) var(--seraya-ease-standard);
}

.saveButton:hover:not(:disabled) {
  border-color: var(--seraya-action-primary-hover);
  background: var(--seraya-action-primary-hover);
}

.saveButton:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.previewLink,
.placeholderAction {
  min-height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--seraya-border-default);
  border-radius: var(--seraya-radius-sm);
  padding: 0.5rem 0.875rem;
  color: var(--seraya-action-primary);
  background: var(--seraya-surface);
  font-size: 0.8125rem;
  font-weight: 700;
  text-decoration: none;
  transition:
    border-color var(--seraya-motion-default) var(--seraya-ease-standard),
    background-color var(--seraya-motion-default) var(--seraya-ease-standard);
}

.previewLink:hover,
.placeholderAction:hover {
  border-color: var(--seraya-action-primary);
  background: var(--seraya-brand-soft);
}

.previewLink:focus-visible,
.placeholderAction:focus-visible,
.saveButton:focus-visible,
.tab:focus-visible {
  outline: 3px solid var(--seraya-focus-ring);
  outline-offset: 2px;
}

.modeNavigation {
  min-width: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--seraya-border-default);
  background: var(--seraya-canvas);
  scrollbar-width: thin;
}

.tabList {
  width: max-content;
  min-width: 100%;
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
  padding: 0.5rem;
}

.tab {
  position: relative;
  min-width: 7.25rem;
  min-height: 3.75rem;
  display: grid;
  align-content: center;
  gap: 0.2rem;
  border: 0;
  border-radius: var(--seraya-radius-sm);
  padding: 0.65rem 0.9rem;
  color: var(--seraya-text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    color var(--seraya-motion-default) var(--seraya-ease-standard),
    background-color var(--seraya-motion-default) var(--seraya-ease-standard);
}

.tab:hover {
  color: var(--seraya-text-primary);
  background: var(--seraya-surface);
}

.tab[aria-selected='true'] {
  color: var(--seraya-action-primary);
  background: var(--seraya-brand-soft);
}

.tab[aria-selected='true']::after {
  position: absolute;
  right: 0.75rem;
  bottom: 0.25rem;
  left: 0.75rem;
  height: 2px;
  border-radius: 999px;
  background: var(--seraya-action-primary);
  content: '';
}

.tabLabel {
  font-size: 0.875rem;
  font-weight: 750;
  line-height: 1.2rem;
}

.tabDescription {
  max-width: 13rem;
  color: var(--seraya-text-muted);
  font-size: 0.6875rem;
  line-height: 1rem;
}

.canvas {
  width: 100%;
  min-width: 0;
  padding: clamp(0.75rem, 2vw, 1.5rem);
  background: var(--seraya-canvas);
  border-radius: 0 0 var(--seraya-radius-lg) var(--seraya-radius-lg);
  overflow-x: clip;
}

.panel {
  width: 100%;
  min-width: 0;
}

.panel[hidden] {
  display: none;
}

@media (min-width: 48rem) {
  .header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .headerActions {
    flex: 1 1 40rem;
    justify-content: flex-end;
  }

  .tabList {
    width: 100%;
  }

  .tab {
    flex: 1 1 0;
    min-width: 0;
  }
}

@media (max-width: 63.999rem) {
  .saveAuthority {
    order: 3;
    flex-basis: 100%;
    justify-content: space-between;
    border-top: 1px solid var(--seraya-border-default);
    padding-top: 0.75rem;
  }

  .saveCopy {
    justify-items: start;
    text-align: left;
  }
}

@media (max-width: 47.999rem) {
  .studio {
    border-right: 0;
    border-left: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .header {
    border-radius: 0;
  }

  .headerActions,
  .saveAuthority {
    width: 100%;
  }

  .saveAuthority {
    align-items: stretch;
    flex-direction: column;
  }

  .saveButton,
  .previewLink {
    width: 100%;
  }

  .canvas {
    border-radius: 0;
  }

  .tabDescription {
    display: none;
  }

  .tab {
    min-width: 6rem;
    min-height: 3rem;
    text-align: center;
  }
}
""")
write("tests/unit/invitation-studio-unified-state-slice-b.test.ts", """import { describe, expect, it } from 'vitest';

import {
  getInvitationStudioSavePresentation,
  shouldConfirmInvitationStudioNavigation,
} from '../../src/components/projects/invitation-studio-provider';

describe('Invitation Studio Slice B save authority', () => {
  it('projects one truthful save state for each lifecycle phase', () => {
    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'idle',
        hasSaved: false,
        isDirty: false,
        isPending: false,
      }),
    ).toMatchObject({ label: 'Belum ada perubahan', state: 'clean', tone: 'neutral' });

    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'idle',
        hasSaved: false,
        isDirty: true,
        isPending: false,
      }),
    ).toMatchObject({ label: 'Belum tersimpan', state: 'dirty', tone: 'warning' });

    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'idle',
        hasSaved: false,
        isDirty: true,
        isPending: true,
      }),
    ).toMatchObject({ label: 'Menyimpan perubahan…', state: 'saving' });

    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'error',
        hasSaved: false,
        isDirty: true,
        isPending: false,
      }),
    ).toMatchObject({
      actionLabel: 'Coba simpan lagi',
      label: 'Gagal menyimpan',
      state: 'error',
      tone: 'error',
    });

    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'success',
        hasSaved: true,
        isDirty: false,
        isPending: false,
      }),
    ).toMatchObject({
      label: 'Semua perubahan tersimpan',
      state: 'saved',
      tone: 'success',
    });
  });

  it('only suppresses confirmation for a same-document hash handoff', () => {
    const current = 'https://seraya.test/dashboard/project/invitation?mode=content';

    expect(
      shouldConfirmInvitationStudioNavigation(
        current,
        '/dashboard/project/invitation?mode=content#bagian-acara',
      ),
    ).toBe(false);
    expect(
      shouldConfirmInvitationStudioNavigation(
        current,
        '/dashboard/project/invitation?mode=design',
      ),
    ).toBe(true);
    expect(shouldConfirmInvitationStudioNavigation(current, '/dashboard/project/guests')).toBe(true);
  });
});
""")
write("tests/e2e/invitation-studio-unified-state-slice-b.spec.ts", """import { expect, test } from '@playwright/test';

test.describe('Invitation Studio Slice B unified state and command authority', () => {
  test('retains one dirty draft across every mode and saves from one header action', async ({
    page,
  }) => {
    await page.goto('/invitation-studio-slice-b');

    const input = page.locator('[data-slice-b-title-input]');
    const saveAction = page.locator('[data-invitation-studio-save-action]');
    const saveState = page.locator('[data-invitation-studio-save-state]');

    await expect(saveAction).toHaveCount(1);
    await expect(saveAction).toBeDisabled();
    await input.fill('Undangan Nadia & Raka — Draft Baru');

    await expect(saveState).toHaveAttribute('data-invitation-studio-save-state', 'dirty');
    await expect(saveAction).toBeEnabled();

    for (const mode of ['Desain', 'Media', 'Preview', 'Terbitkan', 'Isi']) {
      await page.getByRole('tab', { name: new RegExp(`^${mode}`) }).click();
    }

    await expect(input).toHaveValue('Undangan Nadia & Raka — Draft Baru');
    await expect(saveAction).toHaveCount(1);

    await saveAction.click();

    await expect(saveState).toHaveAttribute('data-invitation-studio-save-state', 'saved');
    await expect(page.getByText('Semua perubahan tersimpan')).toBeVisible();
    await expect(saveAction).toBeDisabled();
    await expect(page.getByText('Tersimpan', { exact: true })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('keeps local input after a failed save and exposes the same retry authority', async ({
    page,
  }) => {
    await page.goto('/invitation-studio-slice-b');

    const input = page.locator('[data-slice-b-title-input]');
    const saveAction = page.locator('[data-invitation-studio-save-action]');
    const saveState = page.locator('[data-invitation-studio-save-state]');

    await input.fill('Gagal disimpan tetapi tetap aman');
    await saveAction.click();

    await expect(saveState).toHaveAttribute('data-invitation-studio-save-state', 'error');
    await expect(saveAction).toHaveText('Coba simpan lagi');
    await expect(input).toHaveValue('Gagal disimpan tetapi tetap aman');
    await expect(page.getByRole('alert')).toContainText('Perubahan lokal tetap aman');
    await expect(saveAction).toHaveCount(1);
  });

  test('guards a dirty draft when the owner leaves the studio', async ({ page }) => {
    await page.goto('/invitation-studio-slice-b');
    await page.locator('[data-slice-b-title-input]').fill('Perubahan belum tersimpan');

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Perubahan undangan belum disimpan');
      await dialog.dismiss();
    });

    await page.locator('[data-slice-b-leave-link]').click();
    await expect(page).toHaveURL(/invitation-studio-slice-b/);
    await expect(page.locator('[data-slice-b-title-input]')).toHaveValue(
      'Perubahan belum tersimpan',
    );
  });

  test('opens a direct mode query while preserving the shared provider', async ({ page }) => {
    await page.goto('/invitation-studio-slice-b?mode=preview');

    await expect(page.locator('[data-invitation-studio]')).toHaveAttribute(
      'data-invitation-studio-active-mode',
      'preview',
    );
    await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);
  });
});
""")
write("tests/e2e/fixture-app/app/invitation-studio-slice-b/fixture-client.tsx", """'use client';

import type { Route } from 'next';
import Link from 'next/link';

import { ToastProvider } from '../../../../../src/design-system';
import { InvitationStudioModePlaceholder } from '../../../../../src/components/projects/invitation-studio-mode-placeholder';
import {
  InvitationStudioProvider,
  useInvitationStudioState,
  type InvitationStudioSaveAction,
} from '../../../../../src/components/projects/invitation-studio-provider';
import { InvitationStudioShell } from '../../../../../src/components/projects/invitation-studio-shell';
import type { InvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';

const fixtureSaveAction: InvitationStudioSaveAction = async (_previousState, formData) => {
  await new Promise((resolve) => window.setTimeout(resolve, 120));

  const rawPayload = formData.get('editorPayload');
  const payload =
    typeof rawPayload === 'string'
      ? (JSON.parse(rawPayload) as { hero?: { title?: string | null } })
      : null;

  if (payload?.hero?.title?.toLowerCase().includes('gagal')) {
    return {
      message: 'Simulasi gagal menyimpan. Perubahan lokal tetap aman.',
      status: 'error',
    };
  }

  return {
    message: 'Perubahan undangan sudah disimpan.',
    status: 'success',
  };
};

function FixtureContent() {
  const {
    actionState,
    content,
    formAction,
    formId,
    submissionPayload,
    updateLocalContent,
  } = useInvitationStudioState();

  return (
    <div className="grid min-w-0 gap-5">
      <form
        action={formAction}
        className="border-seraya-border-default bg-seraya-surface grid min-w-0 gap-5 rounded-[var(--seraya-radius-lg)] border p-5"
        id={formId}
      >
        <input name="projectId" type="hidden" value="slice-b-project" />
        <input name="editorPayload" type="hidden" value={submissionPayload} />

        <div>
          <p className="text-seraya-text-muted text-xs font-bold tracking-[0.08em] uppercase">
            Fixture state bersama
          </p>
          <h2 className="text-seraya-text-primary mt-2 text-xl font-semibold">
            Ubah judul lalu pindah mode
          </h2>
        </div>

        <label className="text-seraya-text-primary grid gap-2 text-sm font-semibold">
          Judul utama
          <input
            className="border-seraya-border-default bg-seraya-surface focus-visible:outline-seraya-focus-ring min-h-11 min-w-0 rounded-[var(--seraya-radius-md)] border px-3.5"
            data-slice-b-title-input
            name="fixtureTitle"
            onChange={(event) =>
              updateLocalContent({
                field: 'title',
                type: 'hero',
                value: event.currentTarget.value,
              })
            }
            value={content.hero.title ?? ''}
          />
        </label>

        {actionState.status === 'error' && actionState.message ? (
          <p
            className="border-seraya-status-error/25 bg-seraya-status-error-soft text-seraya-text-primary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm"
            role="alert"
          >
            {actionState.message}
          </p>
        ) : null}

        <Link
          className="text-seraya-action-primary w-fit text-sm font-semibold underline-offset-4 hover:underline"
          data-slice-b-leave-link
          href={'/invitation-studio-slice-a' as Route}
        >
          Keluar dari studio
        </Link>
      </form>
    </div>
  );
}

export function InvitationStudioSliceBFixture({
  initialDraft,
  initialMode,
}: {
  initialDraft: InvitationDraft;
  initialMode: InvitationStudioMode;
}) {
  return (
    <ToastProvider>
      <InvitationStudioProvider
        initialDraft={initialDraft}
        projectId="slice-b-project"
        refreshOnSuccess={false}
        saveAction={fixtureSaveAction}
      >
        <InvitationStudioShell
          content={<FixtureContent />}
          coupleLabel="Nadia & Raka"
          design={
            <InvitationStudioModePlaceholder
              description="Mode ini tetap berbagi draf yang sama."
              eyebrow="Desain"
              title="State tidak dipisahkan per mode."
            />
          }
          initialMode={initialMode}
          media={
            <InvitationStudioModePlaceholder
              description="Media akan menggunakan authority yang sama pada slice berikutnya."
              eyebrow="Media"
              title="Perubahan Isi tetap tersimpan di memori."
            />
          }
          preview={
            <InvitationStudioModePlaceholder
              description="Preview membaca state yang sama tanpa membuat salinan draft."
              eyebrow="Preview"
              title="Satu sumber kebenaran."
            />
          }
          previewHref={'/invitation-studio-slice-b' as Route}
          publish={
            <InvitationStudioModePlaceholder
              description="Publikasi tetap menunggu draf yang berhasil disimpan."
              eyebrow="Terbitkan"
              title="Browser state bukan versi tamu."
            />
          }
          statusLabel="Draf pribadi"
          statusTone="neutral"
        />
      </InvitationStudioProvider>
    </ToastProvider>
  );
}
""")
write("tests/e2e/fixture-app/app/invitation-studio-slice-b/page.tsx", """import { InvitationStudioSliceBFixture } from './fixture-client';
import { parseInvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import { createDefaultInvitationDraftContent } from '../../../../../src/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';

export default async function InvitationStudioSliceBFixturePage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string | string[] }>;
}) {
  const query = await (searchParams ?? Promise.resolve<{ mode?: string | string[] }>({}));
  const initialDraft: InvitationDraft = {
    content: createDefaultInvitationDraftContent({
      default_timezone: 'Asia/Jakarta',
      event_date_primary: '2027-06-12',
      person_one_name: 'Nadia',
      person_two_name: 'Raka',
    }),
    created_at: '2026-08-06T00:00:00.000Z',
    deleted_at: null,
    id: 'slice-b-draft',
    project_id: 'slice-b-project',
    schema_version: 1,
    updated_at: '2026-08-06T00:00:00.000Z',
  };

  return (
    <main className="bg-seraya-canvas min-h-screen px-0 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[92rem]">
        <InvitationStudioSliceBFixture
          initialDraft={initialDraft}
          initialMode={parseInvitationStudioMode(query.mode)}
        />
      </div>
    </main>
  );
}
""")
write("playwright.invitation-studio-slice-b.config.ts", """import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'invitation-studio-unified-state-slice-b.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3108',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'npm exec next dev -- --hostname 127.0.0.1 --port 3108 tests/e2e/fixture-app',
    url: 'http://127.0.0.1:3108/invitation-studio-slice-b',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { height: 900, width: 1440 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
""")
write(".github/workflows/invitation-studio-slice-b.yml", """name: Invitation Studio Slice B unified state validation

on:
  workflow_dispatch:
  pull_request:
    paths:
      - 'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx'
      - 'src/components/projects/invitation-editor.tsx'
      - 'src/components/projects/invitation-studio-provider.tsx'
      - 'src/components/projects/invitation-studio-shell.tsx'
      - 'src/components/projects/invitation-studio-shell.module.css'
      - 'tests/unit/invitation-studio-unified-state-slice-b.test.ts'
      - 'tests/e2e/invitation-studio-unified-state-slice-b.spec.ts'
      - 'tests/e2e/fixture-app/app/invitation-studio-slice-b/**'
      - 'playwright.invitation-studio-slice-b.config.ts'
      - '.github/workflows/invitation-studio-slice-b.yml'
  push:
    branches:
      - feature/invitation-studio-slice-b-unified-state-command-authority
    paths:
      - 'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx'
      - 'src/components/projects/invitation-editor.tsx'
      - 'src/components/projects/invitation-studio-provider.tsx'
      - 'src/components/projects/invitation-studio-shell.tsx'
      - 'src/components/projects/invitation-studio-shell.module.css'
      - 'tests/unit/invitation-studio-unified-state-slice-b.test.ts'
      - 'tests/e2e/invitation-studio-unified-state-slice-b.spec.ts'
      - 'tests/e2e/fixture-app/app/invitation-studio-slice-b/**'
      - 'playwright.invitation-studio-slice-b.config.ts'
      - '.github/workflows/invitation-studio-slice-b.yml'

concurrency:
  group: invitation-studio-slice-b-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Check focused formatting
        run: |
          npx prettier --check \
            'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx' \
            src/components/projects/invitation-editor.tsx \
            src/components/projects/invitation-studio-provider.tsx \
            src/components/projects/invitation-studio-shell.tsx \
            src/components/projects/invitation-studio-shell.module.css \
            tests/unit/invitation-studio-unified-state-slice-b.test.ts \
            tests/e2e/invitation-studio-unified-state-slice-b.spec.ts \
            tests/e2e/fixture-app/app/invitation-studio-slice-b/page.tsx \
            tests/e2e/fixture-app/app/invitation-studio-slice-b/fixture-client.tsx \
            playwright.invitation-studio-slice-b.config.ts \
            .github/workflows/invitation-studio-slice-b.yml
      - name: Lint focused source
        run: |
          npx eslint \
            'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx' \
            src/components/projects/invitation-editor.tsx \
            src/components/projects/invitation-studio-provider.tsx \
            src/components/projects/invitation-studio-shell.tsx \
            tests/unit/invitation-studio-unified-state-slice-b.test.ts \
            tests/e2e/invitation-studio-unified-state-slice-b.spec.ts \
            tests/e2e/fixture-app/app/invitation-studio-slice-b/page.tsx \
            tests/e2e/fixture-app/app/invitation-studio-slice-b/fixture-client.tsx \
            playwright.invitation-studio-slice-b.config.ts
      - run: npm run typecheck
      - name: Run Slice A and Slice B unit contracts
        run: |
          npx vitest run \
            tests/unit/invitation-studio-structural-foundation-slice-a.test.tsx \
            tests/unit/invitation-studio-unified-state-slice-b.test.ts
      - run: npm run build
      - name: Install Chromium
        run: npx playwright install --with-deps chromium
      - name: Run desktop and mobile state smoke
        run: npx playwright test --config=playwright.invitation-studio-slice-b.config.ts
      - name: Upload browser evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: invitation-studio-slice-b-playwright-report
          path: |
            playwright-report
            test-results
          if-no-files-found: ignore
          retention-days: 7
""")
write("docs/INVITATION_STUDIO_SLICE_B_UNIFIED_STATE_COMMAND_AUTHORITY.md", """# SERAYA — Invitation Studio Slice B Unified State & Command Authority

## Status

Implementation branch for the locked `Invitation Studio Workspace Architecture Redesign V1`.

## Scope

Slice B establishes one client-side authority for:

- invitation draft content;
- dirty tracking;
- save lifecycle;
- the canonical save action;
- unsaved-navigation protection;
- submission payload generation.

The existing server action, validation schema, draft persistence, preview renderer, publication rules, payment gate, gallery behavior, and audio behavior are unchanged.

## Canonical state flow

```text
Draf tersimpan
↓ owner edits
Belum tersimpan
↓ one header action
Menyimpan
├─ success → Semua perubahan tersimpan
└─ failure → Gagal menyimpan; local changes remain intact
```

## Architectural decisions

- `InvitationStudioProvider` owns the reducer previously local to `InvitationEditor`.
- All Studio modes remain mounted beneath the same provider.
- The Studio header is the only dominant save authority.
- `InvitationEditor` remains the content surface but no longer owns persistence state.
- Mode switches use History state only and do not remount the provider.
- Leaving the Studio while dirty requires explicit confirmation.
- No server autosave is introduced.
- No database or migration change is required.

## Out of scope

- moving template and palette into Design mode;
- moving gallery and audio into Media mode;
- dedicated Preview mode;
- dedicated Publish mode;
- schema changes;
- production deployment.

## Validation gates

- focused formatting and lint;
- TypeScript;
- Slice A + Slice B unit contracts;
- production build;
- desktop and mobile Chromium smoke;
- state retention across all five modes;
- successful save transition;
- failed save retention and retry;
- dirty leave guard;
- exactly one canonical save button;
- no horizontal page overflow.
""")

editor_path = ROOT / "src/components/projects/invitation-editor.tsx"
editor = editor_path.read_text(encoding="utf-8")

editor = replace_once(
    editor,
    "import { useRouter } from 'next/navigation';\n",
    "",
    "remove router import",
)
editor = replace_once(
    editor,
    """import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
""",
    """import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
""",
    "reduce React imports",
)
editor = replace_once(
    editor,
    """import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useToast,
} from '@/design-system';
""",
    """import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system';
""",
    "remove toast import",
)
editor = replace_once(
    editor,
    """import {
  initialInvitationEditorActionState,
  type InvitationEditorActionState,
} from '@/modules/invitations/invitation-editor.action-state';
import { saveInvitationEditorAction } from '@/modules/invitations/invitation-editor.actions';
import {
  createInvitationEditorSubmissionPayload,
  invitationEditorLocalContentReducer,
  type InvitationEditorLocalAction,
} from '@/modules/invitations/invitation-editor-local-state';
""",
    """import type { InvitationEditorActionState } from '@/modules/invitations/invitation-editor.action-state';
import type { InvitationEditorLocalAction } from '@/modules/invitations/invitation-editor-local-state';
""",
    "replace editor persistence imports",
)
editor = replace_once(
    editor,
    """import { PublishInvitationControls } from './publish-invitation-controls';
""",
    """import {
  invitationStudioDirtyNavigationMessage,
  shouldConfirmInvitationStudioNavigation,
  useInvitationStudioState,
} from './invitation-studio-provider';
import { PublishInvitationControls } from './publish-invitation-controls';
""",
    "add Studio provider import",
)
editor = replace_once(
    editor,
    """export const invitationEditorDirtyNavigationMessage =
  'Perubahan undangan belum disimpan. Yakin ingin meninggalkan halaman ini?';
""",
    """export const invitationEditorDirtyNavigationMessage =
  invitationStudioDirtyNavigationMessage;
""",
    "reuse Studio dirty message",
)
editor = replace_once(
    editor,
    """export function shouldConfirmInvitationEditorNavigation(currentHref: string, nextHref: string) {
  const currentUrl = new URL(currentHref);
  const nextUrl = new URL(nextHref, currentUrl);
  const isSameDocumentHash =
    nextUrl.pathname === currentUrl.pathname &&
    nextUrl.search === currentUrl.search &&
    nextUrl.hash.length > 0;

  return !isSameDocumentHash;
}
""",
    """export const shouldConfirmInvitationEditorNavigation =
  shouldConfirmInvitationStudioNavigation;
""",
    "reuse Studio navigation guard",
)
editor = replace_once(
    editor,
    """  const router = useRouter();
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
""",
    """  const {
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
""",
    "move editor state to Studio provider",
)
editor = replace_once(
    editor,
    """  const [isDirty, setIsDirty] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
""",
    "",
    "remove local dirty state",
)
editor = replace_once(
    editor,
    """  const lastHandledSuccessState = useRef<InvitationEditorActionState | null>(null);
  const lastSyncedDraftUpdatedAt = useRef(draft.updated_at);
""",
    "",
    "remove local save refs",
)
editor = replace_once(
    editor,
    """  const submissionPayload = useMemo(
    () => JSON.stringify(createInvitationEditorSubmissionPayload(content)),
    [content],
  );
""",
    "",
    "remove local submission payload",
)
editor = replace_once(
    editor,
    """  const updateLocalContent = useCallback((action: InvitationEditorLocalAction) => {
    dispatchLocalContent(action);
    setIsDirty(true);
  }, []);

""",
    "",
    "remove local update authority",
)
editor = replace_once(
    editor,
    """  useEffect(() => {
    if (draft.updated_at === lastSyncedDraftUpdatedAt.current || isDirty) {
      return;
    }

    lastSyncedDraftUpdatedAt.current = draft.updated_at;
    dispatchLocalContent({ content: draft.content, type: 'replace' });
  }, [draft.content, draft.updated_at, isDirty]);

""",
    "",
    "remove editor draft sync",
)
dirty_start = editor.index("  useEffect(() => {\n    if (!isDirty) {\n      return;\n    }\n\n    const message = invitationEditorDirtyNavigationMessage;")
dirty_end_marker = "  }, [isDirty]);\n\n"
dirty_end = editor.index(dirty_end_marker, dirty_start) + len(dirty_end_marker)
editor = editor[:dirty_start] + editor[dirty_end:]

success_start = editor.index("  useEffect(() => {\n    if (state.status !== 'success'")
success_end_marker = "  }, [router, state, toast]);\n\n"
success_end = editor.index(success_end_marker, success_start) + len(success_end_marker)
editor = editor[:success_start] + editor[success_end:]

editor = replace_once(
    editor,
    '<form action={formAction} className="max-w-full min-w-0 space-y-5 pb-28 sm:pb-0">',
    '<form action={formAction} className="max-w-full min-w-0 space-y-5" id={formId}>',
    "connect editor form to canonical header action",
)

command_start = editor.index(
    '              <div className="border-seraya-border-default bg-seraya-surface sticky bottom-0'
)
command_end_marker = "              </div>\n            </form>"
command_end = editor.index(command_end_marker, command_start) + len("              </div>")
command_bridge = """              <div
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
              </div>"""
editor = editor[:command_start] + command_bridge + editor[command_end:]
editor_path.write_text(editor, encoding="utf-8")

page_path = ROOT / "src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx"
page = page_path.read_text(encoding="utf-8")
page = replace_once(
    page,
    """import { InvitationEditor } from '@/components/projects/invitation-editor';
""",
    """import { InvitationEditor } from '@/components/projects/invitation-editor';
import { InvitationStudioProvider } from '@/components/projects/invitation-studio-provider';
""",
    "import Studio provider",
)
page = replace_once(
    page,
    """      <InvitationStudioShell
""",
    """      <InvitationStudioProvider
        initialDraft={screen.editor.draft}
        projectId={screen.editor.project.id}
      >
        <InvitationStudioShell
""",
    "wrap Studio shell",
)
page = replace_once(
    page,
    """      </InvitationStudioShell>
    </WorkspacePage>
""",
    """        </InvitationStudioShell>
      </InvitationStudioProvider>
    </WorkspacePage>
""",
    "close Studio provider",
)
page_path.write_text(page, encoding="utf-8")

for obsolete in [
    ROOT / "tools/apply-invitation-studio-slice-b.py",
    ROOT / ".github/workflows/invitation-studio-slice-b-bootstrap.yml",
]:
    obsolete.unlink(missing_ok=True)
