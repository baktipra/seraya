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
      {actions ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  );
}

const metricGridClasses = {
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
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
      className={`border-seraya-border-default grid border-y ${metricGridClasses[columns]}`}
      data-operational-metrics
    >
      {children}
    </dl>
  );
}

export function OperationalMetric({
  detail,
  label,
  value,
}: {
  detail?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border-seraya-border-default min-w-0 border-b px-0 py-4 sm:px-5 lg:border-r lg:border-b-0 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
      <dt className="text-seraya-text-muted text-[0.625rem] font-semibold tracking-[0.15em] uppercase">
        {label}
      </dt>
      <dd className="text-seraya-text-primary mt-1.5 font-serif text-[clamp(1.55rem,2.4vw,2.05rem)] leading-none font-medium tracking-[-0.025em] tabular-nums">
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
      <div className="border-seraya-border-default flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
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
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function OperationalToolbar({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-seraya-border-default bg-seraya-canvas grid gap-3 border-b p-3 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-4"
      data-operational-toolbar
    >
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
    <div className="px-5 py-10 text-center" data-operational-empty-state>
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
  status,
}: {
  actions: ReactNode;
  status: ReactNode;
}) {
  return (
    <div
      className="border-seraya-border-default bg-seraya-canvas sticky bottom-0 flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      data-operational-selection-bar
    >
      <div className="text-seraya-text-secondary text-sm">{status}</div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function OperationalLegacyBridge({
  children,
  kind,
}: {
  children: ReactNode;
  kind: 'delivery' | 'guests';
}) {
  return (
    <div
      className="min-w-0 [&>*]:mx-0 [&>*]:w-full [&>*]:max-w-none"
      data-operational-legacy-bridge={kind}
    >
      {children}
    </div>
  );
}
