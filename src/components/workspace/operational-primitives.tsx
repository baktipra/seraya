import type { ReactNode } from 'react';

import styles from './operational-workspace-premium.module.css';

export function OperationalWorkspace({
  children,
  labelledBy,
}: {
  children: ReactNode;
  labelledBy: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`${styles.workspace} grid min-w-0 gap-[var(--seraya-workspace-flow-gap-compact)]`}
      data-operational-workspace
    >
      {children}
    </section>
  );
}

export function OperationalHeader({
  actions,
  description,
  eyebrow,
  title,
  titleId,
}: {
  actions?: ReactNode;
  description: ReactNode;
  eyebrow: string;
  title: ReactNode;
  titleId: string;
}) {
  return (
    <header
      className="grid min-w-0 gap-5 pb-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      data-operational-header
    >
      <div className="min-w-0">
        <p className="text-seraya-text-muted text-xs leading-5 font-medium">{eyebrow}</p>
        <h1 className="seraya-operational-title mt-1.5 max-w-[46rem]" id={titleId}>
          {title}
        </h1>
        <div className="text-seraya-text-secondary mt-2.5 max-w-3xl text-sm leading-6">
          {description}
        </div>
      </div>
      {actions ? (
        <div
          aria-label="Aksi halaman"
          className="flex shrink-0 flex-wrap gap-2 sm:justify-end"
          data-operational-header-actions
          role="group"
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

const metricGridClasses = {
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
} as const;

export function OperationalMetricStrip({
  children,
  columns = 4,
  label,
}: {
  children: ReactNode;
  columns?: keyof typeof metricGridClasses;
  label: string;
}) {
  return (
    <dl
      aria-label={label}
      className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${metricGridClasses[columns]}`}
      data-columns={columns}
      data-operational-metrics
    >
      {children}
    </dl>
  );
}

export function OperationalMetric({
  detail,
  label,
  mobileSpan = 'single',
  value,
}: {
  detail?: ReactNode;
  label: string;
  mobileSpan?: 'full' | 'single';
  value: ReactNode;
}) {
  return (
    <div
      className="border-seraya-border-subtle bg-seraya-surface-subtle min-w-0 rounded-[var(--seraya-radius-lg)] border px-3.5 py-3.5 sm:px-4 sm:py-4"
      data-mobile-span={mobileSpan}
      data-operational-metric
    >
      <dt className="text-seraya-text-muted text-xs leading-5 font-medium">{label}</dt>
      <dd className="seraya-metric-value mt-1.5">{value}</dd>
      {detail ? (
        <dd className="text-seraya-text-muted mt-1.5 max-w-[18rem] text-xs leading-5">
          {detail}
        </dd>
      ) : null}
    </div>
  );
}

export function OperationalSection({
  actions,
  children,
  description,
  title,
  titleId,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  title: ReactNode;
  titleId: string;
}) {
  return (
    <section aria-labelledby={titleId} className="grid min-w-0 gap-4" data-operational-section>
      <div
        className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        data-operational-section-heading
      >
        <div className="min-w-0">
          <h2 className="seraya-operational-section-title" id={titleId}>
            {title}
          </h2>
          {description ? (
            <div className="text-seraya-text-secondary mt-1.5 max-w-3xl text-sm leading-6">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div
            aria-label="Aksi bagian"
            className="flex min-w-0 shrink-0 flex-wrap gap-2"
            data-operational-section-actions
            role="group"
          >
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function OperationalToolbar({
  children,
  label = 'Cari dan filter data',
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      aria-label={label}
      className="border-seraya-border-subtle bg-seraya-surface-subtle grid gap-3 rounded-[var(--seraya-radius-lg)] border p-3 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-3.5"
      data-operational-toolbar
      role="search"
    >
      {children}
    </div>
  );
}

export function OperationalToolbarField({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="min-w-0" data-operational-toolbar-field>
      <label className="seraya-field-label mb-1.5" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function OperationalDataSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-seraya-border-subtle bg-seraya-surface min-w-0 overflow-hidden rounded-[var(--seraya-radius-lg)] border shadow-[var(--seraya-shadow-level-1)]"
      data-operational-data-surface
    >
      {children}
    </div>
  );
}

export function OperationalDesktopData({
  children,
  label = 'Tabel data',
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      aria-label={label}
      className="focus-visible:outline-seraya-focus-ring hidden min-w-0 overflow-x-auto focus-visible:outline-3 focus-visible:outline-offset-[-3px] md:block"
      data-operational-desktop-data
      role="region"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export function OperationalMobileDataList({
  children,
  label = 'Daftar data',
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <ul
      aria-label={label}
      className="bg-seraya-canvas grid gap-2.5 p-2.5 md:hidden"
      data-operational-mobile-list
    >
      {children}
    </ul>
  );
}

export function OperationalMobileDataCard({
  children,
  identity,
  status,
}: {
  children: ReactNode;
  identity: ReactNode;
  status?: ReactNode;
}) {
  return (
    <li
      className="border-seraya-border-subtle bg-seraya-surface rounded-[var(--seraya-radius-md)] border px-3.5 py-3.5"
      data-operational-mobile-card
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">{identity}</div>
        {status ? <div className="min-w-0 shrink-0">{status}</div> : null}
      </div>
      {children}
    </li>
  );
}

export function OperationalMobileField({
  align = 'start',
  label,
  value,
}: {
  align?: 'end' | 'start';
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={align === 'end' ? 'text-right' : undefined} data-operational-mobile-field>
      <dt className="text-seraya-text-muted text-xs leading-5 font-medium">{label}</dt>
      <dd className="text-seraya-text-secondary mt-0.5 text-xs leading-5">{value}</dd>
    </div>
  );
}

export function OperationalResponsiveList({
  children,
  label = 'Daftar data',
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <ul
      aria-label={label}
      className="divide-seraya-border-subtle divide-y"
      data-operational-responsive-list
    >
      {children}
    </ul>
  );
}

export function OperationalResponsiveRow({
  action,
  children,
}: {
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <li
      className="hover:bg-seraya-surface-subtle grid min-w-0 gap-3 px-4 py-4 transition-colors duration-[var(--seraya-motion-default)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
      data-operational-responsive-row
    >
      <div className="min-w-0">{children}</div>
      <div
        className="text-seraya-action-primary min-w-0 text-sm font-semibold"
        data-operational-row-action
      >
        {action}
      </div>
    </li>
  );
}

export function OperationalEmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="px-5 py-12 text-center"
      data-operational-empty-state
      role="status"
    >
      {icon ? (
        <div className="bg-seraya-surface-subtle text-seraya-text-muted mx-auto mb-4 grid size-10 place-items-center rounded-full">
          {icon}
        </div>
      ) : null}
      <p className="text-seraya-text-primary text-base leading-6 font-semibold">{title}</p>
      <div className="text-seraya-text-muted mx-auto mt-1.5 max-w-xl text-sm leading-6">
        {description}
      </div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function OperationalSelectionBar({
  actions,
  label = 'Aksi item terpilih',
  status,
}: {
  actions: ReactNode;
  label?: string;
  status: ReactNode;
}) {
  return (
    <div
      aria-label={label}
      className="border-seraya-border-subtle bg-seraya-surface-raised sticky bottom-3 z-20 mx-2 flex flex-col gap-3 rounded-[var(--seraya-radius-lg)] border px-4 py-3 shadow-[var(--seraya-shadow-level-2)] sm:mx-3 sm:flex-row sm:items-center sm:justify-between"
      data-operational-selection-bar
      role="region"
    >
      <div
        aria-atomic="true"
        aria-live="polite"
        className="text-seraya-text-secondary text-sm"
        data-operational-selection-status
        role="status"
      >
        {status}
      </div>
      <div
        aria-label="Tindakan pilihan"
        className="flex flex-wrap gap-2"
        data-operational-selection-actions
        role="group"
      >
        {actions}
      </div>
    </div>
  );
}

export function OperationalSkeleton({
  className = '',
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`bg-seraya-sand/70 block animate-pulse rounded-[var(--seraya-radius-sm)] ${className}`}
      data-operational-skeleton
    />
  );
}

export function OperationalLoadingState({
  label = 'Memuat data',
  rows = 4,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="border-seraya-border-subtle bg-seraya-surface overflow-hidden rounded-[var(--seraya-radius-lg)] border"
      data-operational-loading-state
      role="status"
    >
      <div className="border-seraya-border-subtle bg-seraya-surface-subtle grid gap-2 border-b p-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
        <OperationalSkeleton className="h-10 w-full" />
        <OperationalSkeleton className="h-10 w-full" />
      </div>
      <div className="divide-seraya-border-subtle divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_9rem]" key={index}>
            <div className="grid gap-2">
              <OperationalSkeleton className="h-4 w-2/5" />
              <OperationalSkeleton className="h-3 w-3/5" />
            </div>
            <OperationalSkeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
