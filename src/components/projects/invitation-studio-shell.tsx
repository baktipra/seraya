'use client';

import type { Route } from 'next';
import Link from 'next/link';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import {
  getInvitationStudioModeLabel,
  invitationStudioModes,
  parseInvitationStudioMode,
  type InvitationStudioMode,
} from './invitation-studio.types';
import styles from './invitation-studio-shell.module.css';

export type InvitationStudioStatusTone = 'brand' | 'neutral' | 'success' | 'warning';

export interface InvitationStudioShellProps {
  content: ReactNode;
  coupleLabel: string;
  design: ReactNode;
  initialMode: InvitationStudioMode;
  media: ReactNode;
  preview: ReactNode;
  previewHref: Route;
  publish: ReactNode;
  statusLabel: string;
  statusTone: InvitationStudioStatusTone;
}

type HistoryMode = 'push' | 'replace';

function getModeUrl(mode: InvitationStudioMode) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', mode);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Release Slice A structural owner for the invitation workspace.
 *
 * Every mode is an explicit named slot. Inactive slots stay mounted so the
 * legacy editor can retain its local React state while later slices migrate
 * controls into their canonical modes.
 */
export function InvitationStudioShell({
  content,
  coupleLabel,
  design,
  initialMode,
  media,
  preview,
  previewHref,
  publish,
  statusLabel,
  statusTone,
}: InvitationStudioShellProps) {
  const [activeMode, setActiveMode] = useState<InvitationStudioMode>(initialMode);
  const [announcement, setAnnouncement] = useState('');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

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

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % invitationStudioModes.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        (currentIndex - 1 + invitationStudioModes.length) % invitationStudioModes.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = invitationStudioModes.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextMode = invitationStudioModes[nextIndex];
    tabRefs.current[nextIndex]?.focus();
    activateMode(nextMode.key, 'replace');
  };

  const panels: ReadonlyArray<{ mode: InvitationStudioMode; node: ReactNode }> = [
    { mode: 'content', node: content },
    { mode: 'design', node: design },
    { mode: 'media', node: media },
    { mode: 'preview', node: preview },
    { mode: 'publish', node: publish },
  ];

  return (
    <section
      aria-labelledby="invitation-studio-title"
      className={styles.studio}
      data-invitation-studio
      data-invitation-studio-active-mode={activeMode}
      data-invitation-studio-slice="structural-foundation-a"
    >
      <header className={styles.header} data-invitation-studio-header>
        <div className={styles.headerIdentity}>
          <p className={styles.eyebrow}>Studio undangan</p>
          <h1 className={styles.title} id="invitation-studio-title">
            {coupleLabel}
          </h1>
          <p className={styles.modeContext}>
            Mode {getInvitationStudioModeLabel(activeMode)}
          </p>
        </div>

        <div className={styles.headerActions}>
          <span
            className={styles.status}
            data-invitation-studio-status-tone={statusTone}
          >
            <span aria-hidden="true" className={styles.statusDot} />
            {statusLabel}
          </span>
          <Link className={styles.previewLink} href={previewHref}>
            Preview tersimpan
          </Link>
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
