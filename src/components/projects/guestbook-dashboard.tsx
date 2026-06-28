'use client';

import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';
import type { OwnerGuestbookEntry } from '@/modules/guestbook/guestbook.types';

type GuestbookInboxPanelProps = {
  entries: OwnerGuestbookEntry[];
  timezone: string;
};

type GuestbookDashboardProps = GuestbookInboxPanelProps & {
  projectId: string;
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

function GuestbookEntryCard({ entry, timezone }: { entry: OwnerGuestbookEntry; timezone: string }) {
  return (
    <li>
      <Card className="overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-seraya-text-primary text-base font-semibold">
              {entry.guestDisplayName}
            </p>
            <div className="text-seraya-text-muted mt-1 flex flex-wrap gap-x-2 text-sm leading-6">
              {entry.groupLabel ? <span>{entry.groupLabel}</span> : null}
              <span>Dikirim {formatGuestbookTimestamp(entry.createdAt, timezone)}</span>
            </div>
          </div>
          <p className="text-seraya-text-secondary mt-5 text-sm leading-7 break-words whitespace-pre-wrap">
            {entry.message}
          </p>
        </CardContent>
      </Card>
    </li>
  );
}

/** Read-only owner inbox rendered inside Respons Tamu. Ucapan moderation is intentionally absent. */
export function GuestbookInboxPanel({ entries, timezone }: GuestbookInboxPanelProps) {
  return (
    <section aria-labelledby="guestbook-inbox-title">
      <CardHeader className="px-0 pt-0">
        <CardTitle
          className="font-sans text-lg font-semibold tracking-[-0.02em]"
          id="guestbook-inbox-title"
        >
          Ucapan dari tamu
        </CardTitle>
        <CardDescription>Ucapan terbaru ditampilkan paling atas.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-5 sm:px-0 sm:pt-6">
        {entries.length === 0 ? (
          <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
            <p className="text-seraya-text-primary font-semibold">Belum ada ucapan dari tamu.</p>
            <p className="text-seraya-text-muted mt-2 text-sm leading-6">
              Ucapan akan muncul di sini setelah tamu mengirimkannya melalui Undangan Pribadi.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <GuestbookEntryCard entry={entry} key={entry.id} timezone={timezone} />
            ))}
          </ul>
        )}
      </CardContent>
    </section>
  );
}

/** Legacy component kept only for direct internal reuse; the route itself redirects into Respons Tamu. */
export function GuestbookDashboard({ entries, projectId, timezone }: GuestbookDashboardProps) {
  return (
    <section
      aria-labelledby="guestbook-dashboard-title"
      className="mx-auto max-w-4xl space-y-5 sm:space-y-7"
    >
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={`/dashboard/${projectId}/rsvp?tab=ucapan`}
        >
          Buka Respons Tamu
        </Link>
        <h1 className="seraya-display-md mt-5" id="guestbook-dashboard-title">
          Ucapan dari tamu
        </h1>
      </header>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <GuestbookInboxPanel entries={entries} timezone={timezone} />
        </CardContent>
      </Card>
    </section>
  );
}
