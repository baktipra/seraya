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
        'bg-seraya-surface text-seraya-text-primary placeholder:text-seraya-text-muted disabled:bg-seraya-surface-subtle disabled:text-seraya-text-disabled min-h-[var(--seraya-control-height)] w-full rounded-[var(--seraya-radius-md)] border px-3.5 py-2.5 text-base transition-[border-color,box-shadow,background-color,color] duration-[var(--seraya-motion-default)] ease-[var(--seraya-ease-standard)] outline-none disabled:cursor-not-allowed sm:text-sm',
        invalid
          ? 'border-seraya-status-error focus-visible:border-seraya-status-error focus-visible:ring-3 focus-visible:ring-[color:color-mix(in_srgb,var(--seraya-status-error)_18%,transparent)]'
          : 'border-seraya-border-default hover:border-seraya-border-strong focus-visible:border-seraya-action-primary focus-visible:ring-3 focus-visible:ring-[color:color-mix(in_srgb,var(--seraya-focus-ring)_18%,transparent)]',
        className,
      )}
      {...props}
    />
  );
});
