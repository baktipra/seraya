'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';

import {
  FollowUpIcon,
  GuestsIcon,
  HelpIcon,
  InvitationIcon,
  OverviewIcon,
  ShareIcon,
} from './dashboard-icons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type ProjectNavigationItem = {
  href: Route;
  icon: IconComponent;
  label: string;
  mobileLabel?: string;
};

/**
 * The owner workspace follows one stable journey. Individual pages still own
 * their access/unavailable states; keeping the path visible prevents the
 * workspace from feeling like a collection of conditionally hidden tools.
 */
function getProjectNavigationItems(projectId: string): ProjectNavigationItem[] {
  const base = `/dashboard/${projectId}`;

  return [
    { href: base as Route, icon: OverviewIcon, label: 'Ringkasan' },
    { href: `${base}/invitation` as Route, icon: InvitationIcon, label: 'Undangan' },
    { href: `${base}/guests` as Route, icon: GuestsIcon, label: 'Tamu' },
    { href: `${base}/delivery` as Route, icon: ShareIcon, label: 'Bagikan' },
    {
      href: `${base}/rsvp` as Route,
      icon: HelpIcon,
      label: 'Respons Tamu',
      mobileLabel: 'Respons',
    },
    {
      href: `${base}/follow-up` as Route,
      icon: FollowUpIcon,
      label: 'Tindak Lanjut',
      mobileLabel: 'Lanjut',
    },
  ];
}

function isCurrentProjectRoute(pathname: string, item: ProjectNavigationItem, projectId: string) {
  const projectRoot = `/dashboard/${projectId}`;
  return item.href === projectRoot ? pathname === projectRoot : pathname.startsWith(item.href);
}

function ProjectNavigationLink({
  active,
  item,
  mode,
}: {
  active: boolean;
  item: ProjectNavigationItem;
  mode: 'desktop' | 'mobile';
}) {
  const Icon = item.icon;

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={
        mode === 'desktop'
          ? `focus-visible:outline-seraya-focus-ring flex min-h-11 items-center gap-3 rounded-[var(--seraya-radius-sm)] px-3 text-sm font-medium transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 ${
              active
                ? 'bg-seraya-soft text-seraya-action-primary'
                : 'text-seraya-text-secondary hover:bg-seraya-soft/70 hover:text-seraya-text-primary'
            }`
          : `focus-visible:outline-seraya-focus-ring relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[0.625rem] font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 ${
              active ? 'text-seraya-action-primary' : 'text-seraya-text-muted'
            }`
      }
      href={item.href}
      prefetch={false}
    >
      {mode === 'mobile' && active ? (
        <span className="bg-seraya-action-primary absolute inset-x-3 top-0 h-0.5" />
      ) : null}
      <Icon className={mode === 'desktop' ? 'size-4' : 'size-[1.05rem]'} strokeWidth={1.6} />
      <span className={mode === 'mobile' ? 'max-w-full truncate' : undefined}>
        {mode === 'mobile' ? (item.mobileLabel ?? item.label) : item.label}
      </span>
      {mode === 'desktop' && active ? (
        <span className="bg-seraya-action-primary ml-auto size-1.5 rounded-full" />
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

  return (
    <>
      <aside className="border-seraya-border-default hidden min-w-0 border-r pr-6 lg:sticky lg:top-24 lg:flex lg:h-[calc(100vh-7rem)] lg:w-60 lg:flex-col">
        <div className="px-2 pt-1">
          <p className="seraya-eyebrow">Proyek</p>
          <p className="text-seraya-text-primary mt-2 font-serif text-xl leading-tight font-medium tracking-[-0.015em]">
            {coupleLabel}
          </p>
          <p className="text-seraya-text-muted mt-1.5 text-xs leading-5">{statusLabel}</p>
        </div>
        <nav aria-label="Navigasi workspace" className="mt-7 space-y-1">
          {items.map((item) => (
            <ProjectNavigationLink
              active={isCurrentProjectRoute(pathname, item, projectId)}
              item={item}
              key={item.label}
              mode="desktop"
            />
          ))}
        </nav>
        <div className="border-seraya-border-default mt-auto border-t px-2 pt-5 pb-2">
          <Link
            className="text-seraya-text-muted hover:text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center text-sm font-medium transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
            href="/dashboard"
            prefetch={false}
          >
            ← Semua undangan
          </Link>
        </div>
      </aside>

      <nav
        aria-label="Navigasi workspace mobile"
        className="border-seraya-border-default bg-seraya-canvas/95 fixed inset-x-0 bottom-0 z-30 flex min-h-[4.5rem] items-stretch border-t px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
      >
        {items.map((item) => (
          <ProjectNavigationLink
            active={isCurrentProjectRoute(pathname, item, projectId)}
            item={item}
            key={item.label}
            mode="mobile"
          />
        ))}
      </nav>
    </>
  );
}
