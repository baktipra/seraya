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
    <div className="bg-seraya-canvas min-h-screen" data-dashboard-shell>
      <header
        className="border-seraya-border-subtle bg-seraya-surface/94 sticky top-0 z-[90] h-[var(--seraya-topbar-height)] border-b backdrop-blur-xl"
        data-dashboard-topbar
      >
        <div className="mx-auto flex h-full max-w-[var(--seraya-shell-max)] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <Link
              aria-label={`${siteConfig.name}, kembali ke semua undangan`}
              className="text-seraya-text-primary shrink-0 font-serif text-[1.65rem] leading-none font-medium tracking-[-0.04em] focus-visible:rounded-sm"
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
        className="mx-auto max-w-[var(--seraya-shell-max)] min-w-0 px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-24 lg:px-8 lg:py-9"
        data-dashboard-main
      >
        <div className={`mx-auto w-full ${isDashboardHome ? 'max-w-[76rem]' : ''}`}>
          {isDashboardHome ? (
            <>
              <section
                aria-labelledby="dashboard-home-title"
                className="border-seraya-border-subtle flex flex-col gap-7 border-b pb-10 sm:flex-row sm:items-end sm:justify-between lg:pb-12"
              >
                <div className="max-w-3xl">
                  <p className="seraya-eyebrow text-seraya-action-primary">Ruang undangan kalian</p>
                  <h1
                    className="text-seraya-text-primary mt-4 max-w-[50rem] font-serif text-[clamp(3rem,6vw,5rem)] leading-[0.9] font-medium tracking-[-0.05em]"
                    id="dashboard-home-title"
                  >
                    Selamat datang kembali{greetingName ? `, ${greetingName}` : ''}.
                  </h1>
                  <p className="text-seraya-text-secondary mt-5 max-w-xl text-base leading-7">
                    Lanjutkan undangan yang sedang berjalan atau mulai pengalaman baru dari koleksi
                    Seraya.
                  </p>
                </div>
                <form action="/dashboard/new" method="get">
                  <button
                    className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover active:bg-seraya-action-primary-pressed focus-visible:outline-seraya-focus-ring inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-[var(--seraya-radius-sm)] px-5 text-sm font-semibold shadow-[var(--seraya-shadow-level-1)] transition-[background-color,transform,box-shadow] duration-[var(--seraya-motion-default)] ease-[var(--seraya-ease-standard)] hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 sm:w-auto"
                    type="submit"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      +
                    </span>
                    Buat undangan
                  </button>
                </form>
              </section>

              <section aria-labelledby="dashboard-active-projects-title" className="pt-10 lg:pt-12">
                {hasActiveProject ? (
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="seraya-eyebrow" id="dashboard-active-projects-title">
                        Sedang berjalan
                      </p>
                      <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                        Buka undangan untuk melihat langkah berikutnya.
                      </p>
                    </div>
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
