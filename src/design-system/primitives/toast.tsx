'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/cn';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastInput {
  description?: string;
  duration?: number;
  title: string;
  variant?: ToastVariant;
}

interface ToastRecord extends Required<Pick<ToastInput, 'title'>> {
  description?: string;
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  dismiss: (id: string) => void;
  toast: (input: ToastInput) => string;
}

const toastVariantClasses: Record<ToastVariant, string> = {
  success: 'border-seraya-status-success/25 bg-seraya-status-success-soft',
  info: 'border-seraya-status-info/25 bg-seraya-status-info-soft',
  warning: 'border-seraya-status-warning/25 bg-seraya-status-warning-soft',
  error: 'border-seraya-status-error/25 bg-seraya-status-error-soft',
};

const toastTitleClasses: Record<ToastVariant, string> = {
  success: 'text-seraya-status-success',
  info: 'text-seraya-status-info',
  warning: 'text-seraya-status-warning',
  error: 'text-seraya-status-error',
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ description, duration = 5000, title, variant = 'info' }: ToastInput) => {
      const id = crypto.randomUUID();
      const record: ToastRecord = { description, id, title, variant };

      setToasts((currentToasts) => [...currentToasts, record].slice(-4));

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    },
    [],
  );

  const value = useMemo(() => ({ dismiss, toast }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(100%-2rem,24rem)] flex-col gap-3"
        data-toast-viewport
      >
        {toasts.map((item) => (
          <div
            aria-atomic="true"
            key={item.id}
            className={cn(
              'pointer-events-auto rounded-[var(--seraya-radius-lg)] border p-4 shadow-[var(--seraya-shadow-float)]',
              toastVariantClasses[item.variant],
            )}
            role={item.variant === 'error' ? 'alert' : 'status'}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold', toastTitleClasses[item.variant])}>
                  {item.title}
                </p>
                {item.description ? (
                  <p className="text-seraya-text-secondary mt-1 text-sm leading-5">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                aria-label="Tutup notifikasi"
                className="text-seraya-text-secondary hover:bg-seraya-surface/70 hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-full text-lg transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                onClick={() => dismiss(item.id)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast harus digunakan di dalam ToastProvider.');
  }

  return context;
}
