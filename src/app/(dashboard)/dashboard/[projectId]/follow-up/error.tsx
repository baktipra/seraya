'use client';

import { Button } from '@/design-system';

export default function GuestFollowUpError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section aria-labelledby="follow-up-error-title" className="mx-auto max-w-3xl">
      <div className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-7 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Tindak lanjut
        </p>
        <h1 className="seraya-display-md mt-3" id="follow-up-error-title">
          Daftar tindak lanjut belum dapat dimuat
        </h1>
        <p className="text-seraya-text-secondary mt-3 max-w-xl text-base leading-7">
          Data tamu tetap aman. Coba muat ulang workspace untuk mengambil status terbaru.
        </p>
        <Button className="mt-5" onClick={reset} type="button">
          Coba lagi
        </Button>
      </div>
    </section>
  );
}
