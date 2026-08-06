import type { ReactNode } from 'react';

export interface InvitationStudioModePlaceholderProps {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

/** Temporary Slice A canvas while existing behavior remains in the mounted Isi slot. */
export function InvitationStudioModePlaceholder({
  action,
  description,
  eyebrow,
  title,
}: InvitationStudioModePlaceholderProps) {
  return (
    <div
      className="border-seraya-border-default bg-seraya-surface grid min-h-[24rem] min-w-0 place-items-center rounded-[var(--seraya-radius-lg)] border px-5 py-12 text-center shadow-[var(--seraya-shadow-soft)] sm:px-8"
      data-invitation-studio-mode-placeholder
    >
      <div className="max-w-xl">
        <p className="text-seraya-action-primary text-[0.68rem] font-bold tracking-[0.1em] uppercase">
          {eyebrow}
        </p>
        <h2 className="text-seraya-text-primary mt-4 font-serif text-[clamp(2.25rem,5vw,3.75rem)] leading-[0.92] font-medium tracking-[-0.05em]">
          {title}
        </h2>
        <p className="text-seraya-text-secondary mx-auto mt-5 max-w-lg text-sm leading-7 sm:text-base">
          {description}
        </p>
        {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
