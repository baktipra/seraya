import Link from 'next/link';

/**
 * Global dashboard navigation deliberately stays small: it is a project
 * launcher/switcher, not a second feature menu for the currently open project.
 */
export function DashboardDesktopNavigation() {
  return (
    <nav aria-label="Navigasi undangan" className="space-y-1">
      <Link
        className="bg-seraya-brand-soft text-seraya-action-primary focus-visible:outline-seraya-focus-ring flex min-h-11 items-center rounded-[var(--seraya-radius-md)] px-3 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2"
        href="/dashboard"
        prefetch={false}
      >
        Semua undangan
      </Link>
      <Link
        className="text-seraya-text-secondary hover:bg-seraya-soft hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring flex min-h-11 items-center rounded-[var(--seraya-radius-md)] px-3 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
        href="/dashboard/new"
        prefetch={false}
      >
        Buat undangan
      </Link>
    </nav>
  );
}
