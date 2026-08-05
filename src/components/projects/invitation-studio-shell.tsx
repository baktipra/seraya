'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { InvitationStudioModePlaceholder } from './invitation-studio-mode-placeholder';
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
 * Release Slice A structural owner for the invitation workspace.
 *
 * Every mode is an explicit named slot. Inactive slots stay mounted so the
 * legacy editor can retain its local React state while later slices migrate
 * controls into their canonical modes. Optional legacy children keep the
 * current route behavior intact during this first structural pass.
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
  const [activeMode, setActiveMode] = useState<InvitationStudioMode>(initialMode);
  const [announcement, setAnnouncement] = useState('');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const requestedMode = parseInvitationStudioMode(
      new URL(window.location.href).searchParams.get('mode'),
    );
    setActiveMode(requestedMode);

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

    event.preventDefault();
    const nextMode = invitationStudioModes[nextIndex];
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
      data-invitation-studio-slice="structural-foundation-a"
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
