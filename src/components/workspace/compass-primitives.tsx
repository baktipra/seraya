import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function CompassWorkspace({
  children,
  labelledBy,
}: {
  children: ReactNode;
  labelledBy: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="grid min-w-0 gap-8 sm:gap-10"
      data-compass-workspace
    >
      {children}
    </section>
  );
}

export function CompassHeader({
  actions,
  description,
  eyebrow,
  status,
  title,
  titleId,
}: {
  actions?: ReactNode;
  description: ReactNode;
  eyebrow: string;
  status?: ReactNode;
  title: ReactNode;
  titleId: string;
}) {
  return (
    <header
      className="border-seraya-border-default min-w-0 border-b pb-6 sm:pb-7"
      data-compass-header
    >
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <p className="text-seraya-action-primary text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
            {eyebrow}
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <h1
              className="seraya-page-title min-w-0 text-[var(--seraya-type-page-title-mobile)] md:text-[var(--seraya-type-page-title)]"
              id={titleId}
            >
              {title}
            </h1>
            {status}
          </div>
          <div className="text-seraya-text-secondary mt-3 max-w-[45rem] text-[0.9375rem] leading-7">
            {description}
          </div>
        </div>
        {actions ? (
          <div className="flex min-w-0 shrink-0 flex-wrap gap-2" data-compass-header-actions>
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function CompassFocus({
  actionLabel,
  description,
  href,
  title,
  titleId,
}: {
  actionLabel: string;
  description: ReactNode;
  href: Route;
  title: ReactNode;
  titleId: string;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className="border-seraya-action-primary bg-seraya-brand-soft min-w-0 border-l-2 px-5 py-5 sm:px-6 sm:py-6"
      data-compass-focus
    >
      <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-seraya-action-primary text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
            Fokus berikutnya
          </p>
          <h2 className="seraya-display-sm mt-1.5" id={titleId}>
            {title}
          </h2>
          <div className="text-seraya-text-secondary mt-1.5 max-w-2xl text-sm leading-6">
            {description}
          </div>
        </div>
        <Link
          className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--seraya-radius-sm)] px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
          href={href}
        >
          {actionLabel}
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}

export function CompassSectionHeader({
  eyebrow,
  title,
  titleId,
}: {
  eyebrow: string;
  title: ReactNode;
  titleId: string;
}) {
  return (
    <div className="min-w-0" data-compass-section-heading>
      <p className="text-seraya-text-muted text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
        {eyebrow}
      </p>
      <h2 className="seraya-display-sm mt-1.5" id={titleId}>
        {title}
      </h2>
    </div>
  );
}

export function CompassProgressStrip({
  children,
  titleId,
}: {
  children: ReactNode;
  titleId: string;
}) {
  return (
    <section aria-labelledby={titleId} className="min-w-0" data-compass-progress>
      <CompassSectionHeader eyebrow="Posisi proyek" title="Progress singkat" titleId={titleId} />
      <dl className="border-seraya-border-default mt-4 grid min-w-0 border-y sm:grid-cols-2 md:grid-cols-4">
        {children}
      </dl>
    </section>
  );
}

export function CompassProgressItem({
  href,
  label,
  value,
}: {
  href: Route;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border-seraya-border-default min-w-0 border-b px-0 py-4 last:border-b-0 sm:px-4 md:min-h-[6.25rem] md:border-r md:border-b-0 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
      <dt className="text-seraya-text-muted text-[0.625rem] font-semibold tracking-[0.15em] uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 min-w-0">
        <Link
          className="text-seraya-text-primary hover:text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 max-w-full items-start font-serif text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.15] font-medium tracking-[-0.025em] transition-colors focus-visible:outline-3 focus-visible:outline-offset-3"
          href={href}
        >
          {value}
        </Link>
      </dd>
    </div>
  );
}

export function CompassAttentionList({
  children,
  titleId,
}: {
  children: ReactNode;
  titleId: string;
}) {
  return (
    <section aria-labelledby={titleId} className="min-w-0" data-compass-attention>
      <CompassSectionHeader eyebrow="Perlu dibereskan" title="Butuh perhatian Anda" titleId={titleId} />
      <ul className="border-seraya-border-default mt-4 min-w-0 divide-y border-y">{children}</ul>
    </section>
  );
}

export function CompassAttentionItem({
  actionLabel,
  description,
  href,
  section,
  title,
}: {
  actionLabel: string;
  description: ReactNode;
  href: Route;
  section: string;
  title: ReactNode;
}) {
  return (
    <li className="group grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-seraya-text-muted text-[0.625rem] font-semibold tracking-[0.14em] uppercase">
          {section}
        </p>
        <h3 className="text-seraya-text-primary mt-1 text-sm font-semibold">{title}</h3>
        <div className="text-seraya-text-secondary mt-0.5 text-sm leading-6">{description}</div>
      </div>
      <Link
        className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 shrink-0 items-center text-sm font-semibold underline-offset-4 group-hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
        href={href}
      >
        {actionLabel}
        <span aria-hidden="true" className="ml-2">
          →
        </span>
      </Link>
    </li>
  );
}

export function CompassClearState({ titleId }: { titleId: string }) {
  return (
    <section
      aria-labelledby={titleId}
      className="border-seraya-border-default min-w-0 border-y py-5"
      data-compass-clear-state
    >
      <p className="text-seraya-text-muted text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
        Perhatian
      </p>
      <h2 className="seraya-display-sm mt-1.5" id={titleId}>
        Tidak ada hal mendesak saat ini.
      </h2>
      <p className="text-seraya-text-secondary mt-1.5 text-sm leading-6">
        Gunakan fokus berikutnya di atas untuk melanjutkan perjalanan proyek.
      </p>
    </section>
  );
}
