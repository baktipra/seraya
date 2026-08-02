'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Global navigation only returns the owner to the project collection. Project
 * destinations remain exclusively owned by the persistent project rail.
 */
export function DashboardDesktopNavigation() {
  const pathname = usePathname();
  const active = pathname === '/dashboard';

  return (
    <nav aria-label="Navigasi undangan" className="hidden items-center sm:flex">
      <Link
        aria-current={active ? 'page' : undefined}
        className={`focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center rounded-[var(--seraya-radius-sm)] px-3 text-sm font-medium transition-colors duration-[var(--seraya-motion-default)] focus-visible:outline-3 focus-visible:outline-offset-2 ${
          active
            ? 'bg-seraya-brand-softer text-seraya-action-primary'
            : 'text-seraya-text-secondary hover:bg-seraya-surface-subtle hover:text-seraya-text-primary'
        }`}
        href="/dashboard"
        prefetch={false}
      >
        Semua undangan
      </Link>
    </nav>
  );
}
