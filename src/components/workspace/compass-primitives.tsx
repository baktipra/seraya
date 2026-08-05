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
      className="grid min-w-0 gap-6 sm:gap-8"
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
      className="border-seraya-border-subtle bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-xl)] border p-5 shadow-[var(--seraya-shadow-level-1)] sm:p-7"
      data-compass-header
    >
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-10">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <p className="text-seraya-text-muted text-xs font-medium">{eyebrow}</p>
            {status}
          </div>
          <h1
            className="seraya-page-title mt-3 min-w-0 text-[clamp(2.25rem,7vw,3.25rem)] md:text-[clamp(2.5rem,4vw,3.75rem)]"
            id={titleId}
          >
            {title}
          </h1>
          <div className="text-seraya-text-secondary mt-3 max-w-[43rem] text-[0.9375rem] leading-7">
            {description}
          </div>
        </div>
        {actions ? (
          <div
            aria-label="Akses undangan"
            className="flex min-w-0 flex-wrap gap-2 lg:justify-end"
            data-compass-header-actions
          >
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
  eyebrow = 'Fokus berikutnya',
  href,
  title,
  titleId,
}: {
  actionLabel: string;
  description: ReactNode;
  eyebrow?: string;
  href: Route;
  title: ReactNode;
  titleId: string;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className="border-seraya-border-subtle bg-seraya-brand-softer min-w-0 rounded-[var(--seraya-radius-xl)] border p-5 shadow-[var(--seraya-shadow-level-1)] sm:p-7"
      data-compass-focus
    >
      <div className="grid min-w-0 gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-seraya-action-primary text-xs font-semibold">{eyebrow}</p>
          <h2 className="seraya-heading-lg mt-2 max-w-2xl" id={titleId}>
            {title}
          </h2>
          <div className="text-seraya-text-secondary mt-2 max-w-2xl text-sm leading-6">
            {description}
          </div>
        </div>
        <Link
          className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--seraya-radius-sm)] px-4 text-sm font-semibold transition-[background-color,transform] duration-[var(--seraya-motion-default)] hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2"
          href={href}
        >
          {actionLabel}
          <span aria-hidden="true" className="ml-2 text-base leading-none">
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
      <p className="text-seraya-text-muted text-xs font-medium">{eyebrow}</p>
      <h2 className="seraya-heading-md mt-1.5" id={titleId}>
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
      <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">{children}</dl>
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
    <div className="border-seraya-border-subtle bg-seraya-surface-subtle min-w-0 rounded-[var(--seraya-radius-lg)] border p-4 sm:p-5">
      <dt className="text-seraya-text-muted text-xs font-medium">{label}</dt>
      <dd className="mt-2 min-w-0">
        <Link
          className="text-seraya-text-primary hover:text-seraya-action-primary focus-visible:outline-seraya-focus-ring group inline-flex min-h-11 max-w-full items-start gap-2 rounded-[var(--seraya-radius-sm)] text-[clamp(1.125rem,2vw,1.375rem)] leading-6 font-semibold tracking-[-0.025em] transition-colors focus-visible:outline-3 focus-visible:outline-offset-3"
          href={href}
        >
          <span className="min-w-0 break-words">{value}</span>
          <span
            aria-hidden="true"
            className="text-seraya-text-muted mt-px shrink-0 transition-transform duration-[var(--seraya-motion-default)] group-hover:translate-x-0.5"
          >
            →
          </span>
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
      <CompassSectionHeader
        eyebrow="Perlu dibereskan"
        title="Butuh perhatian Anda"
        titleId={titleId}
      />
      <ul className="border-seraya-border-subtle bg-seraya-surface divide-seraya-border-subtle mt-4 min-w-0 divide-y overflow-hidden rounded-[var(--seraya-radius-xl)] border shadow-[var(--seraya-shadow-level-1)]">
        {children}
      </ul>
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
    <li className="group grid min-w-0 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="min-w-0">
        <p className="text-seraya-action-primary text-xs font-medium">{section}</p>
        <h3 className="text-seraya-text-primary mt-1.5 text-sm font-semibold">{title}</h3>
        <div className="text-seraya-text-secondary mt-1 text-sm leading-6">{description}</div>
      </div>
      <Link
        className="text-seraya-action-primary hover:bg-seraya-brand-softer focus-visible:outline-seraya-focus-ring inline-flex min-h-10 shrink-0 items-center justify-center rounded-[var(--seraya-radius-sm)] px-3 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
        href={href}
      >
        {actionLabel}
        <span aria-hidden="true" className="ml-2 transition-transform group-hover:translate-x-0.5">
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
      className="border-seraya-border-subtle bg-seraya-status-success-soft min-w-0 rounded-[var(--seraya-radius-xl)] border p-5 sm:p-6"
      data-compass-clear-state
    >
      <p className="text-seraya-status-success text-xs font-semibold">Perhatian proyek</p>
      <h2 className="seraya-heading-sm mt-2" id={titleId}>
        Tidak ada hal mendesak saat ini.
      </h2>
      <p className="text-seraya-text-secondary mt-1.5 text-sm leading-6">
        Gunakan fokus berikutnya di atas untuk melanjutkan perjalanan proyek.
      </p>
    </section>
  );
}

export function CompassContextList({
  children,
  titleId,
}: {
  children: ReactNode;
  titleId: string;
}) {
  return (
    <section aria-labelledby={titleId} className="min-w-0" data-compass-context>
      <CompassSectionHeader
        eyebrow="Respons dan kehadiran"
        title="Konteks tamu saat ini"
        titleId={titleId}
      />
      <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

export function CompassContextItem({
  href,
  label,
  value,
}: {
  href: Route;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border-seraya-border-subtle bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-lg)] border p-4">
      <dt className="text-seraya-text-muted text-xs font-medium">{label}</dt>
      <dd className="mt-1.5 min-w-0">
        <Link
          className="text-seraya-text-primary hover:text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 max-w-full items-center rounded-[var(--seraya-radius-sm)] text-base font-semibold tracking-[-0.015em] transition-colors focus-visible:outline-3 focus-visible:outline-offset-3"
          href={href}
        >
          {value}
        </Link>
      </dd>
    </div>
  );
}
