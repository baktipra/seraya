'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { InvitationStudioModePlaceholder } from './invitation-studio-mode-placeholder';
import { useOptionalInvitationStudioState } from './invitation-studio-provider';
import responsiveStyles from './invitation-studio-responsive-polish.module.css';
import styles from './invitation-studio-shell.module.css';
import {
  getInvitationStudioModeLabel,
  invitationStudioModes,
  parseInvitationStudioMode,
  type InvitationStudioMode,
} from './invitation-studio.types';

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

  useEffect(() => {
    const activeIndex = invitationStudioModes.findIndex((mode) => mode.key === activeMode);
    const activeTab = tabRefs.current[activeIndex];
    if (!activeTab) return;

    const navigation = activeTab.closest(
      '[data-invitation-studio-mode-navigation]',
    ) as HTMLElement | null;
    if (!navigation) return;

    const frame = window.requestAnimationFrame(() => {
      const tabRect = activeTab.getBoundingClientRect();
      const navigationRect = navigation.getBoundingClientRect();
      const edgePadding = 8;
      const isOutsideViewport =
        tabRect.left < navigationRect.left + edgePadding ||
        tabRect.right > navigationRect.right - edgePadding;

      if (!isOutsideViewport) return;

      activeTab.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeMode]);

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
      className={[styles.studio, responsiveStyles.responsiveRoot].join(' ')}
      data-invitation-studio
      data-invitation-studio-active-mode={activeMode}
      data-invitation-studio-responsive="slice-g"
      data-invitation-studio-slice="structural-foundation-a"
      data-invitation-studio-state-authority="unified-state-command-b"
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
