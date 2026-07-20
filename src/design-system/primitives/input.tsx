import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, hasError = false, 'aria-invalid': ariaInvalid, ...props },
  ref,
) {
  const invalid = hasError || ariaInvalid === true || ariaInvalid === 'true';

  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'bg-seraya-surface text-seraya-text-primary placeholder:text-seraya-text-muted disabled:bg-seraya-soft disabled:text-seraya-text-muted min-h-11 w-full rounded-[var(--seraya-radius-sm)] border px-3.5 py-2.5 text-base transition-[border-color,box-shadow,background-color] duration-200 outline-none disabled:cursor-not-allowed sm:text-sm',
        invalid
          ? 'border-seraya-status-error focus-visible:border-seraya-status-error focus-visible:ring-3 focus-visible:ring-[color:color-mix(in_srgb,var(--seraya-status-error)_18%,transparent)]'
          : 'border-seraya-border-default hover:border-seraya-border-strong focus-visible:border-seraya-action-primary focus-visible:ring-3 focus-visible:ring-[color:color-mix(in_srgb,var(--seraya-focus-ring)_22%,transparent)]',
        className,
      )}
      {...props}
    />
  );
});
