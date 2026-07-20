import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type CardTone = 'default' | 'soft' | 'brand-soft';

const cardToneClasses: Record<CardTone, string> = {
  default: 'border-seraya-border-default bg-seraya-surface shadow-[var(--seraya-shadow-soft)]',
  soft: 'border-seraya-border-default bg-seraya-soft',
  'brand-soft': 'border-transparent bg-seraya-brand-soft',
};

export interface CardProps extends ComponentPropsWithoutRef<'section'> {
  tone?: CardTone;
}

export function Card({ className, tone = 'default', ...props }: CardProps) {
  return (
    <section
      className={cn(
        'text-seraya-text-primary rounded-[var(--seraya-radius-md)] border',
        cardToneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('flex flex-col gap-1.5 px-5 pt-5 sm:px-6 sm:pt-6', className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2
      className={cn(
        'text-seraya-text-primary font-serif text-[1.375rem] leading-[1.08] font-medium tracking-[-0.015em]',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('text-seraya-text-secondary text-sm leading-6', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('px-5 py-5 sm:px-6 sm:py-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'border-seraya-border-default flex flex-wrap items-center gap-3 border-t px-5 py-4 sm:px-6',
        className,
      )}
      {...props}
    />
  );
}

export interface CardStatProps {
  label: string;
  value: ReactNode;
  detail?: string;
}

/** A small, reusable stat presentation for product summary cards. */
export function CardStat({ detail, label, value }: CardStatProps) {
  return (
    <div>
      <p className="seraya-eyebrow">{label}</p>
      <p className="text-seraya-text-primary mt-2 font-serif text-[1.75rem] leading-none font-medium tracking-[-0.02em]">
        {value}
      </p>
      {detail ? <p className="text-seraya-text-secondary mt-1.5 text-sm">{detail}</p> : null}
    </div>
  );
}
