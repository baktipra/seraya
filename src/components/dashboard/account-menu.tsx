'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/design-system';

export interface AccountMenuProps {
  displayName?: string | null;
  email: string | null | undefined;
}

export function AccountMenu({ displayName, email }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = displayName?.trim() || email || 'Akun Seraya';

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="text-seraya-text-primary hover:bg-seraya-surface-subtle focus-visible:outline-seraya-focus-ring inline-flex min-h-10 max-w-[14rem] items-center gap-2 rounded-[var(--seraya-radius-sm)] px-1.5 text-left text-sm font-medium transition-colors duration-[var(--seraya-motion-default)] focus-visible:outline-3 focus-visible:outline-offset-2 sm:px-2"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="bg-seraya-brand-soft text-seraya-action-primary inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden truncate md:block">{label}</span>
        <svg
          aria-hidden="true"
          className={`text-seraya-text-muted hidden size-4 shrink-0 transition-transform duration-[var(--seraya-motion-default)] md:block ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          aria-label="Menu akun"
          className="border-seraya-border-subtle bg-seraya-surface-raised absolute right-0 z-[110] mt-2 w-64 rounded-[var(--seraya-radius-lg)] border p-2 shadow-[var(--seraya-shadow-level-2)]"
          role="menu"
        >
          <div className="border-seraya-border-subtle border-b px-3 py-3">
            {displayName ? (
              <p className="text-seraya-text-primary text-sm font-semibold">{displayName}</p>
            ) : null}
            <p className="text-seraya-text-secondary mt-1 truncate text-sm">
              {email ?? 'Email tidak tersedia'}
            </p>
          </div>
          <form action="/auth/signout" className="pt-2" method="post">
            <Button className="justify-start" fullWidth type="submit" variant="ghost">
              Keluar
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
