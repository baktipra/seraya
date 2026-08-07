'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';

import { beginWorkspaceTransition } from '@/lib/performance/workspace-performance.client';

import {
  GuestsIcon,
  HomeIcon,
  InvitationIcon,
  ResponseIcon,
  SettingsIcon,
  ShareIcon,
} from './dashboard-icons';
import styles from './project-navigation.module.css';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type ProjectNavigationItem = {
  aliases?: string[];
  exact?: boolean;
  href: Route;
  icon: IconComponent;
  label: string;
  performanceWorkspace: string;
};

function getProjectNavigationItems(projectId: string): ProjectNavigationItem[] {
  const base = `/dashboard/${projectId}`;

  return [
    {
      exact: true,
      href: base as Route,
      icon: HomeIcon,
      label: 'Ringkasan',
      performanceWorkspace: 'project-summary',
    },
    {
      aliases: [`${base}/preview`, `${base}/billing`, `${base}/gallery`],
      href: `${base}/invitation` as Route,
      icon: InvitationIcon,
      label: 'Undangan',
      performanceWorkspace: 'studio',
    },
    {
      href: `${base}/guests` as Route,
      icon: GuestsIcon,
      label: 'Tamu',
      performanceWorkspace: 'guests',
    },
    {
      aliases: [`${base}/share`],
      href: `${base}/delivery` as Route,
      icon: ShareIcon,
      label: 'Bagikan',
      performanceWorkspace: 'delivery',
    },
    {
      aliases: [`${base}/guestbook`, `${base}/follow-up`],
      href: `${base}/rsvp` as Route,
      icon: ResponseIcon,
      label: 'Respons Tamu',
      performanceWorkspace: 'responses',
    },
  ];
}

function isCurrentProjectRoute(pathname: string, item: ProjectNavigationItem) {
  if (item.exact) return pathname === String(item.href);
  if (item.aliases?.some((alias) => pathname.startsWith(alias))) return true;
  return pathname.startsWith(String(item.href));
}

function getProjectRouteLabel(pathname: string, projectId: string) {
  const projectRoot = `/dashboard/${projectId}`;
  if (pathname === projectRoot) return 'Ringkasan';

  const segment = pathname.slice(projectRoot.length + 1).split('/')[0] ?? '';
  const labels: Record<string, string> = {
    billing: 'Undangan',
    delivery: 'Bagikan',
    'follow-up': 'Respons Tamu',
    gallery: 'Undangan',
    guestbook: 'Respons Tamu',
    guests: 'Tamu',
    invitation: 'Undangan',
    preview: 'Undangan',
    rsvp: 'Respons Tamu',
    settings: 'Pengaturan',
    share: 'Bagikan',
  };

  return labels[segment] ?? 'Workspace proyek';
}

function ProjectNavigationLink({
  active,
  currentPathname,
  item,
  onNavigate,
  onTransitionStart,
  pending,
}: {
  active: boolean;
  currentPathname: string;
  item: ProjectNavigationItem;
  onNavigate?: () => void;
  onTransitionStart: (item: ProjectNavigationItem) => void;
  pending: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      aria-busy={pending || undefined}
      aria-current={active ? 'page' : undefined}
      className={styles.navLink}
      data-active={active || undefined}
      data-workspace-destination={item.performanceWorkspace}
      data-workspace-navigation-pending={pending || undefined}
      href={item.href}
      onClick={(event) => {
        onNavigate?.();
        if (
          active ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        ) {
          return;
        }

        beginWorkspaceTransition({
          from: currentPathname,
          to: String(item.href),
          workspace: item.performanceWorkspace,
        });
        onTransitionStart(item);
      }}
      prefetch
    >
      <span aria-hidden="true" className={styles.navIcon}>
        {pending ? (
          <span className={styles.spinner} />
        ) : (
          <Icon className={styles.icon} focusable="false" strokeWidth={1.7} />
        )}
      </span>
      <span>{item.label}</span>
      {pending ? <span className={styles.pendingLabel}>Membuka…</span> : null}
    </Link>
  );
}

function ProjectSidebar({
  coupleLabel,
  currentPathname,
  items,
  onNavigate,
  onTransitionStart,
  pendingHref,
  projectId,
  statusLabel,
}: {
  coupleLabel: string;
  currentPathname: string;
  items: ProjectNavigationItem[];
  onNavigate?: () => void;
  onTransitionStart: (item: ProjectNavigationItem) => void;
  pendingHref: string | null;
  projectId: string;
  statusLabel: string;
}) {
  const settingsHref = `/dashboard/${projectId}/settings` as Route;
  const settingsActive = currentPathname.startsWith(String(settingsHref));

  return (
    <div className={styles.sidebarInner}>
      <div className={styles.projectCard}>
        <span className={styles.projectLabel}>Proyek aktif</span>
        <strong className={styles.projectName}>{coupleLabel}</strong>
        <span className={styles.projectStatus}>
          <span aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      <nav aria-label="Navigasi workspace" className={styles.navList}>
        {items.map((item) => (
          <ProjectNavigationLink
            active={isCurrentProjectRoute(currentPathname, item)}
            currentPathname={currentPathname}
            item={item}
            key={item.label}
            onNavigate={onNavigate}
            onTransitionStart={onTransitionStart}
            pending={pendingHref === String(item.href)}
          />
        ))}
      </nav>

      <nav aria-label="Navigasi utilitas proyek" className={styles.utilityNav}>
        <Link
          aria-current={settingsActive ? 'page' : undefined}
          className={styles.utilityLink}
          data-active={settingsActive || undefined}
          href={settingsHref}
          onClick={() => onNavigate?.()}
        >
          <SettingsIcon aria-hidden="true" className={styles.icon} strokeWidth={1.7} />
          Pengaturan
        </Link>
        <Link
          className={styles.utilityLink}
          href="/dashboard"
          onClick={() => onNavigate?.()}
          prefetch={false}
        >
          <span aria-hidden="true" className={styles.backGlyph}>
            ←
          </span>
          Semua undangan
        </Link>
      </nav>
    </div>
  );
}

export function ProjectNavigation({
  coupleLabel,
  projectId,
  statusLabel,
}: {
  coupleLabel: string;
  projectId: string;
  statusLabel: string;
}) {
  const pathname = usePathname();
  const items = getProjectNavigationItems(projectId);
  const previousPathnameRef = useRef(pathname);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [routeAnnouncement, setRouteAnnouncement] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentRouteLabel = getProjectRouteLabel(pathname, projectId);
  const settingsHref = `/dashboard/${projectId}/settings` as Route;
  const settingsActive = pathname.startsWith(String(settingsHref));

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return undefined;

    previousPathnameRef.current = pathname;
    setPendingHref(null);
    setMobileOpen(false);
    const focusFrame = window.requestAnimationFrame(() => {
      document.getElementById('project-workspace-content')?.focus({ preventScroll: true });
      setRouteAnnouncement(`Halaman ${getProjectRouteLabel(pathname, projectId)} dibuka.`);
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [pathname, projectId]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const startTransition = (item: ProjectNavigationItem) => {
    setPendingHref(String(item.href));
    setRouteAnnouncement(`Membuka halaman ${item.label}.`);
  };

  return (
    <>
      <div className={styles.mobileContext} data-project-mobile-context>
        <button
          aria-expanded={mobileOpen}
          aria-label="Buka navigasi proyek"
          className={styles.menuButton}
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className={styles.mobileIdentity}>
          <span>{coupleLabel}</span>
          <strong>{currentRouteLabel}</strong>
        </div>
        <Link
          aria-label="Buka pengaturan proyek"
          className={styles.mobileSettings}
          data-active={settingsActive || undefined}
          href={settingsHref}
        >
          <SettingsIcon aria-hidden="true" className={styles.icon} strokeWidth={1.7} />
        </Link>
      </div>

      <aside className={styles.desktopSidebar} data-project-sidebar>
        <ProjectSidebar
          coupleLabel={coupleLabel}
          currentPathname={pathname}
          items={items}
          onTransitionStart={startTransition}
          pendingHref={pendingHref}
          projectId={projectId}
          statusLabel={statusLabel}
        />
      </aside>

      {mobileOpen ? (
        <div className={styles.mobileOverlay}>
          <button
            aria-label="Tutup navigasi proyek"
            className={styles.mobileBackdrop}
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside aria-label="Navigasi proyek" className={styles.mobileDrawer}>
            <div className={styles.mobileDrawerHead}>
              <span className={styles.mobileDrawerBrand}>Seraya</span>
              <button
                aria-label="Tutup navigasi proyek"
                className={styles.closeButton}
                onClick={() => setMobileOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <ProjectSidebar
              coupleLabel={coupleLabel}
              currentPathname={pathname}
              items={items}
              onNavigate={() => setMobileOpen(false)}
              onTransitionStart={startTransition}
              pendingHref={pendingHref}
              projectId={projectId}
              statusLabel={statusLabel}
            />
          </aside>
        </div>
      ) : null}

      <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {routeAnnouncement}
      </p>
    </>
  );
}
