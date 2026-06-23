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
  const menuId = useId();
  const label = displayName?.trim() || email || 'Akun Seraya';

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:bg-seraya-soft focus-visible:outline-seraya-focus-ring inline-flex min-h-11 max-w-[13rem] items-center gap-2 rounded-[var(--seraya-radius-md)] border px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="bg-seraya-brand-soft text-seraya-action-primary inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate">{label}</span>
        <svg
          aria-hidden="true"
          className="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          aria-label="Menu akun"
          className="border-seraya-border-default bg-seraya-surface absolute right-0 z-40 mt-2 w-64 rounded-[var(--seraya-radius-lg)] border p-2 shadow-[var(--seraya-shadow-float)]"
          role="menu"
        >
          <div className="border-seraya-border-default border-b px-3 py-3">
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
