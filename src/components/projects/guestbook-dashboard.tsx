'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';
import { removeGuestbookEntryAction } from '@/modules/guestbook/guestbook.actions';
import { initialGuestbookActionState } from '@/modules/guestbook/guestbook.action-state';
import type { OwnerGuestbookEntry } from '@/modules/guestbook/guestbook.types';

type GuestbookDashboardProps = {
  entries: OwnerGuestbookEntry[];
  projectId: string;
  timezone: string;
};

function formatGuestbookTimestamp(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return 'Waktu kirim tidak tersedia';
  }
}

function GuestbookRemovalControl({ entryId, projectId }: { entryId: string; projectId: string }) {
  const [state, formAction, isPending] = useActionState(
    removeGuestbookEntryAction,
    initialGuestbookActionState,
  );

  return (
    <form action={formAction} className="shrink-0">
      <input name="entryId" type="hidden" value={entryId} />
      <input name="projectId" type="hidden" value={projectId} />
      <button
        className="text-seraya-status-error focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-sm)] px-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Menghapus…' : 'Hapus ucapan'}
      </button>
      {state.status === 'error' && state.message ? (
        <p
          aria-live="assertive"
          className="text-seraya-status-error mt-2 max-w-48 text-xs leading-5"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function GuestbookEntryCard({
  entry,
  projectId,
  timezone,
}: {
  entry: OwnerGuestbookEntry;
  projectId: string;
  timezone: string;
}) {
  return (
    <li>
      <Card className="overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-seraya-text-primary text-base font-semibold">
                {entry.guestDisplayName}
              </p>
              <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                Diperbarui {formatGuestbookTimestamp(entry.updatedAt, timezone)}
              </p>
            </div>
            <GuestbookRemovalControl entryId={entry.id} projectId={projectId} />
          </div>
          <p className="text-seraya-text-secondary mt-5 text-sm leading-7 break-words whitespace-pre-wrap">
            {entry.message}
          </p>
        </CardContent>
      </Card>
    </li>
  );
}

/** Owner-only private guestbook inbox. It has no guest mutation except soft removal. */
export function GuestbookDashboard({ entries, projectId, timezone }: GuestbookDashboardProps) {
  return (
    <section
      aria-labelledby="guestbook-dashboard-title"
      className="mx-auto max-w-4xl space-y-5 sm:space-y-7"
    >
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={`/dashboard/${projectId}`}
        >
          ← Kembali ke project
        </Link>
        <nav aria-label="Respons Tamu" className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring rounded-[var(--seraya-radius-sm)] underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/dashboard/${projectId}/rsvp`}
          >
            RSVP
          </Link>
          <span className="text-seraya-text-primary">Ucapan &amp; Doa</span>
        </nav>
        <h1 className="seraya-display-md mt-5" id="guestbook-dashboard-title">
          Ucapan &amp; Doa
        </h1>
        <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
          Lihat ucapan dan doa yang dikirim tamu melalui tautan pribadi mereka.
        </p>
      </header>

      <Card aria-labelledby="guestbook-inbox-title">
        <CardHeader>
          <CardTitle
            className="font-sans text-lg font-semibold tracking-[-0.02em]"
            id="guestbook-inbox-title"
          >
            Pesan dari tamu
          </CardTitle>
          <CardDescription>Pesan terbaru ditampilkan paling atas.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5 sm:pt-6">
          {entries.length === 0 ? (
            <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
              <p className="text-seraya-text-primary font-semibold">Belum ada ucapan yang masuk.</p>
              <p className="text-seraya-text-muted mt-2 text-sm leading-6">
                Bagikan tautan pribadi tamu untuk mulai menerima ucapan dan doa.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {entries.map((entry) => (
                <GuestbookEntryCard
                  entry={entry}
                  key={entry.id}
                  projectId={projectId}
                  timezone={timezone}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
