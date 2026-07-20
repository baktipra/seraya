import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

export const badgeVariants = {
  neutral: 'border-seraya-border-default bg-seraya-surface text-seraya-text-secondary',
  brand: 'border-seraya-brand-soft bg-seraya-brand-soft text-seraya-action-primary',
  success:
    'border-seraya-status-success-soft bg-seraya-status-success-soft text-seraya-status-success',
  warning:
    'border-seraya-status-warning-soft bg-seraya-status-warning-soft text-seraya-status-warning',
  danger: 'border-seraya-status-error-soft bg-seraya-status-error-soft text-seraya-status-error',
  info: 'border-seraya-status-info-soft bg-seraya-status-info-soft text-seraya-status-info',
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-[var(--seraya-radius-pill)] border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.035em]',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
