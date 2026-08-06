'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

function getDashboardGreetingName(displayName?: string | null, email?: string | null) {
  const profileName = displayName?.trim();

  if (profileName) {
    return profileName.split(/\s+/)[0];
  }

  const emailName = email?.split('@')[0]?.trim();
  return emailName || null;
}

export function DashboardShell({
  children,
  displayName,
  email,
  hasActiveProject,
}: DashboardShellProps) {
  const pathname = usePathname();
  const isDashboardHome = pathname === '/dashboard';
  const greetingName = getDashboardGreetingName(displayName, email);

  return (
    <div
      className="bg-seraya-canvas min-h-screen w-full font-sans"
      data-dashboard-full-screen
      data-dashboard-shell
      data-owner-workspace-navigation="three-intent"
      data-owner-workspace-typography="sans"
    >
      <header
        className="border-seraya-border-subtle bg-seraya-surface/96 sticky top-0 z-[90] h-[var(--seraya-topbar-height)] border-b backdrop-blur-xl"
        data-dashboard-topbar
      >
        <div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-7 xl:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <Link
              aria-label={`${siteConfig.name}, kembali ke semua undangan`}
              className="text-seraya-text-primary shrink-0 font-serif text-[1.55rem] leading-none font-medium tracking-[-0.04em] focus-visible:rounded-sm"
              href="/dashboard"
            >
              {siteConfig.name}
            </Link>
            <span
              aria-hidden="true"
              className="bg-seraya-border-default hidden h-5 w-px sm:block"
            />
            <DashboardDesktopNavigation />
          </div>
          <AccountMenu displayName={displayName} email={email} />
        </div>
      </header>

      <main
        className="w-full min-w-0 px-3 py-4 pb-24 sm:px-5 sm:py-5 sm:pb-24 lg:px-6 lg:py-6 xl:px-7"
        data-dashboard-main
      >
        <div className="w-full min-w-0">
          {isDashboardHome ? (
            <>
              <section
                aria-labelledby="dashboard-home-title"
                className="border-seraya-border-subtle flex flex-col gap-6 border-b pb-7 sm:flex-row sm:items-end sm:justify-between lg:pb-8"
              >
                <div className="max-w-3xl">
                  <p className="text-seraya-text-muted text-sm font-medium">
                    {greetingName ? `Halo, ${greetingName}` : 'Dashboard Seraya'}
                  </p>
                  <h1
                    className="text-seraya-text-primary mt-2 max-w-[50rem] text-[clamp(2rem,4vw,3.35rem)] leading-[1.02] font-bold tracking-[-0.045em]"
                    id="dashboard-home-title"
                  >
                    Undangan kalian
                  </h1>
                  <p className="text-seraya-text-secondary mt-3 max-w-xl text-sm leading-6 sm:text-base sm:leading-7">
                    Pilih undangan yang ingin dilanjutkan. Tidak ada ringkasan rumit sebelum kalian
                    mulai bekerja.
                  </p>
                </div>
                <form action="/dashboard/new" method="get">
                  <button
                    className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover active:bg-seraya-action-primary-pressed focus-visible:outline-seraya-focus-ring inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-[var(--seraya-radius-md)] px-5 text-sm font-semibold transition-[background-color,transform] duration-[var(--seraya-motion-default)] ease-[var(--seraya-ease-standard)] hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 sm:w-auto"
                    type="submit"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      +
                    </span>
                    Buat undangan
                  </button>
                </form>
              </section>

              <section aria-labelledby="dashboard-active-projects-title" className="pt-7 lg:pt-8">
                {hasActiveProject ? (
                  <div className="mb-4">
                    <h2
                      className="text-seraya-text-primary text-sm font-semibold"
                      id="dashboard-active-projects-title"
                    >
                      Pilih undangan
                    </h2>
                  </div>
                ) : null}
                {children}
              </section>
            </>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
