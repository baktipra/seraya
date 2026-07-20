import Link from 'next/link';

/**
 * Global dashboard navigation stays deliberately small: project-specific work
 * belongs to the project rail, while these links only switch or create a project.
 */
export function DashboardDesktopNavigation() {
  return (
    <nav aria-label="Navigasi undangan" className="hidden items-center gap-1 sm:flex">
      <Link
        className="text-seraya-text-secondary hover:bg-seraya-soft hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-9 items-center rounded-[var(--seraya-radius-sm)] px-3 text-sm font-medium transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
        href="/dashboard"
        prefetch={false}
      >
        Semua undangan
      </Link>
      <Link
        className="border-seraya-border-strong bg-seraya-surface text-seraya-text-primary hover:bg-seraya-soft focus-visible:outline-seraya-focus-ring inline-flex min-h-9 items-center rounded-[var(--seraya-radius-sm)] border px-3 text-sm font-medium transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
        href="/dashboard/new"
        prefetch={false}
      >
        Buat undangan
      </Link>
    </nav>
  );
}
