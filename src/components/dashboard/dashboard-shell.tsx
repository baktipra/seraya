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
  const contextLabel = hasActiveProject ? 'Workspace proyek' : 'Ruang undangan';
  const greetingName = getDashboardGreetingName(displayName, email);

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
        <div
          className={`seraya-dashboard-content mx-auto w-full ${
            isDashboardHome ? 'seraya-dashboard-home' : ''
          }`}
        >
          {isDashboardHome ? (
            <>
              <section
                aria-labelledby="dashboard-home-title"
                className="flex flex-col gap-7 border-b border-[var(--seraya-border-default)] pb-10 sm:flex-row sm:items-end sm:justify-between lg:pb-12"
              >
                <div className="max-w-3xl">
                  <p className="seraya-eyebrow text-seraya-action-primary">Ruang proyek</p>
                  <h1
                    className="text-seraya-text-primary mt-3 max-w-[48rem] font-serif text-[clamp(2.7rem,6vw,4.4rem)] leading-[0.98] font-medium tracking-[-0.035em]"
                    id="dashboard-home-title"
                  >
                    Selamat datang kembali{greetingName ? `, ${greetingName}` : ''}.
                  </h1>
                  <p className="text-seraya-text-secondary mt-4 max-w-xl text-base leading-7">
                    Semua persiapan pernikahan kalian ada di satu tempat yang tenang. Buka proyek
                    untuk melanjutkan.
                  </p>
                </div>
                <form action="/dashboard/new" method="get">
                  <button
                    className="border-seraya-border-strong bg-seraya-surface text-seraya-text-primary hover:border-seraya-action-primary hover:text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--seraya-radius-sm)] border px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                    type="submit"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      +
                    </span>
                    Proyek baru
                  </button>
                </form>
              </section>

              <section
                aria-labelledby="dashboard-active-projects-title"
                className="pt-10 lg:pt-12"
              >
                {hasActiveProject ? (
                  <p className="seraya-eyebrow" id="dashboard-active-projects-title">
                    Sedang berjalan
                  </p>
                ) : null}
                <div className={hasActiveProject ? 'mt-4' : undefined}>{children}</div>
              </section>

              <section
                aria-labelledby="dashboard-archive-title"
                className="border-seraya-border-default mt-14 border-t pt-9 lg:mt-16 lg:pt-10"
              >
                <p className="seraya-eyebrow" id="dashboard-archive-title">
                  Arsip
                </p>
                <p className="text-seraya-text-muted mt-3 max-w-lg text-sm leading-6">
                  Kalian belum memiliki proyek arsip. Proyek yang sudah selesai akan disimpan di
                  sini agar tetap dapat diakses.
                </p>
              </section>
            </>
          ) : (
            children
          )}
        </div>
      </main>

      <style>{`
        nav[aria-label='Navigasi workspace mobile'] > a > span:last-child {
          display: block;
          width: 100%;
          text-align: center !important;
          line-height: 1.15;
        }

        .seraya-dashboard-home {
          max-width: 72rem;
        }

        .seraya-dashboard-home section[aria-labelledby='project-launcher-title'] {
          width: 100%;
          max-width: none;
        }

        .seraya-dashboard-home
          section[aria-labelledby='project-launcher-title']
          > div:first-child {
          display: none;
        }

        .seraya-dashboard-home
          section[aria-labelledby='project-launcher-title']
          > div:last-child {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 1rem;
        }

        .seraya-dashboard-home [aria-label^='Project '] {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          overflow: hidden;
          border: 1px solid var(--seraya-border-default) !important;
          border-radius: 0 !important;
          background: var(--seraya-bg-surface) !important;
          box-shadow: none !important;
          transition:
            border-color 160ms ease,
            transform 160ms ease;
        }

        .seraya-dashboard-home [aria-label^='Project ']::before {
          position: absolute;
          inset-block: 0;
          left: 0;
          width: 2px;
          background: transparent;
          content: '';
          transition: background 160ms ease;
        }

        .seraya-dashboard-home [aria-label^='Project ']:hover {
          border-color: var(--seraya-border-strong) !important;
          transform: translateY(-1px);
        }

        .seraya-dashboard-home [aria-label^='Project ']:hover::before {
          background: var(--seraya-action-primary);
        }

        .seraya-dashboard-home [aria-label^='Project '] > div:first-child {
          min-width: 0;
          gap: 0.75rem !important;
          border: 0 !important;
          padding: 1.35rem 1.25rem !important;
        }

        .seraya-dashboard-home [aria-label^='Project '] > div:first-child h2 {
          font-family: var(--font-editorial) !important;
          font-size: clamp(1.75rem, 4vw, 2.25rem) !important;
          font-weight: 500 !important;
          line-height: 1 !important;
          letter-spacing: -0.025em !important;
        }

        .seraya-dashboard-home [aria-label^='Project '] > div:first-child > div:first-child {
          align-items: center !important;
        }

        .seraya-dashboard-home [aria-label^='Project '] > div:first-child > p {
          color: var(--seraya-text-muted) !important;
          font-size: 0.875rem !important;
          line-height: 1.5rem !important;
        }

        .seraya-dashboard-home [aria-label^='Project '] > div:last-child {
          display: flex;
          align-items: center;
          border-top: 1px solid var(--seraya-border-default);
          padding: 1rem 1.25rem !important;
        }

        .seraya-dashboard-home [aria-label^='Project '] > div:last-child form {
          width: 100%;
        }

        .seraya-dashboard-home [aria-label^='Project '] > div:last-child button {
          width: 100%;
          min-height: 2.75rem;
          justify-content: space-between;
          border: 0 !important;
          background: transparent !important;
          color: var(--seraya-action-primary) !important;
          padding-inline: 0 !important;
          box-shadow: none !important;
          font-size: 0;
        }

        .seraya-dashboard-home [aria-label^='Project '] > div:last-child button::before {
          font-size: 0.875rem;
          font-weight: 650;
          content: 'Buka proyek';
        }

        .seraya-dashboard-home [aria-label^='Project '] > div:last-child button::after {
          font-size: 1rem;
          content: '→';
          transition: transform 160ms ease;
        }

        .seraya-dashboard-home [aria-label^='Project ']:hover > div:last-child button::after {
          transform: translateX(0.2rem);
        }

        @media (min-width: 768px) {
          .seraya-dashboard-home [aria-label^='Project '] {
            grid-template-columns: minmax(0, 1fr) 11rem;
            align-items: stretch;
          }

          .seraya-dashboard-home [aria-label^='Project '] > div:first-child {
            padding: 1.75rem 2rem !important;
          }

          .seraya-dashboard-home [aria-label^='Project '] > div:last-child {
            border-top: 0;
            border-left: 1px solid var(--seraya-border-default);
            padding: 1.5rem !important;
          }
        }

        @media (max-width: 639px) {
          .seraya-dashboard-home section[aria-labelledby='dashboard-home-title'] form,
          .seraya-dashboard-home section[aria-labelledby='dashboard-home-title'] button {
            width: 100%;
          }

          .seraya-dashboard-home [aria-label^='Project '] > div:first-child > div:first-child {
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}
