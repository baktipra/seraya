import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

export const badgeVariants = {
  neutral: 'bg-seraya-soft text-seraya-text-secondary',
  brand: 'bg-seraya-brand-soft text-seraya-action-primary',
  success: 'bg-seraya-status-success-soft text-seraya-status-success',
  warning: 'bg-seraya-status-warning-soft text-seraya-status-warning',
  danger: 'bg-seraya-status-error-soft text-seraya-status-error',
  info: 'bg-seraya-status-info-soft text-seraya-status-info',
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-[0.02em]',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
