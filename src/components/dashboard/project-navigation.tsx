'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';

import { beginWorkspaceTransition } from '@/lib/performance/workspace-performance.client';

import { GuestsIcon, HelpIcon, InvitationIcon, OverviewIcon, ShareIcon } from './dashboard-icons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type ProjectNavigationItem = {
  aliases?: string[];
  href: Route;
  icon: IconComponent;
  label: string;
  mobileLabel?: string;
  performanceWorkspace: 'compass' | 'delivery' | 'guests' | 'responses' | 'studio';
};

/**
 * The owner workspace follows one stable five-destination journey. Individual
 * pages still own authorization and unavailable states; the rail owns only
 * navigation, project identity, and current-location clarity.
 */
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
          ? `focus-visible:outline-seraya-focus-ring group relative flex min-h-12 items-center gap-3 rounded-[0.9rem] px-3.5 text-sm font-semibold transition-[background-color,color,opacity,transform] focus-visible:outline-3 focus-visible:outline-offset-2 ${
              active
                ? 'bg-seraya-brand-soft text-seraya-action-primary'
                : pending
                  ? 'bg-seraya-soft text-seraya-action-primary'
                  : 'text-seraya-text-secondary hover:bg-seraya-soft hover:text-seraya-text-primary'
            }`
          : `focus-visible:outline-seraya-focus-ring relative flex min-h-[4.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[0.625rem] font-semibold transition-[color,opacity] focus-visible:outline-3 focus-visible:outline-offset-2 ${
              active || pending ? 'text-seraya-action-primary' : 'text-seraya-text-muted'
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
      {mode === 'mobile' && (active || pending) ? (
        <span
          aria-hidden="true"
          className={`bg-seraya-action-primary absolute inset-x-4 top-0 rounded-full ${
            pending ? 'h-1 animate-pulse' : 'h-0.5'
          }`}
        />
      ) : null}
      <span
        aria-hidden="true"
        className={
          mode === 'desktop'
            ? `grid size-8 place-items-center rounded-[0.7rem] transition-colors ${
                active || pending
                  ? 'bg-seraya-surface'
                  : 'group-hover:bg-seraya-surface bg-transparent'
              }`
            : undefined
        }
      >
        {pending ? (
          <span className="border-seraya-action-primary/30 border-t-seraya-action-primary size-[1.05rem] animate-spin rounded-full border-2" />
        ) : (
          <Icon
            className={mode === 'desktop' ? 'size-[1.05rem]' : 'size-[1.1rem]'}
            focusable="false"
            strokeWidth={1.65}
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
      {mode === 'desktop' && active ? (
        <span
          aria-hidden="true"
          className="bg-seraya-action-primary ml-auto size-1.5 rounded-full"
        />
      ) : null}
      {mode === 'desktop' && pending ? (
        <span aria-hidden="true" className="text-seraya-text-muted ml-auto text-xs font-medium">
          Membuka…
        </span>
      ) : null}
    </Link>
  );
}

/** Client-side active state only affects presentation; route authorization remains local to each page. */
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
      <aside className="border-seraya-border-default hidden min-w-0 border-r pr-6 lg:sticky lg:top-24 lg:flex lg:h-[calc(100svh-7.25rem)] lg:w-60 lg:flex-col">
        <div className="bg-seraya-soft/70 rounded-[1.1rem] px-4 py-4">
          <p className="text-seraya-text-muted text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
            Workspace undangan
          </p>
          <p className="text-seraya-text-primary mt-2 font-serif text-[1.45rem] leading-[1.02] font-medium tracking-[-0.025em]">
            {coupleLabel}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span aria-hidden="true" className="bg-seraya-action-primary size-1.5 rounded-full" />
            <p className="text-seraya-text-muted text-xs leading-5">{statusLabel}</p>
          </div>
        </div>

        <nav
          aria-busy={Boolean(pendingHref)}
          aria-label="Navigasi workspace"
          className="mt-6 space-y-1.5"
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

        <div className="border-seraya-border-default mt-auto border-t pt-5">
          <Link
            className="text-seraya-text-muted hover:text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center gap-2 rounded-[var(--seraya-radius-sm)] px-2 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
            href="/dashboard"
            prefetch={false}
          >
            <span aria-hidden="true">←</span>
            Semua undangan
          </Link>
        </div>
      </aside>

      <nav
        aria-busy={Boolean(pendingHref)}
        aria-label="Navigasi workspace mobile"
        className="border-seraya-border-default bg-seraya-canvas/96 pointer-events-auto fixed inset-x-0 bottom-0 isolate z-[80] flex min-h-[4.65rem] items-stretch border-t px-1 pt-1 pb-[max(0.3rem,env(safe-area-inset-bottom))] shadow-[0_-12px_35px_rgb(56_39_33_/_0.07)] backdrop-blur-xl lg:hidden"
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
