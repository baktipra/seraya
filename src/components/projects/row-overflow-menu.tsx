'use client';

import { createPortal } from 'react-dom';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { focusFirstDescendant, getFocusableElements } from '@/lib/focus-management';

export type OverflowMenuPosition = { left: number; top: number; placement: 'bottom' | 'top' };

export function getOverflowMenuPosition(
  trigger: Pick<DOMRect, 'bottom' | 'left' | 'right' | 'top'>,
  viewport: { height: number; width: number },
  menu: { height: number; width: number },
): OverflowMenuPosition {
  const gap = 8;
  const viewportPadding = 12;
  const opensUp =
    viewport.height - trigger.bottom < menu.height + gap && trigger.top > menu.height + gap;
  const unclampedLeft = trigger.right - menu.width;
  return {
    left: Math.max(
      viewportPadding,
      Math.min(unclampedLeft, viewport.width - menu.width - viewportPadding),
    ),
    placement: opensUp ? 'top' : 'bottom',
    top: opensUp
      ? Math.max(viewportPadding, trigger.top - menu.height - gap)
      : trigger.bottom + gap,
  };
}

export function RowOverflowMenu({
  ariaLabel,
  children,
  onOpenChange,
  open,
}: {
  ariaLabel: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<OverflowMenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return undefined;

    const measure = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const menuWidth = menuRef.current?.offsetWidth ?? 208;
      const menuHeight = menuRef.current?.offsetHeight ?? 160;
      setPosition(
        getOverflowMenuPosition(
          trigger,
          { height: window.innerHeight, width: window.innerWidth },
          { height: menuHeight, width: menuWidth },
        ),
      );
    };

    measure();
    const focusFrame = window.requestAnimationFrame(() => {
      if (menuRef.current) focusFirstDescendant(menuRef.current);
    });
    window.addEventListener('resize', measure);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('resize', measure);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        onOpenChange(false);
      }
    };
    const closeOnScroll = () => onOpenChange(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onOpenChange(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScroll, true);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [onOpenChange, open]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const menu = menuRef.current;
    if (!menu) return;

    if (event.key === 'Tab') {
      onOpenChange(false);
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    const items = getFocusableElements(menu).filter(
      (element) => element.getAttribute('role') === 'menuitem',
    );
    if (items.length === 0) return;

    event.preventDefault();
    event.stopPropagation();

    const activeIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex = 0;

    if (event.key === 'End') {
      nextIndex = items.length - 1;
    } else if (event.key === 'ArrowUp') {
      nextIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
    } else if (event.key === 'ArrowDown') {
      nextIndex = activeIndex < 0 || activeIndex === items.length - 1 ? 0 : activeIndex + 1;
    }

    items[nextIndex]?.focus({ preventScroll: true });
  }

  return (
    <>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="focus-visible:outline-seraya-focus-ring hover:bg-seraya-soft inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--seraya-radius-sm)] border border-transparent text-lg leading-none focus-visible:outline-3 focus-visible:outline-offset-2"
        onClick={() => onOpenChange(!open)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              aria-label={ariaLabel}
              aria-orientation="vertical"
              className="border-seraya-border-default bg-seraya-surface z-[100] min-w-52 rounded-[var(--seraya-radius-md)] border p-1 shadow-lg"
              id={menuId}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={handleMenuKeyDown}
              ref={menuRef}
              role="menu"
              style={{
                left: position?.left ?? 12,
                position: 'fixed',
                top: position?.top ?? 12,
              }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function OverflowMenuAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="focus-visible:outline-seraya-focus-ring hover:bg-seraya-soft block min-h-11 w-full rounded-[var(--seraya-radius-sm)] px-3 py-2 text-left text-sm font-medium focus-visible:outline-3 focus-visible:outline-offset-[-2px]"
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      {children}
    </button>
  );
}
