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
  const contextLabel = hasActiveProject ? 'Ruang undangan' : 'Belum ada undangan';

  return (
    <div className="bg-seraya-canvas min-h-screen">
      <header className="border-seraya-border-default bg-seraya-surface sticky top-0 z-20 h-16 border-b">
        <div className="mx-auto flex h-full max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              className="text-seraya-text-primary shrink-0 font-serif text-2xl tracking-[-0.04em] focus-visible:rounded-sm"
              href="/dashboard"
            >
              {siteConfig.name}
            </Link>
            <span
              aria-hidden="true"
              className="bg-seraya-border-default hidden h-5 w-px sm:block"
            />
            <p className="text-seraya-text-secondary hidden truncate text-sm font-medium sm:block">
              {contextLabel}
            </p>
          </div>
          <AccountMenu displayName={displayName} email={email} />
        </div>
      </header>

      <div className="mx-auto flex max-w-[96rem]">
        <aside className="border-seraya-border-default bg-seraya-surface sticky top-16 hidden h-[calc(100vh-4rem)] w-52 shrink-0 border-r px-4 py-6 md:flex md:flex-col">
          <DashboardDesktopNavigation />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-7 pb-24 sm:px-6 sm:py-10 sm:pb-24 lg:px-10 lg:py-12">
          <div className="seraya-dashboard-content mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
