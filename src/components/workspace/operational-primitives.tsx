import type { ReactNode } from 'react';

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
      className="grid min-w-0 gap-6 sm:gap-7"
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
      className="border-seraya-border-default grid min-w-0 gap-5 border-b pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:pb-7"
      data-operational-header
    >
      <div className="min-w-0">
        <p className="text-seraya-action-primary text-[0.6875rem] font-semibold tracking-[0.17em] uppercase">
          {eyebrow}
        </p>
        <h1
          className="text-seraya-text-primary mt-1.5 max-w-[46rem] font-serif text-[clamp(2.65rem,5vw,4rem)] leading-[0.96] font-medium tracking-[-0.035em]"
          id={titleId}
        >
          {title}
        </h1>
        <div className="text-seraya-text-secondary mt-3 max-w-3xl text-sm leading-6">
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
      className={`border-seraya-border-default bg-seraya-border-default grid grid-cols-2 gap-px border-y ${metricGridClasses[columns]}`}
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
      className="bg-seraya-surface min-w-0 px-3 py-3.5 sm:px-5 sm:py-4"
      data-mobile-span={mobileSpan}
      data-operational-metric
    >
      <dt className="text-seraya-text-muted text-[0.625rem] font-semibold tracking-[0.15em] uppercase">
        {label}
      </dt>
      <dd className="text-seraya-text-primary mt-1.5 font-serif text-[clamp(1.45rem,2.4vw,2.05rem)] leading-none font-medium tracking-[-0.025em] tabular-nums">
        {value}
      </dd>
      {detail ? (
        <dd className="text-seraya-text-muted mt-1.5 max-w-[18rem] text-[0.6875rem] leading-4">
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
        className="border-seraya-border-default flex min-w-0 flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between"
        data-operational-section-heading
      >
        <div className="min-w-0">
          <h2
            className="text-seraya-text-primary font-serif text-[clamp(1.65rem,3vw,2.15rem)] leading-tight font-medium tracking-[-0.025em]"
            id={titleId}
          >
            {title}
          </h2>
          {description ? (
            <div className="text-seraya-text-secondary mt-1 max-w-3xl text-sm leading-6">
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
      className="border-seraya-border-default bg-seraya-canvas grid gap-3 border-b p-3 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-4"
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
      <label
        className="text-seraya-text-muted mb-1.5 block text-[0.625rem] font-semibold tracking-[0.12em] uppercase"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function OperationalDataSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-seraya-border-default bg-seraya-surface min-w-0 overflow-hidden border"
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
      className="divide-seraya-border-default divide-y md:hidden"
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
    <li className="px-3.5 py-3.5" data-operational-mobile-card>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">{identity}</div>
        {status ? <div className="shrink-0">{status}</div> : null}
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
      <dt className="text-seraya-text-muted text-[0.625rem] font-semibold tracking-[0.1em] uppercase">
        {label}
      </dt>
      <dd className="text-seraya-text-secondary mt-1 text-xs leading-5">{value}</dd>
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
      className="divide-seraya-border-default divide-y"
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
      className="grid min-w-0 gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
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
  title,
}: {
  action?: ReactNode;
  description: ReactNode;
  title: ReactNode;
}) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="px-5 py-10 text-center"
      data-operational-empty-state
      role="status"
    >
      <p className="text-seraya-text-primary font-semibold">{title}</p>
      <div className="text-seraya-text-muted mx-auto mt-2 max-w-xl text-sm leading-6">
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
      className="border-seraya-border-default bg-seraya-canvas sticky bottom-0 z-20 flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
