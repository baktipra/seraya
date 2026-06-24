import type { Route } from 'next';
import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';

import { cn } from '@/lib/cn';

import {
  BillingIcon,
  GuestsIcon,
  HelpIcon,
  InvitationIcon,
  OverviewIcon,
  SettingsIcon,
  ShareIcon,
} from './dashboard-icons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type DashboardNavigationItem = {
  href: string;
  icon: IconComponent;
  label: string;
};

const primaryItems: DashboardNavigationItem[] = [
  { href: '/dashboard', icon: OverviewIcon, label: 'Overview' },
  { href: '/dashboard/coming-soon?feature=invitation', icon: InvitationIcon, label: 'Undangan' },
  { href: '/dashboard/coming-soon?feature=guests', icon: GuestsIcon, label: 'Tamu' },
  { href: '/dashboard/coming-soon?feature=share', icon: ShareIcon, label: 'Bagikan' },
];

const secondaryItems: DashboardNavigationItem[] = [
  { href: '/dashboard/coming-soon?feature=billing', icon: BillingIcon, label: 'Tagihan' },
  { href: '/dashboard/coming-soon?feature=settings', icon: SettingsIcon, label: 'Pengaturan' },
  { href: '/dashboard/coming-soon?feature=help', icon: HelpIcon, label: 'Bantuan' },
];

function NavigationLink({
  item,
  mode,
}: {
  item: DashboardNavigationItem;
  mode: 'desktop' | 'mobile';
}) {
  const Icon = item.icon;
  const overview = item.href === '/dashboard';

  return (
    <Link
      aria-current={overview ? 'page' : undefined}
      className={cn(
        'focus-visible:outline-seraya-focus-ring transition-colors focus-visible:outline-3 focus-visible:outline-offset-2',
        mode === 'desktop'
          ? cn(
              'flex min-h-11 items-center gap-3 rounded-[var(--seraya-radius-md)] px-3 text-sm font-medium',
              overview
                ? 'bg-seraya-brand-soft text-seraya-action-primary'
                : 'text-seraya-text-secondary hover:bg-seraya-soft hover:text-seraya-text-primary',
            )
          : cn(
              'text-seraya-text-muted flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--seraya-radius-sm)] px-1 text-[0.6875rem] font-semibold',
              overview
                ? 'text-seraya-action-primary'
                : 'hover:bg-seraya-soft hover:text-seraya-text-primary',
            ),
      )}
      href={item.href as Route}
      prefetch={false}
    >
      <Icon className={mode === 'desktop' ? 'size-[1.1rem]' : 'size-5'} />
      <span>{item.label}</span>
    </Link>
  );
}

export function DashboardDesktopNavigation() {
  return (
    <nav aria-label="Navigasi dashboard" className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-1">
        {primaryItems.map((item) => (
          <NavigationLink item={item} key={item.label} mode="desktop" />
        ))}
      </div>
      <div className="border-seraya-border-default mt-auto border-t pt-4">
        <div className="space-y-1">
          {secondaryItems.map((item) => (
            <NavigationLink item={item} key={item.label} mode="desktop" />
          ))}
        </div>
      </div>
    </nav>
  );
}

export function DashboardMobileNavigation() {
  return (
    <nav
      aria-label="Navigasi utama dashboard"
      className="border-seraya-border-default bg-seraya-surface fixed inset-x-0 bottom-0 z-30 flex min-h-[4.5rem] items-stretch border-t px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(43_37_35_/_0.05)] md:hidden"
    >
      {primaryItems.map((item) => (
        <NavigationLink item={item} key={item.label} mode="mobile" />
      ))}
    </nav>
  );
}
