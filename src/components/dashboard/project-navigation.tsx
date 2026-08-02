'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';

import { beginWorkspaceTransition } from '@/lib/performance/workspace-performance.client';

import {
  GuestsIcon,
  HelpIcon,
  InvitationIcon,
  OverviewIcon,
  SettingsIcon,
  ShareIcon,
} from './dashboard-icons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type ProjectNavigationItem = {
  aliases?: string[];
  href: Route;
  icon: IconComponent;
  label: string;
  mobileLabel?: string;
  performanceWorkspace: 'compass' | 'delivery' | 'guests' | 'responses' | 'studio';
};

function getProjectNavigationItems(projectId: string): ProjectNavigationItem[] {
  const base = `/dashboard/${projectId}`;

  return [
    {
      href: base as Route,
      icon: OverviewIcon,
      label: 'Ringkasan',
      mobileLabel: 'Ringkas',
      performanceWorkspace: 'compass',
    },
    {
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
      aliases: [`${base}/follow-up`, `${base}/share`],
      href: `${base}/delivery` as Route,
      icon: ShareIcon,
      label: 'Bagikan',
      performanceWorkspace: 'delivery',
    },
    {
      aliases: [`${base}/guestbook`],
      href: `${base}/rsvp` as Route,
      icon: HelpIcon,
      label: 'Respons Tamu',
      mobileLabel: 'Respons',
      performanceWorkspace: 'responses',
    },
  ];
}

function isCurrentProjectRoute(pathname: string, item: ProjectNavigationItem, projectId: string) {
  const projectRoot = `/dashboard/${projectId}`;

  if (item.aliases?.some((alias) => pathname.startsWith(alias))) {
    return true;
  }

  return item.href === projectRoot ? pathname === projectRoot : pathname.startsWith(item.href);
}

function getProjectRouteLabel(pathname: string, projectId: string) {
  const projectRoot = `/dashboard/${projectId}`;
  if (pathname === projectRoot) return 'Ringkasan';

  const segment = pathname.slice(projectRoot.length + 1).split('/')[0] ?? '';
  const labels: Record<string, string> = {
    billing: 'Pembayaran',
    delivery: 'Bagikan',
    'follow-up': 'Bagikan',
    gallery: 'Galeri',
    guestbook: 'Respons Tamu',
    guests: 'Tamu',
    invitation: 'Undangan',
    preview: 'Preview undangan',
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
  mode,
  onTransitionStart,
  pending,
}: {
  active: boolean;
  currentPathname: string;
  item: ProjectNavigationItem;
  mode: 'desktop' | 'mobile';
  onTransitionStart: (item: ProjectNavigationItem) => void;
  pending: boolean;
}) {
  const Icon = item.icon;
  const visualLabel = mode === 'mobile' ? (item.mobileLabel ?? item.label) : item.label;

  return (
    <Link
      aria-busy={pending || undefined}
      aria-current={active ? 'page' : undefined}
      className={
        mode === 'desktop'
          ? `focus-visible:outline-seraya-focus-ring group relative flex min-h-11 items-center gap-3 rounded-[var(--seraya-radius-sm)] px-3 text-sm font-medium transition-[background-color,color,opacity] duration-[var(--seraya-motion-default)] ease-[var(--seraya-ease-standard)] focus-visible:outline-3 focus-visible:outline-offset-2 ${
              active
                ? 'bg-seraya-brand-softer text-seraya-action-primary'
                : pending
                  ? 'bg-seraya-surface-subtle text-seraya-action-primary'
                  : 'text-seraya-text-secondary hover:bg-seraya-surface-subtle hover:text-seraya-text-primary'
            }`
          : `focus-visible:outline-seraya-focus-ring relative flex min-h-[4rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--seraya-radius-sm)] px-1 text-[0.625rem] font-medium transition-[background-color,color,opacity] duration-[var(--seraya-motion-default)] focus-visible:outline-3 focus-visible:outline-offset-2 ${
              active
                ? 'bg-seraya-brand-softer text-seraya-action-primary'
                : pending
                  ? 'bg-seraya-surface-subtle text-seraya-action-primary'
                  : 'text-seraya-text-muted'
            }`
      }
      data-workspace-destination={item.performanceWorkspace}
      data-workspace-navigation-pending={pending || undefined}
      href={item.href}
      onClick={(event) => {
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
      {active && mode === 'desktop' ? (
        <span
          aria-hidden="true"
          className="bg-seraya-action-primary absolute inset-y-2 left-0 w-0.5 rounded-full"
        />
      ) : null}
      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center">
        {pending ? (
          <span className="border-seraya-action-primary/30 border-t-seraya-action-primary size-4 animate-spin rounded-full border-2" />
        ) : (
          <Icon
            className={mode === 'desktop' ? 'size-[1.1rem]' : 'size-[1.15rem]'}
            focusable="false"
            strokeWidth={1.7}
          />
        )}
      </span>
      {mode === 'mobile' ? (
        <>
          <span className="sr-only">{item.label}</span>
          <span aria-hidden="true" className="max-w-full truncate">
            {visualLabel}
          </span>
        </>
      ) : (
        <span>{visualLabel}</span>
      )}
      {mode === 'desktop' && pending ? (
        <span aria-hidden="true" className="text-seraya-text-muted ml-auto text-xs">
          Membuka…
        </span>
      ) : null}
    </Link>
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
  const currentRouteLabel = getProjectRouteLabel(pathname, projectId);
  const settingsHref = `/dashboard/${projectId}/settings` as Route;
  const settingsActive = pathname.startsWith(String(settingsHref));

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return undefined;

    previousPathnameRef.current = pathname;
    setPendingHref(null);
    const focusFrame = window.requestAnimationFrame(() => {
      document.getElementById('project-workspace-content')?.focus({ preventScroll: true });
      setRouteAnnouncement(`Halaman ${getProjectRouteLabel(pathname, projectId)} dibuka.`);
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [pathname, projectId]);

  const startTransition = (item: ProjectNavigationItem) => {
    setPendingHref(String(item.href));
    setRouteAnnouncement(`Membuka halaman ${item.label}.`);
  };

  return (
    <>
      <div
        className="border-seraya-border-subtle bg-seraya-surface/92 sticky top-[calc(var(--seraya-topbar-height)+0.5rem)] z-30 mb-5 flex min-w-0 items-center justify-between gap-4 rounded-[var(--seraya-radius-lg)] border px-3.5 py-3 shadow-[var(--seraya-shadow-level-1)] backdrop-blur-xl lg:hidden"
        data-project-mobile-context
      >
        <div className="min-w-0">
          <p className="text-seraya-text-muted truncate text-xs font-medium">{coupleLabel}</p>
          <p className="text-seraya-text-primary mt-0.5 truncate text-sm font-semibold">
            {currentRouteLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="bg-seraya-surface-subtle text-seraya-text-secondary border-seraya-border-subtle hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium min-[430px]:inline-flex">
            <span aria-hidden="true" className="bg-seraya-status-success size-1.5 rounded-full" />
            {statusLabel}
          </span>
          <Link
            aria-label="Buka pengaturan proyek"
            className={`focus-visible:outline-seraya-focus-ring grid size-10 place-items-center rounded-[var(--seraya-radius-sm)] transition-colors duration-[var(--seraya-motion-default)] focus-visible:outline-3 focus-visible:outline-offset-2 ${
              settingsActive
                ? 'bg-seraya-brand-softer text-seraya-action-primary'
                : 'text-seraya-text-secondary hover:bg-seraya-surface-subtle hover:text-seraya-text-primary'
            }`}
            href={settingsHref}
          >
            <SettingsIcon aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.7} />
          </Link>
        </div>
      </div>

      <aside className="border-seraya-border-subtle hidden min-w-0 border-r pr-6 lg:sticky lg:top-[calc(var(--seraya-topbar-height)+2rem)] lg:flex lg:h-[calc(100svh-var(--seraya-topbar-height)-4rem)] lg:w-[var(--seraya-project-rail-width)] lg:flex-col">
        <div className="border-seraya-border-subtle border-b pb-5">
          <p className="text-seraya-text-muted text-xs font-medium">Workspace undangan</p>
          <p className="text-seraya-text-primary mt-2 text-[1.05rem] leading-6 font-semibold tracking-[-0.02em]">
            {coupleLabel}
          </p>
          <p className="text-seraya-text-muted mt-2 flex items-center gap-2 text-xs leading-5">
            <span aria-hidden="true" className="bg-seraya-status-success size-1.5 rounded-full" />
            {statusLabel}
          </p>
        </div>

        <nav
          aria-busy={Boolean(pendingHref)}
          aria-label="Navigasi workspace"
          className="mt-5 space-y-1"
          data-project-navigation-pending={Boolean(pendingHref) || undefined}
        >
          {items.map((item) => (
            <ProjectNavigationLink
              active={isCurrentProjectRoute(pathname, item, projectId)}
              currentPathname={pathname}
              item={item}
              key={item.label}
              mode="desktop"
              onTransitionStart={startTransition}
              pending={pendingHref === String(item.href)}
            />
          ))}
        </nav>

        <nav
          aria-label="Navigasi utilitas proyek"
          className="border-seraya-border-subtle mt-auto space-y-1 border-t pt-4"
        >
          <Link
            aria-current={settingsActive ? 'page' : undefined}
            className={`focus-visible:outline-seraya-focus-ring flex min-h-11 items-center gap-3 rounded-[var(--seraya-radius-sm)] px-3 text-sm font-medium transition-colors duration-[var(--seraya-motion-default)] focus-visible:outline-3 focus-visible:outline-offset-2 ${
              settingsActive
                ? 'bg-seraya-brand-softer text-seraya-action-primary'
                : 'text-seraya-text-secondary hover:bg-seraya-surface-subtle hover:text-seraya-text-primary'
            }`}
            href={settingsHref}
          >
            <SettingsIcon aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.7} />
            Pengaturan
          </Link>
          <Link
            className="text-seraya-text-secondary hover:bg-seraya-surface-subtle hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring flex min-h-11 items-center gap-3 rounded-[var(--seraya-radius-sm)] px-3 text-sm font-medium transition-colors duration-[var(--seraya-motion-default)] focus-visible:outline-3 focus-visible:outline-offset-2"
            href="/dashboard"
            prefetch={false}
          >
            <span aria-hidden="true" className="grid size-[1.1rem] place-items-center text-base">
              ←
            </span>
            Semua undangan
          </Link>
        </nav>
      </aside>

      <nav
        aria-busy={Boolean(pendingHref)}
        aria-label="Navigasi workspace mobile"
        className="border-seraya-border-subtle bg-seraya-surface/96 pointer-events-auto fixed inset-x-0 bottom-0 isolate z-[100] flex min-h-[var(--seraya-mobile-nav-clearance)] items-stretch gap-1 border-t px-2 pt-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(31_29_27_/_0.06)] backdrop-blur-xl lg:hidden"
        data-project-mobile-navigation
        data-project-navigation-pending={Boolean(pendingHref) || undefined}
      >
        {items.map((item) => (
          <ProjectNavigationLink
            active={isCurrentProjectRoute(pathname, item, projectId)}
            currentPathname={pathname}
            item={item}
            key={item.label}
            mode="mobile"
            onTransitionStart={startTransition}
            pending={pendingHref === String(item.href)}
          />
        ))}
      </nav>

      <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {routeAnnouncement}
      </p>
    </>
  );
}
