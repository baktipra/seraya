import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export const buttonVariants = {
  primary:
    'bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover active:bg-seraya-action-primary-pressed focus-visible:outline-seraya-focus-ring',
  secondary:
    'border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-surface-subtle active:bg-seraya-soft focus-visible:outline-seraya-focus-ring',
  ghost:
    'bg-transparent text-seraya-text-primary hover:bg-seraya-surface-subtle active:bg-seraya-soft focus-visible:outline-seraya-focus-ring',
  text: 'bg-transparent px-0 text-seraya-action-primary hover:text-seraya-action-primary-hover active:text-seraya-action-primary-pressed focus-visible:outline-seraya-focus-ring',
  danger:
    'bg-seraya-status-error text-seraya-text-inverse hover:bg-seraya-status-error/90 active:bg-seraya-status-error/80 focus-visible:outline-seraya-focus-ring',
} as const;

export const buttonSizes = {
  sm: 'min-h-[var(--seraya-touch-target)] gap-2 px-3 text-sm',
  md: 'min-h-[var(--seraya-control-height)] gap-2 px-4 text-sm',
  lg: 'min-h-[var(--seraya-control-height-large)] gap-2.5 px-5 text-base',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    fullWidth = false,
    loading = false,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--seraya-radius-md)] font-medium tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--seraya-motion-default)] ease-[var(--seraya-ease-standard)] focus-visible:outline-3 focus-visible:outline-offset-2 active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-45',
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      ) : null}
      <span>{children}</span>
    </button>
  );
});
