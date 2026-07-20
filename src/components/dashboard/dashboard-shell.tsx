import Link from 'next/link';
import type { ReactNode } from 'react';

import { siteConfig } from '@/config/site';

import { AccountMenu } from './account-menu';
import { DashboardDesktopNavigation } from './dashboard-navigation';

export interface DashboardShellProps {
  children: ReactNode;
  displayName?: string | null;
  email: string | null | undefined;
  hasActiveProject: boolean;
}

export function DashboardShell({
  children,
  displayName,
  email,
  hasActiveProject,
}: DashboardShellProps) {
  const contextLabel = hasActiveProject ? 'Workspace proyek' : 'Ruang undangan';

  return (
    <div className="bg-seraya-canvas min-h-screen">
      <header className="border-seraya-border-default bg-seraya-canvas/95 sticky top-0 z-40 h-16 border-b backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 lg:gap-6">
            <Link
              className="text-seraya-text-primary shrink-0 font-serif text-[1.75rem] leading-none font-medium tracking-[-0.025em] focus-visible:rounded-sm"
              href="/dashboard"
            >
              {siteConfig.name}
            </Link>
            <span
              aria-hidden="true"
              className="bg-seraya-border-default hidden h-5 w-px sm:block"
            />
            <p className="seraya-eyebrow hidden truncate lg:block">{contextLabel}</p>
            <DashboardDesktopNavigation />
          </div>
          <AccountMenu displayName={displayName} email={email} />
        </div>
      </header>

      <main className="mx-auto max-w-[90rem] min-w-0 px-4 py-7 pb-24 sm:px-6 sm:py-10 sm:pb-24 lg:px-8 lg:py-12">
        <div className="seraya-dashboard-content mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
