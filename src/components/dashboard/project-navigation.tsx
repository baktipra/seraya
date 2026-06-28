import type { Route } from 'next';
import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';

import { GuestsIcon, HelpIcon, InvitationIcon, OverviewIcon, ShareIcon } from './dashboard-icons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type ProjectNavigationItem = {
  href: Route;
  icon: IconComponent;
  label: string;
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
    { href: `${base}/rsvp` as Route, icon: HelpIcon, label: 'Respons Tamu' },
  ];
}

function ProjectNavigationLink({
  item,
  mode,
}: {
  item: ProjectNavigationItem;
  mode: 'desktop' | 'mobile';
}) {
  const Icon = item.icon;

  return (
    <Link
      className={
        mode === 'desktop'
          ? 'text-seraya-text-secondary hover:bg-seraya-soft hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center gap-2 rounded-[var(--seraya-radius-md)] px-3 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2'
          : 'text-seraya-text-muted hover:bg-seraya-soft hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--seraya-radius-sm)] px-1 text-[0.625rem] font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2'
      }
      href={item.href}
      prefetch={false}
    >
      <Icon className={mode === 'desktop' ? 'size-[1.05rem]' : 'size-[1.1rem]'} />
      <span className={mode === 'mobile' ? 'truncate' : undefined}>{item.label}</span>
    </Link>
  );
}

/** Server-rendered owner workspace navigation. Route authorization remains local to each page. */
export function ProjectNavigation({ projectId }: { projectId: string }) {
  const items = getProjectNavigationItems(projectId);

  return (
    <>
      <nav
        aria-label="Navigasi workspace"
        className="border-seraya-border-default bg-seraya-surface hidden rounded-[var(--seraya-radius-lg)] border p-2 shadow-[var(--seraya-shadow-soft)] md:flex md:flex-wrap md:items-center md:gap-1"
      >
        {items.map((item) => (
          <ProjectNavigationLink item={item} key={item.label} mode="desktop" />
        ))}
      </nav>
      <nav
        aria-label="Navigasi workspace mobile"
        className="border-seraya-border-default bg-seraya-surface fixed inset-x-0 bottom-0 z-30 flex min-h-[4.5rem] items-stretch border-t px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(43_37_35_/_0.05)] md:hidden"
      >
        {items.map((item) => (
          <ProjectNavigationLink item={item} key={item.label} mode="mobile" />
        ))}
      </nav>
    </>
  );
}
